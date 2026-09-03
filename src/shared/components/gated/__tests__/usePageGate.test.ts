// src/shared/components/gated/__tests__/usePageGate.test.ts
import { renderHook } from "@testing-library/react";
import { usePageGate } from "../usePageGate";
import { GATED_COPY } from "../gated-page-copy";

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

  it("is ready for notes when a group is chosen but no campaign is", () => {
    // Notes needs a group only -- see GATED_COPY.notes.requires.
    mockMissingContext = "campaign";
    const { result } = renderHook(() => usePageGate("notes"));
    expect(result.current.state).toBe("ready");
  });

  it("still gates notes when no group is chosen", () => {
    mockMissingContext = "group";
    const { result } = renderHook(() => usePageGate("notes"));
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
