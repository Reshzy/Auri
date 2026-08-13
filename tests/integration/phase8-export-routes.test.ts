import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireAuthenticatedUser, generateMock, downloadMock, deleteMock } = vi.hoisted(
  () => ({
    requireAuthenticatedUser: vi.fn(),
    generateMock: vi.fn(),
    downloadMock: vi.fn(),
    deleteMock: vi.fn(),
  }),
);

vi.mock("@/db/dal/auth-user", () => ({
  requireAuthenticatedUser: (...args: unknown[]) => requireAuthenticatedUser(...args),
}));

vi.mock("@/db/dal/ownership", () => ({
  assertOwnerMatchesSession: () => undefined,
}));

vi.mock("@/server/services/export-orchestration-service", () => ({
  ExportOrchestrationService: {
    generate: (...args: unknown[]) => generateMock(...args),
  },
}));

vi.mock("@/server/services/export-history-service", () => ({
  ExportHistoryService: {
    listForReport: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/server/services/export-download-service", () => ({
  ExportDownloadService: {
    loadOwnedFile: (...args: unknown[]) => downloadMock(...args),
  },
}));

vi.mock("@/server/services/export-deletion-service", () => ({
  ExportDeletionService: {
    deleteOwned: (...args: unknown[]) => deleteMock(...args),
  },
}));

import { POST } from "@/app/api/reports/[reportId]/exports/route";
import { GET as GET_DOWNLOAD } from "@/app/api/exports/[exportId]/download/route";
import { DELETE } from "@/app/api/exports/[exportId]/route";

function jsonResult(
  format: "docx" | "xlsx" | "zip",
  status: "created" | "reused" = "created",
) {
  return {
    overallStatus: "complete" as const,
    reportId: "r1",
    results: [
      {
        format,
        status,
        export: {
          id: "e1",
          fileName: `file.${format}`,
          fileSizeBytes: 12,
          sha256: "ab".repeat(32),
          isCurrent: true,
          createdAt: "2026-08-01T00:00:00.000Z",
          downloadUrl: "/api/exports/e1/download",
        },
      },
    ],
  };
}

describe("Phase 8 export endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateMock.mockResolvedValue(jsonResult("docx"));
  });

  it("rejects missing Clerk session", async () => {
    requireAuthenticatedUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        body: JSON.stringify({ formats: ["docx"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("rejects browser-supplied owner fields", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    const res = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formats: ["docx"],
          acknowledgedWarnings: [],
          ownerId: "attacker",
        }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("OWNERSHIP_REJECTED");
  });

  it("rejects empty, duplicate, unknown, and zip-without-members formats", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    const cases = [
      { formats: [] },
      { formats: ["docx", "docx"] },
      { formats: ["pdf"] },
      { formats: ["zip"] },
    ];
    for (const body of cases) {
      const res = await POST(
        new Request("http://localhost/api/reports/r1/exports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, acknowledgedWarnings: [] }),
        }),
        { params: Promise.resolve({ reportId: "r1" }) },
      );
      expect(res.status).toBe(400);
    }
  });

  it("accepts DOCX-only, XLSX-only, combined, and ZIP-with-members requests", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    for (const formats of [
      ["docx"],
      ["xlsx"],
      ["docx", "xlsx"],
      ["docx", "xlsx", "zip"],
    ]) {
      generateMock.mockResolvedValueOnce({
        overallStatus: "complete",
        reportId: "r1",
        results: formats.map((format) => jsonResult(format as "docx").results[0]),
      });
      const res = await POST(
        new Request("http://localhost/api/reports/r1/exports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formats, acknowledgedWarnings: [] }),
        }),
        { params: Promise.resolve({ reportId: "r1" }) },
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      const json = await res.json();
      expect(json.overallStatus).toBe("complete");
      expect(json.results).toHaveLength(formats.length);
    }
  });

  it("returns partial success without calling it complete", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    generateMock.mockResolvedValue({
      overallStatus: "partial",
      reportId: "r1",
      results: [
        jsonResult("docx").results[0],
        { format: "xlsx", status: "failed", error: { code: "XLSX_GENERATION_FAILED" } },
      ],
    });
    const res = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formats: ["docx", "xlsx"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    const json = await res.json();
    expect(json.overallStatus).toBe("partial");
    expect(json.overallStatus).not.toBe("complete");
  });

  it("streams protected downloads with MIME, disposition, and no-store", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    downloadMock.mockResolvedValue({
      row: { id: "e1" },
      bytes: Buffer.from("PK"),
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName: "Auri_Owner_2026-08-01_to_2026-08-15_Accomplishment.docx",
    });
    const res = await GET_DOWNLOAD(
      new Request("http://localhost/api/exports/e1/download"),
      {
        params: Promise.resolve({ exportId: "e1" }),
      },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("wordprocessingml.document");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects cross-user download and delete", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    const { ExportError } = await import("@/lib/exports/errors");
    downloadMock.mockRejectedValue(new ExportError("EXPORT_NOT_FOUND", "missing"));
    deleteMock.mockRejectedValue(new ExportError("EXPORT_NOT_FOUND", "missing"));
    const down = await GET_DOWNLOAD(
      new Request("http://localhost/api/exports/e2/download"),
      {
        params: Promise.resolve({ exportId: "e2" }),
      },
    );
    expect(down.status).toBe(404);
    const del = await DELETE(new Request("http://localhost/api/exports/e2"), {
      params: Promise.resolve({ exportId: "e2" }),
    });
    expect(del.status).toBe(404);
  });

  it("returns 204 on successful delete", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    deleteMock.mockResolvedValue(undefined);
    const res = await DELETE(new Request("http://localhost/api/exports/e1"), {
      params: Promise.resolve({ exportId: "e1" }),
    });
    expect(res.status).toBe(204);
  });
});
