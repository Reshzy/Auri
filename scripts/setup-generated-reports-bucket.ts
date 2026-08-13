import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const BUCKET = process.env.AURI_GENERATED_BUCKET || "generated-reports";
const FILE_SIZE_LIMIT = 32 * 1024 * 1024;
const ALLOWED_MIME = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/octet-stream",
];

function requireStorageEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. These are server/setup credentials only and are not user authorization.",
    );
  }
  return { url, key };
}

export async function setupGeneratedReportsBucket(
  mode: "setup" | "check",
): Promise<void> {
  let env: { url: string; key: string };
  try {
    env = requireStorageEnv();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Storage credentials missing.";
    if (mode === "check") {
      console.log(`SKIP: generated-reports Storage check — ${message}`);
      process.exitCode = 0;
      return;
    }
    console.error(`BLOCKED: ${message}`);
    process.exitCode = 1;
    return;
  }

  const client = createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: getError } = await client.storage.getBucket(BUCKET);
  if (getError && !/not found|does not exist/i.test(getError.message)) {
    throw new Error("Could not inspect generated-reports bucket.");
  }

  if (!existing) {
    if (mode === "check") {
      console.log(`FAIL: bucket ${BUCKET} does not exist.`);
      process.exitCode = 1;
      return;
    }
    const { error: createError } = await client.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: FILE_SIZE_LIMIT,
      allowedMimeTypes: ALLOWED_MIME,
    });
    if (createError) {
      throw new Error("Could not create generated-reports bucket.");
    }
    console.log(`Created private bucket ${BUCKET}.`);
  } else {
    if (existing.public) {
      throw new Error(
        `Refusing to continue: bucket ${BUCKET} is public. Generated reports must remain private.`,
      );
    }
    const { error: updateError } = await client.storage.updateBucket(BUCKET, {
      public: false,
      fileSizeLimit: FILE_SIZE_LIMIT,
      allowedMimeTypes: ALLOWED_MIME,
    });
    if (updateError) {
      throw new Error("Could not reconcile generated-reports bucket configuration.");
    }
    console.log(`Reconciled private bucket ${BUCKET}.`);
  }

  const { data: verified, error: verifyError } = await client.storage.getBucket(BUCKET);
  if (verifyError || !verified) {
    throw new Error("Could not verify generated-reports bucket.");
  }
  if (verified.public) {
    throw new Error("generated-reports bucket must not be public.");
  }
  console.log(`OK: ${BUCKET} is private. Service-role access is not user authorization.`);
}

async function main() {
  const mode = process.argv.includes("--check") ? "check" : "setup";
  try {
    await setupGeneratedReportsBucket(mode);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storage setup failed.";
    console.error(message);
    process.exitCode = 1;
  }
}

if (
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
  process.argv[1]?.includes("setup-generated-reports-bucket")
) {
  void main();
}
