import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();
const getDbMock = vi.fn(() => ({
  select: selectMock,
  insert: insertMock,
  update: updateMock,
  transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      select: selectMock,
      insert: insertMock,
      update: updateMock,
    }),
  ),
}));

vi.mock("@/db", () => ({
  getDb: () => getDbMock(),
}));

import { ensureProfile, updateOwnProfile } from "@/db/dal/profiles";
import { setOwnActiveSchedule, upsertOwnDefaultSchedule } from "@/db/dal/schedules";
import { createCompressedWeekdayRules } from "@/lib/onboarding/defaults";

function chainReturning(result: unknown) {
  const limit = vi.fn(async () => result);
  const where = vi.fn(() => ({ limit, returning: vi.fn(async () => result) }));
  const from = vi.fn(() => ({ where }));
  return { from, where, limit };
}

describe("ensureProfile idempotency (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an existing profile without inserting", async () => {
    const existing = [{ id: "11111111-1111-4111-8111-111111111111", employeeName: "" }];
    const chained = chainReturning(existing);
    selectMock.mockReturnValue({ from: chained.from });

    const profile = await ensureProfile("11111111-1111-4111-8111-111111111111");
    expect(profile.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects invalid user ids", async () => {
    await expect(ensureProfile("not-a-uuid")).rejects.toThrow(/Invalid/);
  });
});

describe("profile update ownership (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects client-supplied mismatched user ids", async () => {
    await expect(
      updateOwnProfile(
        "11111111-1111-4111-8111-111111111111",
        {
          employeeName: "Ada",
          employeeTitle: null,
          organizationName: "Town",
          officeName: "Office",
          departmentName: null,
          timezone: "Asia/Manila",
          locale: "en-PH",
        },
        "22222222-2222-4222-8222-222222222222",
      ),
    ).rejects.toThrow(/not allowed/);
  });
});

describe("active schedule integrity (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects setting an active schedule that is not owned", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            { id: "11111111-1111-4111-8111-111111111111", employeeName: "" },
          ]),
        })),
      })),
    });
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    });

    await expect(
      setOwnActiveSchedule(
        "11111111-1111-4111-8111-111111111111",
        "33333333-3333-4333-8333-333333333333",
      ),
    ).rejects.toThrow(/not found/);
  });

  it("rejects client owner id on schedule upsert", async () => {
    await expect(
      upsertOwnDefaultSchedule("11111111-1111-4111-8111-111111111111", {
        name: "Compressed",
        weekdayRules: createCompressedWeekdayRules(),
        clientSuppliedOwnerId: "22222222-2222-4222-8222-222222222222",
      }),
    ).rejects.toThrow(/not allowed/);
  });
});
