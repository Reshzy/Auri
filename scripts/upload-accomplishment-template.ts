import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import {
  ACCOMPLISHMENT_RUNTIME_FILE,
  ACCOMPLISHMENT_TEMPLATE_ID,
  ACCOMPLISHMENT_TEMPLATE_KEY,
} from "../src/lib/templates/accomplishment-tokens";

config({ path: ".env.local" });
config();

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, "..");

type ManifestShape = {
  version: number;
  runtimeSha256: string;
  runtimeFile: string;
  requiredTokens?: string[];
  maxRows?: number;
  pageSize?: string;
  orientation?: string;
};

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function activateTemplateVersions(input: {
  storagePath: string;
  runtimeHash: string;
  version: number;
  manifest: ManifestShape;
}): Promise<void> {
  // Scripts are Node-only; stub server-only before importing the DB module.
  const Module = require("module") as {
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
  };
  const originalLoad = Module._load.bind(Module);
  Module._load = (request: string, parent: unknown, isMain: boolean) => {
    if (request === "server-only") return {};
    return originalLoad(request, parent, isMain);
  };

  const { getDb } = await import("../src/db");
  const { templateVersions } = await import("../src/db/schema");
  const db = getDb();

  const existingRows = await db
    .select()
    .from(templateVersions)
    .where(
      and(
        eq(templateVersions.templateKey, ACCOMPLISHMENT_TEMPLATE_KEY),
        eq(templateVersions.version, input.version),
      ),
    )
    .limit(1);

  const row = existingRows[0];
  if (row && row.sha256 !== input.runtimeHash) {
    throw new Error(
      `Refusing to activate version ${input.version}: DB sha256 ${row.sha256} != ${input.runtimeHash}`,
    );
  }

  const manifestJson = {
    id: ACCOMPLISHMENT_TEMPLATE_ID,
    requiredTokens: input.manifest.requiredTokens ?? [],
    maxRows: input.manifest.maxRows ?? 16,
    pageSize: input.manifest.pageSize,
    orientation: input.manifest.orientation,
  };

  await db.transaction(async (tx) => {
    await tx
      .update(templateVersions)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(templateVersions.templateKey, ACCOMPLISHMENT_TEMPLATE_KEY));

    if (row) {
      await tx
        .update(templateVersions)
        .set({
          storagePath: input.storagePath,
          sha256: input.runtimeHash,
          fileType: "docx",
          isActive: true,
          manifest: manifestJson,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(templateVersions.id, row.id));
    } else {
      await tx.insert(templateVersions).values({
        templateKey: ACCOMPLISHMENT_TEMPLATE_KEY,
        version: input.version,
        fileType: "docx",
        storagePath: input.storagePath,
        sha256: input.runtimeHash,
        isActive: true,
        manifest: manifestJson,
      });
    }
  });
}

async function main() {
  const runtimePath = path.join(
    ROOT,
    "templates",
    "runtime",
    ACCOMPLISHMENT_RUNTIME_FILE,
  );
  const manifestPath = path.join(
    ROOT,
    "templates",
    "manifests",
    `${ACCOMPLISHMENT_TEMPLATE_ID}.json`,
  );

  if (!existsSync(runtimePath) || !existsSync(manifestPath)) {
    throw new Error("Runtime template/manifest missing. Run pnpm docx:prepare first.");
  }

  const runtimeBuf = readFileSync(runtimePath);
  const runtimeHash = sha256(runtimeBuf);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestShape;

  if (manifest.runtimeSha256 !== runtimeHash) {
    throw new Error(
      "Local runtime hash does not match manifest. Re-run pnpm docx:prepare.",
    );
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const version = manifest.version;

  if (!url || !serviceKey) {
    console.log(
      "templates:upload:docx — Storage env missing; attempting local DB activation only.",
    );
    if (!process.env.DATABASE_URL) {
      console.log(
        "SKIPPED — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for Storage, or DATABASE_URL for local template_versions activation.",
      );
      return;
    }
    const storagePath = `local/${ACCOMPLISHMENT_TEMPLATE_KEY}/v${version}/${ACCOMPLISHMENT_RUNTIME_FILE}`;
    await activateTemplateVersions({
      storagePath,
      runtimeHash,
      version,
      manifest,
    });
    console.log("templates:upload:docx OK (local DB activation; Storage upload skipped)");
    console.log(`storagePath=${storagePath}`);
    console.log(`sha256=${runtimeHash}`);
    process.exit(0);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to reconcile template_versions.");
  }

  const bucket = process.env.AURI_TEMPLATE_BUCKET || "templates";
  const storagePath = `${ACCOMPLISHMENT_TEMPLATE_KEY}/v${version}/${ACCOMPLISHMENT_RUNTIME_FILE}`;

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingObj } = await client.storage.from(bucket).download(storagePath);
  if (existingObj) {
    const existingBuf = Buffer.from(await existingObj.arrayBuffer());
    const existingHash = sha256(existingBuf);
    if (existingHash !== runtimeHash) {
      throw new Error(
        `Refusing to overwrite ${storagePath}: remote hash ${existingHash} != local ${runtimeHash}`,
      );
    }
    console.log(`Storage object already present with matching hash: ${storagePath}`);
  } else {
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(storagePath, runtimeBuf, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });
    if (uploadError) {
      const { data: raced } = await client.storage.from(bucket).download(storagePath);
      if (!raced) throw new Error(`Upload failed: ${uploadError.message}`);
      const racedHash = sha256(Buffer.from(await raced.arrayBuffer()));
      if (racedHash !== runtimeHash) {
        throw new Error("Upload race produced a different hash; refusing activation.");
      }
    } else {
      console.log(`Uploaded ${storagePath}`);
    }
  }

  const { data: verified, error: verifyError } = await client.storage
    .from(bucket)
    .download(storagePath);
  if (verifyError || !verified) {
    throw new Error("Could not verify uploaded template object.");
  }
  const verifiedHash = sha256(Buffer.from(await verified.arrayBuffer()));
  if (verifiedHash !== runtimeHash) {
    throw new Error("Uploaded object hash mismatch after verification download.");
  }

  await activateTemplateVersions({
    storagePath,
    runtimeHash,
    version,
    manifest,
  });

  console.log("templates:upload:docx OK");
  console.log(`storagePath=${storagePath}`);
  console.log(`sha256=${runtimeHash}`);
  console.log("template_versions: active accomplishment v1 reconciled");
  process.exit(0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`templates:upload:docx FAILED: ${message}`);
  process.exit(1);
});
