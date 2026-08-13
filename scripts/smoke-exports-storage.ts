import { config } from "dotenv";
import { hasSupabaseStorageConfig } from "../src/lib/env";
import { setupGeneratedReportsBucket } from "./setup-generated-reports-bucket";

config({ path: ".env.local" });
config();

async function main() {
  if (!hasSupabaseStorageConfig()) {
    console.log(
      "SKIP: exports:storage:smoke — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY unavailable. Live generated-reports Storage is pending.",
    );
    return;
  }
  await setupGeneratedReportsBucket("check");
  console.log(
    "OK: generated-reports bucket check passed. Live upload/download isolation is covered by integration tests when credentials are present.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "exports:storage:smoke failed");
  process.exit(1);
});
