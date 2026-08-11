import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  requireAuthenticatedUser,
  getOwnReportWithEntries,
  getTemplateAvailability,
  generateAccomplishmentDocx,
  generateDtrXlsx,
  validateReportMock,
} = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  getOwnReportWithEntries: vi.fn(),
  getTemplateAvailability: vi.fn(),
  generateAccomplishmentDocx: vi.fn(),
  generateDtrXlsx: vi.fn(),
  validateReportMock: vi.fn(),
}));

vi.mock("@/db/dal/auth-user", () => ({
  requireAuthenticatedUser: (...args: unknown[]) => requireAuthenticatedUser(...args),
}));

vi.mock("@/db/dal/reports", () => ({
  getOwnReportWithEntries: (...args: unknown[]) => getOwnReportWithEntries(...args),
}));

vi.mock("@/db/dal/templates", () => ({
  getTemplateAvailability: (...args: unknown[]) => getTemplateAvailability(...args),
}));

vi.mock("@/server/services/docx-export-service", () => ({
  DocxExportService: {
    generateAccomplishmentDocx: (...args: unknown[]) =>
      generateAccomplishmentDocx(...args),
  },
}));

vi.mock("@/server/services/xlsx-export-service", () => ({
  XlsxExportService: {
    generateDtrXlsx: (...args: unknown[]) => generateDtrXlsx(...args),
  },
}));

vi.mock("@/server/services/report-validation", () => ({
  validateReport: (...args: unknown[]) => validateReportMock(...args),
}));

import { POST } from "@/app/api/reports/[reportId]/exports/route";

function readyValidation() {
  return {
    errors: [],
    warnings: [],
    infos: [],
    ready: true,
    incompleteCount: 0,
    invalidCount: 0,
    totalWorkedMinutes: 4800,
  };
}

function makeReport(ownerId: string) {
  return {
    report: {
      id: "r1",
      userId: ownerId,
      startDate: "2026-08-01",
      endDate: "2026-08-15",
      status: "ready",
      createdAt: "2026-08-01T00:00:00.000Z",
      snapshotsRefreshedAt: null,
      profileSnapshot: {
        employeeName: "Owner",
        employeeTitle: "COS",
        organizationName: "Muni",
        officeName: "Office",
        departmentName: "Dept",
        timezone: "Asia/Manila",
        locale: "en-PH",
      },
      scheduleSnapshot: { id: "s1", name: "Compressed", weekdayRules: {} },
      signatorySnapshot: [0, 1, 2, 3].map((slot) => ({
        slot,
        displayName: `S${slot}`,
        title: `T${slot}`,
        isActive: true,
        effectiveFrom: null,
        effectiveTo: null,
      })),
    },
    entries: [],
  };
}

describe("Phase 7 POST /api/reports/[reportId]/exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateReportMock.mockReturnValue(readyValidation());
    getTemplateAvailability.mockResolvedValue({
      items: [
        {
          key: "accomplishment",
          available: true,
          sha256: "a".repeat(64),
          label: "docx",
          fileType: "docx",
          dbActive: true,
          manifestPresent: true,
          sourcePresent: true,
          version: 1,
        },
        {
          key: "dtr",
          available: true,
          sha256: "b".repeat(64),
          label: "xlsx",
          fileType: "xlsx",
          dbActive: true,
          manifestPresent: true,
          sourcePresent: true,
          version: 1,
        },
      ],
      bothAvailable: true,
    });
    generateAccomplishmentDocx.mockResolvedValue({
      buffer: Buffer.from("PK fake-docx"),
      fileName: "Auri_Owner_2026-08-01_to_2026-08-15_Accomplishment.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sha256: "c".repeat(64),
      sourceRevision: "d".repeat(64),
      templateVersionId: null,
      templateSha256: "a".repeat(64),
      fileSizeBytes: 12,
    });
    generateDtrXlsx.mockResolvedValue({
      buffer: Buffer.from("PK fake-xlsx"),
      fileName: "Auri_Owner_2026-08-01_to_2026-08-15_DTR.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sha256: "e".repeat(64),
      sourceRevision: "f".repeat(64),
      templateVersionId: null,
      templateSha256: "b".repeat(64),
      fileSizeBytes: 12,
    });
  });

  it("rejects missing Clerk session", async () => {
    requireAuthenticatedUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
    const res = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        body: JSON.stringify({ formats: ["xlsx"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("rejects browser-supplied ownership ids", async () => {
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
          formats: ["xlsx"],
          acknowledgedWarnings: [],
          ownerId: "attacker",
        }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("OWNERSHIP_REJECTED");
  });

  it("rejects zip and mixed formats", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    const zipRes = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formats: ["zip"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(zipRes.status).toBe(400);
    expect((await zipRes.json()).code).toBe("UNSUPPORTED_FORMAT");

    const mixedRes = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formats: ["docx", "xlsx"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(mixedRes.status).toBe(400);
    expect((await mixedRes.json()).code).toBe("UNSUPPORTED_FORMAT");
  });

  it("rejects cross-user report access", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    getOwnReportWithEntries.mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/reports/foreign/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formats: ["xlsx"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "foreign" }) },
    );
    expect(res.status).toBe(404);
  });

  it("requires warning acknowledgement", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    getOwnReportWithEntries.mockResolvedValue(makeReport("owner-uuid"));
    validateReportMock.mockReturnValue({
      ...readyValidation(),
      warnings: [{ code: "MISSING_SESSION", severity: "warning", message: "warn" }],
    });
    const res = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formats: ["xlsx"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("REPORT_INCOMPLETE");
  });

  it("returns XLSX with correct MIME, filename, and cache headers", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    getOwnReportWithEntries.mockResolvedValue(makeReport("owner-uuid"));
    const res = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formats: ["xlsx"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("Content-Disposition")).toContain("_DTR.xlsx");
    expect(generateDtrXlsx).toHaveBeenCalled();
  });

  it("keeps DOCX export working", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    getOwnReportWithEntries.mockResolvedValue(makeReport("owner-uuid"));
    const res = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formats: ["docx"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("wordprocessingml.document");
    expect(generateAccomplishmentDocx).toHaveBeenCalled();
  });
});
