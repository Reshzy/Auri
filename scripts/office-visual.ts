import { existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "..");

function which(command: string): boolean {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [command], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function main(): void {
  const runtimeDocx = path.join(ROOT, "templates/runtime/accomplishment-report-v1.docx");
  const runtimeXlsx = path.join(ROOT, "templates/runtime/dtr-csc-form-48-v1.xlsx");
  if (!existsSync(runtimeDocx) || !existsSync(runtimeXlsx)) {
    throw new Error(
      "Runtime templates are missing. Run pnpm docx:prepare and pnpm xlsx:prepare.",
    );
  }

  const hasLibreOffice = which("soffice") || which("soffice.exe");
  const hasWord = which("WINWORD") || which("WINWORD.EXE");
  const hasExcel = which("EXCEL") || which("EXCEL.EXE");

  if (!hasLibreOffice && !hasWord && !hasExcel) {
    console.log(
      "PENDING MANUAL VERIFICATION: LibreOffice and Microsoft Office are not installed. Structural ZIP audits are not a visual pass.",
    );
    return;
  }

  if (hasLibreOffice && !hasWord) {
    console.log(
      "PENDING MANUAL VERIFICATION: LibreOffice is available but Microsoft Word/Excel confirmation is still required.",
    );
    return;
  }

  console.log(
    "Office binaries were detected. Open the generated fixture files locally and confirm one legal landscape page, no repair warnings, and visible certification/signatories. This script does not claim a visual pass.",
  );
}

main();
