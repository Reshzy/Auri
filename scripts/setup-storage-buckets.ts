import { config } from "dotenv";
import { setupGeneratedReportsBucket } from "./setup-generated-reports-bucket";
import { setupTemplatesBucket } from "./setup-templates-bucket";

config({ path: ".env.local" });
config();

async function main() {
  const mode = process.argv.includes("--check") ? "check" : "setup";
  await setupTemplatesBucket(mode);
  await setupGeneratedReportsBucket(mode);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "storage setup failed");
  process.exit(1);
});
