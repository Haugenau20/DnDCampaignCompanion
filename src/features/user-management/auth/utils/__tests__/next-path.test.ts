// src/features/user-management/auth/utils/__tests__/next-path.test.ts
import { safeNextPath, signInPathFor, CAMPAIGN_HOME } from "../next-path";

/**
 * The `next` parameter is the one piece of user-supplied input this phase
 * feeds to a navigation call, so every rejection case here is an open-redirect
 * test, not a tidiness test (design doc D45).
 */
describe("safeNextPath", () => {
  describe("accepts same-origin paths", () => {
    test("a plain path", () => {
      expect(safeNextPath("/admin/people")).toBe("/admin/people");
    });

    test("a path with a query string, intact", () => {
      expect(safeNextPath("/locations?view=map&id=moria")).toBe(
        "/locations?view=map&id=moria"
      );
    });

    test("a path with a hash", () => {
      expect(safeNextPath("/notes/abc#section")).toBe("/notes/abc#section");
    });

    test("the root path", () => {
      expect(safeNextPath("/")).toBe("/");
    });

    test("a percent-encoded segment, preserved as written", () => {
      expect(safeNextPath("/npcs/Tom%20Bombadil")).toBe("/npcs/Tom%20Bombadil");
    });
  });

  describe("rejects anything that could leave the origin", () => {
    test.each([
      ["a protocol-relative URL", "//evil.test"],
      ["an absolute URL", "https://evil.test"],
      ["a scheme-only prefix", "http://evil.test/admin"],
      ["a backslash-escaped host", "/\\evil.test"],
      ["a double backslash", "\\\\evil.test"],
      ["an encoded protocol-relative URL", "/%2Fevil.test"],
      ["a fully encoded protocol-relative URL", "%2F%2Fevil.test"],
      ["a javascript: URL", "javascript:alert(1)"],
      ["a data: URL", "data:text/html,<script>alert(1)</script>"],
      ["a tab-smuggled protocol-relative URL", "/\t/evil.test"],
      ["a newline-smuggled scheme", "java\nscript:alert(1)"],
      ["a path not starting with a slash", "admin/people"],
      ["an empty string", ""],
      ["whitespace only", "   "],
      ["null", null],
      ["undefined", undefined],
    ])("rejects %s", (_label, input) => {
      expect(safeNextPath(input as string | null | undefined)).toBeNull();
    });
  });

  describe("rejects the auth routes themselves, to avoid a redirect loop", () => {
    test.each([
      ["/signin"],
      ["/signin?next=/admin/people"],
      ["/join"],
      ["/join?token=abc"],
      ["/auth/link"],
      ["/auth/link?next=%2Fnpcs"],
    ])("rejects %s", (input) => {
      expect(safeNextPath(input)).toBeNull();
    });

    test("does not reject a route that merely starts with the same letters", () => {
      expect(safeNextPath("/joinery")).toBe("/joinery");
    });
  });
});

describe("signInPathFor", () => {
  test("carries the current path", () => {
    expect(signInPathFor({ pathname: "/admin/people", search: "" })).toBe(
      "/signin?next=%2Fadmin%2Fpeople"
    );
  });

  test("carries the query string too", () => {
    expect(
      signInPathFor({ pathname: "/locations", search: "?view=map" })
    ).toBe("/signin?next=%2Flocations%3Fview%3Dmap");
  });

  test("round-trips back through safeNextPath", () => {
    const signInPath = signInPathFor({ pathname: "/notes/abc", search: "?edit=1" });
    const next = new URLSearchParams(signInPath.split("?")[1]).get("next");
    expect(safeNextPath(next)).toBe("/notes/abc?edit=1");
  });

  test("omits the parameter for a destination that would be rejected anyway", () => {
    expect(signInPathFor({ pathname: "/signin", search: "" })).toBe("/signin");
  });
});

describe("CAMPAIGN_HOME", () => {
  test("is where a rejected or absent next lands", () => {
    expect(CAMPAIGN_HOME).toBe("/");
  });
});
