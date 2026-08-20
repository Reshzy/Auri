import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExportFileRow } from "./export-file-row";
import type { ExportHistoryItem } from "@/lib/exports/types";

const item: ExportHistoryItem = {
  id: "exp-1",
  reportId: "rep-1",
  format: "docx",
  fileName: "ACCOMPLISHMENT-RODGE.docx",
  fileSizeBytes: 12000,
  fileSizeLabel: "12 KB",
  createdAt: "2026-08-20T04:00:00.000Z",
  createdAtLabel: "Aug 20, 2026, 12:00 PM",
  presentationStatus: "current",
  downloadable: true,
  downloadUrl: "/api/exports/exp-1/download",
  templates: [{ key: "accomplishment", version: 3 }],
};

describe("ExportFileRow", () => {
  it("shows trust metadata and an explicit download control", () => {
    const html = renderToStaticMarkup(<ExportFileRow item={item} variant="plain" />);
    expect(html).toContain("DOCX · ACCOMPLISHMENT-RODGE.docx");
    expect(html).toContain("Aug 20, 2026, 12:00 PM");
    expect(html).toContain("12 KB");
    expect(html).toContain("accomplishment v3");
    expect(html).toContain("Current");
    expect(html).toContain("Download");
    expect(html).toContain("/api/exports/exp-1/download");
    expect(html).toContain("flex-col");
    expect(html).toContain("sm:flex-row");
    expect(html).toContain("min-w-0");
  });

  it("does not nest a bordered panel in the plain variant", () => {
    const html = renderToStaticMarkup(<ExportFileRow item={item} variant="plain" />);
    expect(html).not.toContain("rounded-2xl border");
  });
});
