import { describe, expect, it } from "vitest";
import { orderPresets } from "@/lib/presets/order";

describe("orderPresets", () => {
  it("orders by use_count desc then last_used_at then label then created_at", () => {
    const rows = [
      {
        id: "1",
        label: "Beta",
        useCount: 1,
        lastUsedAt: "2026-08-01T00:00:00.000Z",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "2",
        label: "Alpha",
        useCount: 5,
        lastUsedAt: null,
        createdAt: "2026-07-02T00:00:00.000Z",
      },
      {
        id: "3",
        label: "Gamma",
        useCount: 1,
        lastUsedAt: "2026-08-02T00:00:00.000Z",
        createdAt: "2026-07-03T00:00:00.000Z",
      },
      {
        id: "4",
        label: "alpha",
        useCount: 5,
        lastUsedAt: null,
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ];

    expect(orderPresets(rows).map((r) => r.id)).toEqual(["4", "2", "3", "1"]);
  });

  it("uses stable label/created_at ties", () => {
    const rows = [
      {
        label: "Same",
        useCount: 0,
        lastUsedAt: null,
        createdAt: "2026-08-02T00:00:00.000Z",
      },
      {
        label: "Same",
        useCount: 0,
        lastUsedAt: null,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ];
    expect(orderPresets(rows).map((r) => r.createdAt)).toEqual([
      "2026-08-01T00:00:00.000Z",
      "2026-08-02T00:00:00.000Z",
    ]);
  });
});
