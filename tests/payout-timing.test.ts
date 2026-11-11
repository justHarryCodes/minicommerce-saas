import { describe, it, expect } from "vitest";
import { expectedPayoutDate, lagosDate, shortDay } from "@/lib/payout-timing";

// Duka Pay: Paystack pays stores the next working day; weekend sales on Monday.

const at = (iso: string) => new Date(iso);

describe("when a Duka Pay payment reaches the store's bank", () => {
  it("weekday sales arrive the next day", () => {
    expect(expectedPayoutDate(at("2026-11-11T13:17:00+01:00"))).toBe("2026-11-12"); // Wed → Thu
    expect(expectedPayoutDate(at("2026-11-12T09:00:00+01:00"))).toBe("2026-11-13"); // Thu → Fri
  });

  it("Friday, Saturday and Sunday sales arrive Monday", () => {
    expect(expectedPayoutDate(at("2026-11-13T18:00:00+01:00"))).toBe("2026-11-16"); // Fri
    expect(expectedPayoutDate(at("2026-11-14T10:00:00+01:00"))).toBe("2026-11-16"); // Sat
    expect(expectedPayoutDate(at("2026-11-15T22:00:00+01:00"))).toBe("2026-11-16"); // Sun
  });

  it("uses the Lagos calendar day, not UTC", () => {
    // 23:30 UTC on Sunday is already 00:30 Monday in Lagos → arrives Tuesday
    expect(lagosDate(at("2026-11-15T23:30:00Z"))).toBe("2026-11-16");
    expect(expectedPayoutDate(at("2026-11-15T23:30:00Z"))).toBe("2026-11-17");
  });

  it("formats the day for people", () => {
    expect(shortDay("2026-11-16")).toMatch(/Mon/);
    expect(shortDay("2026-11-16")).toMatch(/16/);
  });
});
