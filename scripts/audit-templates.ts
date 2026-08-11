/**
 * Structural audit helper for source Office templates.
 * Run with: pnpm templates:audit
 *
 * Phase 0 used an equivalent Python inspector; this TypeScript entry point
 * remains the long-term script surface from the master specification.
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = [
  {
    label: "accomplishment-docx",
    relativePath: path.join("templates", "source", "ACCOMPLISHMENT - RODGE.docx"),
    expectedSha256: "d1381a91daf69d13a8a3d836be722dc4fa05544def667b194dce959361e091c5",
  },
  {
    label: "dtr-xlsx",
    relativePath: path.join("templates", "source", "DTR RODGE.xlsx"),
    expectedSha256: "7cc8fd8fe90f6062864410c4a8920e909350369c99ee7548e24f922ac5f5314b",
  },
] as const;

function sha256File(filePath: string): string {
  const digest = createHash("sha256");
  digest.update(readFileSync(filePath));
  return digest.digest("hex");
}

function main(): void {
  let failed = false;

  for (const file of FILES) {
    const absolutePath = path.join(ROOT, file.relativePath);
    if (!existsSync(absolutePath)) {
      console.error(`MISSING ${file.label}: ${file.relativePath}`);
      failed = true;
      continue;
    }

    const hash = sha256File(absolutePath);
    const ok = hash === file.expectedSha256;
    console.log(`${ok ? "OK" : "HASH MISMATCH"} ${file.label}`);
    console.log(`  path: ${file.relativePath}`);
    console.log(`  sha256: ${hash}`);
    if (!ok) {
      console.log(`  expected: ${file.expectedSha256}`);
      failed = true;
    }
  }

  console.log("");
  console.log("Full structural findings: docs/TEMPLATE_AUDIT.md");

  if (failed) {
    process.exitCode = 1;
  }
}

main();
