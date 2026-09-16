// src/features/user-management/admin/utils/__tests__/invite-link.test.ts
import { buildInviteLink } from "../invite-link";

describe("buildInviteLink", () => {
  test("points at the /join route", () => {
    expect(buildInviteLink("https://companion.app", "8f3c-91ba-2d", "g1")).toBe(
      "https://companion.app/join?token=8f3c-91ba-2d&groupId=g1"
    );
  });

  // The link this replaced was `?join=true&token=…&groupId=…` on the origin
  // root -- a query nothing in the application has ever read. Every invitation
  // sent from the admin panel landed on the campaign home page and did nothing.
  test("does not use the old ?join= query, which nothing handles", () => {
    const link = buildInviteLink("https://companion.app", "abc", "g1");
    expect(link).not.toContain("join=true");
    expect(new URL(link).pathname).toBe("/join");
  });

  // `+` for a space is the correct query-string encoding and decodes back to
  // one; what matters is that `&` and `=` inside a value cannot split the query.
  test("encodes a token that would otherwise break the query", () => {
    expect(buildInviteLink("https://companion.app", "a b&c=d", "g/1")).toBe(
      "https://companion.app/join?token=a+b%26c%3Dd&groupId=g%2F1"
    );
  });

  test("a token containing & and = still round-trips whole", () => {
    const params = new URL(
      buildInviteLink("https://x.test", "a b&c=d", "g1")
    ).searchParams;
    expect(params.get("token")).toBe("a b&c=d");
  });

  test("survives an origin with a trailing slash", () => {
    expect(buildInviteLink("https://companion.app/", "abc", "g1")).toBe(
      "https://companion.app/join?token=abc&groupId=g1"
    );
  });

  test("round-trips: the link's own query is what /join reads", () => {
    const params = new URL(buildInviteLink("https://x.test", "tok-1", "grp-1"))
      .searchParams;
    expect(params.get("token")).toBe("tok-1");
    expect(params.get("groupId")).toBe("grp-1");
  });

  test("omits groupId when there is none rather than writing null", () => {
    expect(buildInviteLink("https://x.test", "tok-1", null)).toBe(
      "https://x.test/join?token=tok-1"
    );
  });
});
