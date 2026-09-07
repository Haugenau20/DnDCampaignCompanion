// src/shared/components/gated/__tests__/usePageGate.test.ts
import { renderHook } from "@testing-library/react";
import { usePageGate } from "../usePageGate";
import { GATED_COPY as REAL_GATED_COPY, GatedPageKey } from "../gated-page-copy";

// No shipped page declares `requires: "group"` any more (see the note on
// `GATED_COPY.notes` in gated-page-copy.ts -- `notes` turned out to need a
// campaign after all). The branch in `usePageGate` that honours a
// group-only page is still real code, reachable the day a page like that
// exists, so it stays covered here by mocking in a synthetic key rather than
// leaning on a page whose own requirement changed for unrelated reasons.
jest.mock("../gated-page-copy", () => {
  const actual = jest.requireActual("../gated-page-copy");
  return {
    ...actual,
    GATED_COPY: {
      ...actual.GATED_COPY,
      "group-only-test-page": {
        heading: "Sign in to see this",
        blurb: "Test fixture blurb.",
        noun: "things",
        requires: "group",
      },
    },
  };
});

const GATED_COPY = REAL_GATED_COPY as typeof REAL_GATED_COPY & {
  "group-only-test-page": (typeof REAL_GATED_COPY)["quests"];
};

// No `GatedPageKey` union member is group-only any more, so the synthetic
// fixture key above is cast rather than added to the real type -- adding it
// there would leak a test-only page into the type every real caller sees.
const GROUP_ONLY_TEST_PAGE = "group-only-test-page" as unknown as GatedPageKey;

let mockUser: { uid: string } | null = { uid: "user-1" };
let mockIsResolving = false;
let mockMissingContext: "group" | "campaign" | null = null;

jest.mock("features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock("shared/hooks/useCampaignContextStatus", () => ({
  useCampaignContextStatus: () => ({
    isResolving: mockIsResolving,
    hasRequiredContext: !mockIsResolving && mockMissingContext === null,
    missingContext: mockIsResolving ? null : mockMissingContext,
  }),
}));

beforeEach(() => {
  mockUser = { uid: "user-1" };
  mockIsResolving = false;
  mockMissingContext = null;
});

describe("usePageGate", () => {
  it("is ready when signed in with a campaign and no error", () => {
    const { result } = renderHook(() => usePageGate("quests"));
    expect(result.current.state).toBe("ready");
    expect(result.current.canAct).toBe(true);
  });

  it("reports resolving while auth is still restoring, even with no user yet", () => {
    // The whole point of state 1: on a fresh load there is no user object yet,
    // and claiming "signed out" here is the flash this PR removes.
    mockIsResolving = true;
    mockUser = null;
    const { result } = renderHook(() => usePageGate("quests"));
    expect(result.current.state).toBe("resolving");
  });

  it("reports resolving while the caller's own fetch is in flight", () => {
    const { result } = renderHook(() =>
      usePageGate("quests", { loading: true })
    );
    expect(result.current.state).toBe("resolving");
  });

  it("reports signed-out ahead of a missing campaign", () => {
    // Signed out is why the campaign is missing; naming the campaign would
    // send the visitor looking for a switcher the header does not render.
    mockUser = null;
    mockMissingContext = "group";
    const { result } = renderHook(() => usePageGate("quests"));
    expect(result.current.state).toBe("signed-out");
  });

  it("reports signed-out ahead of an error", () => {
    mockUser = null;
    const { result } = renderHook(() =>
      usePageGate("quests", { error: "Error Loading Quests" })
    );
    expect(result.current.state).toBe("signed-out");
  });

  it("reports pick-campaign when signed in with no group", () => {
    mockMissingContext = "group";
    const { result } = renderHook(() => usePageGate("quests"));
    expect(result.current.state).toBe("pick-campaign");
    expect(result.current.canAct).toBe(false);
  });

  it("reports pick-campaign when signed in with a group but no campaign", () => {
    mockMissingContext = "campaign";
    const { result } = renderHook(() => usePageGate("quests"));
    expect(result.current.state).toBe("pick-campaign");
  });

  // Rewritten: these two used to key on `"notes"`, back when
  // `GATED_COPY.notes.requires` was `"group"`. That was a spec mistake --
  // `NoteContext` discards everything without a campaign, so `notes` now
  // requires a campaign like every other page (see gated-page-copy.ts). The
  // group-only branch in `usePageGate` below is still real, reachable code
  // (`GatedContextRequirement` keeps `"group"` as a valid value for a future
  // page), so it is exercised here against the synthetic
  // `"group-only-test-page"` fixture key instead of a real page whose
  // requirement no longer matches.
  it("is ready for a group-only page when a group is chosen but no campaign is", () => {
    mockMissingContext = "campaign";
    const { result } = renderHook(() => usePageGate(GROUP_ONLY_TEST_PAGE));
    expect(result.current.state).toBe("ready");
  });

  it("still gates a group-only page when no group is chosen", () => {
    mockMissingContext = "group";
    const { result } = renderHook(() => usePageGate(GROUP_ONLY_TEST_PAGE));
    expect(result.current.state).toBe("pick-campaign");
  });

  it("reports error last, once everything else has settled", () => {
    const { result } = renderHook(() =>
      usePageGate("quests", { error: "Network down" })
    );
    expect(result.current.state).toBe("error");
    expect(result.current.error).toBe("Network down");
    expect(result.current.canAct).toBe(false);
  });

  it("carries the page's copy and read heading", () => {
    const { result } = renderHook(() => usePageGate("rumors"));
    expect(result.current.copy).toBe(GATED_COPY.rumors);
    expect(result.current.heading).toBe(GATED_COPY.rumors.heading);
  });

  it("carries the write heading in write mode", () => {
    const { result } = renderHook(() =>
      usePageGate("rumors", { mode: "write" })
    );
    expect(result.current.heading).toBe(GATED_COPY.rumors.writeHeading);
    expect(result.current.mode).toBe("write");
  });

  it("passes the retry callback through untouched", () => {
    const onRetry = jest.fn();
    const { result } = renderHook(() =>
      usePageGate("quests", { error: "boom", onRetry })
    );
    expect(result.current.onRetry).toBe(onRetry);
  });
});
