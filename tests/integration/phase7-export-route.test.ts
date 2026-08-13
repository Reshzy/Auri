import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireAuthenticatedUser, generateMock } = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  generateMock: vi.fn(),
}));

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
  ExportHistoryService: { listForReport: vi.fn().mockResolvedValue([]) },
}));

import { POST } from "@/app/api/reports/[reportId]/exports/route";

describe("Phase 7 POST /api/reports/[reportId]/exports (persisted JSON)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateMock.mockResolvedValue({
      overallStatus: "complete",
      reportId: "r1",
      results: [
        {
          format: "xlsx",
          status: "created",
          export: {
            id: "e2",
            fileName: "Auri_Owner_2026-08-01_to_2026-08-15_DTR.xlsx",
            fileSizeBytes: 12,
            sha256: "e".repeat(64),
            isCurrent: true,
            createdAt: "2026-08-01T00:00:00.000Z",
            downloadUrl: "/api/exports/e2/download",
          },
        },
      ],
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

  it("rejects zip without member formats", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    const res = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formats: ["zip"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("UNSUPPORTED_FORMAT");
  });

  it("returns persisted XLSX metadata", async () => {
    requireAuthenticatedUser.mockResolvedValue({
      id: "owner-uuid",
      clerkUserId: "user_abc",
      email: null,
    });
    const res = await POST(
      new Request("http://localhost/api/reports/r1/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formats: ["xlsx"], acknowledgedWarnings: [] }),
      }),
      { params: Promise.resolve({ reportId: "r1" }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const json = await res.json();
    expect(json.results[0].format).toBe("xlsx");
  });
});
