// src/core/utils/__tests__/registration-token.test.ts

import {
  REGISTRATION_TOKEN_LIFETIME_MS,
  isRegistrationTokenExpired,
  isRegistrationTokenRedeemable,
  toTokenDate,
} from "../registration-token";

const NOW = new Date("2026-09-23T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("registration-token", () => {
  test("a token lives for 14 days", () => {
    expect(REGISTRATION_TOKEN_LIFETIME_MS).toBe(14 * DAY);
  });

  describe("toTokenDate", () => {
    test("reads a Firestore Timestamp through its toDate()", () => {
      const date = new Date("2026-10-01T00:00:00.000Z");
      expect(toTokenDate({ toDate: () => date })).toBe(date);
    });

    test("passes a Date through, and parses a string or epoch millis", () => {
      expect(toTokenDate(NOW)).toBe(NOW);
      expect(toTokenDate(NOW.toISOString())?.getTime()).toBe(NOW.getTime());
      expect(toTokenDate(NOW.getTime())?.getTime()).toBe(NOW.getTime());
    });

    test("returns undefined when nothing is stored", () => {
      expect(toTokenDate(undefined)).toBeUndefined();
      expect(toTokenDate(null)).toBeUndefined();
    });
  });

  describe("isRegistrationTokenExpired", () => {
    test("a token with no expiry never expires", () => {
      expect(isRegistrationTokenExpired(undefined, NOW)).toBe(false);
    });

    test("is live until its expiry, and expired from that instant on", () => {
      expect(isRegistrationTokenExpired(new Date(NOW.getTime() + 1), NOW)).toBe(false);
      expect(isRegistrationTokenExpired(NOW, NOW)).toBe(true);
      expect(isRegistrationTokenExpired(new Date(NOW.getTime() - DAY), NOW)).toBe(true);
    });

    test("reads a Timestamp-shaped expiry", () => {
      const past = { toDate: () => new Date(NOW.getTime() - DAY) };
      expect(isRegistrationTokenExpired(past, NOW)).toBe(true);
    });
  });

  describe("isRegistrationTokenRedeemable", () => {
    const future = new Date(NOW.getTime() + DAY);
    const past = new Date(NOW.getTime() - DAY);

    test.each([
      ["unused, not expired", { used: false, expiresAt: future }, true],
      ["unused, legacy token with no expiry", { used: false }, true],
      ["unused, expired", { used: false, expiresAt: past }, false],
      ["used, not expired", { used: true, expiresAt: future }, false],
      ["used, legacy", { used: true }, false],
    ])("%s → %s", (_label, data, expected) => {
      expect(isRegistrationTokenRedeemable(data, NOW)).toBe(expected);
    });
  });
});
