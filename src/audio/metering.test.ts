import { meteringToLevel } from "./metering";

describe("meteringToLevel", () => {
  it("normalizes Expo Audio decibels to a clamped UI value", () => {
    expect(meteringToLevel(undefined)).toBe(0);
    expect(meteringToLevel(-80)).toBe(0);
    expect(meteringToLevel(-30)).toBe(0.5);
    expect(meteringToLevel(12)).toBe(1);
  });
});
