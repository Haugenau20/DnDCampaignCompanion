// src/context/firebase/hooks/__tests__/useUsernameLookup.test.tsx

import { renderHook, act, waitFor } from "@testing-library/react";
import { useUsernameLookup } from "../useUsernameLookup";

/**
 * useUsernameLookup Behavioral Testing
 *
 * Tests the useUsernameLookup hook against a mocked useFirebaseContext,
 * firebaseServices, and fetchAttributionUsernames utility. Validates:
 * - Returned API shape and initial state
 * - lookupUsernames: short-circuits when activeGroupId or userIds absent
 * - lookupUsernames: calls fetchAttributionUsernames with correct args
 * - lookupUsernames: merges new results into existing usernameMap
 * - loading state transitions (true → false)
 * - Error handling: setError called, loading still resets to false
 * - Memoization: lookupUsernames stable when activeGroupId unchanged
 */

// ---------------------------------------------------------------------------
// Mock firebaseServices
// ---------------------------------------------------------------------------
jest.mock("@/services/firebase", () => ({
  __esModule: true,
  default: {
    user: {
      getGroupUserProfile: jest.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock attribution-utils
// ---------------------------------------------------------------------------
const mockFetchAttributionUsernames = jest.fn();

jest.mock("@/utils/attribution-utils", () => ({
  fetchAttributionUsernames: (...args: any[]) =>
    mockFetchAttributionUsernames(...args),
}));

// ---------------------------------------------------------------------------
// Mock useFirebaseContext
// ---------------------------------------------------------------------------
const mockSetError = jest.fn();

let mockContextValue: any = {};

jest.mock("@/features/user-management/auth/context/FirebaseContext", () => ({
  useFirebaseContext: () => mockContextValue,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeContext(overrides: Record<string, any> = {}) {
  return {
    user: null,
    userProfile: null,
    loading: false,
    error: null,
    setError: mockSetError,
    groups: [],
    activeGroupId: null,
    activeGroupUserProfile: null,
    campaigns: [],
    activeCampaignId: null,
    refreshGroups: jest.fn().mockResolvedValue([]),
    refreshCampaigns: jest.fn().mockResolvedValue([]),
    refreshUserProfile: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("useUsernameLookup Behavioral Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = makeContext();
  });

  // -------------------------------------------------------------------------
  describe("Initialization / Shape", () => {
    test("should expose all required API members", () => {
      const { result } = renderHook(() => useUsernameLookup());

      expect(typeof result.current.lookupUsernames).toBe("function");
      expect(typeof result.current.usernameMap).toBe("object");
      expect(typeof result.current.loading).toBe("boolean");
      // error is passed through from context
    });

    test("should initialize usernameMap as empty object", () => {
      const { result } = renderHook(() => useUsernameLookup());

      expect(result.current.usernameMap).toEqual({});
    });

    test("should initialize loading as false", () => {
      const { result } = renderHook(() => useUsernameLookup());

      expect(result.current.loading).toBe(false);
    });

    test("should expose error from context", () => {
      mockContextValue = makeContext({ error: "Some error" });

      const { result } = renderHook(() => useUsernameLookup());

      expect(result.current.error).toBe("Some error");
    });
  });

  // -------------------------------------------------------------------------
  describe("lookupUsernames Short-Circuit Behavior", () => {
    test("should NOT call fetchAttributionUsernames when activeGroupId is null", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useUsernameLookup());

      await act(async () => {
        await result.current.lookupUsernames(["u1", "u2"]);
      });

      expect(mockFetchAttributionUsernames).not.toHaveBeenCalled();
    });

    test("should NOT call fetchAttributionUsernames when userIds array is empty", async () => {
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUsernameLookup());

      await act(async () => {
        await result.current.lookupUsernames([]);
      });

      expect(mockFetchAttributionUsernames).not.toHaveBeenCalled();
    });

    test("should NOT change loading state when short-circuiting (no activeGroupId)", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useUsernameLookup());

      await act(async () => {
        await result.current.lookupUsernames(["u1"]);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe("lookupUsernames Success Behavior", () => {
    test("should call fetchAttributionUsernames with groupId, userIds, and firebaseServices", async () => {
      mockFetchAttributionUsernames.mockResolvedValue({ u1: "Alice", u2: "Bob" });
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUsernameLookup());

      await act(async () => {
        await result.current.lookupUsernames(["u1", "u2"]);
      });

      expect(mockFetchAttributionUsernames).toHaveBeenCalledWith(
        "g1",
        ["u1", "u2"],
        expect.any(Object) // firebaseServices
      );
    });

    test("should populate usernameMap with returned results", async () => {
      mockFetchAttributionUsernames.mockResolvedValue({ u1: "Alice", u2: "Bob" });
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUsernameLookup());

      await act(async () => {
        await result.current.lookupUsernames(["u1", "u2"]);
      });

      expect(result.current.usernameMap).toEqual({ u1: "Alice", u2: "Bob" });
    });

    test("should merge new results with existing usernameMap entries", async () => {
      // First call returns u1
      mockFetchAttributionUsernames.mockResolvedValueOnce({ u1: "Alice" });
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUsernameLookup());

      await act(async () => {
        await result.current.lookupUsernames(["u1"]);
      });

      expect(result.current.usernameMap).toEqual({ u1: "Alice" });

      // Second call returns u2
      mockFetchAttributionUsernames.mockResolvedValueOnce({ u2: "Bob" });

      await act(async () => {
        await result.current.lookupUsernames(["u2"]);
      });

      // BEHAVIOR: should merge, not replace
      expect(result.current.usernameMap).toEqual({ u1: "Alice", u2: "Bob" });
    });

    test("should set loading to true during lookup and false after", async () => {
      let resolvePromise!: (v: any) => void;
      const pending = new Promise((res) => { resolvePromise = res; });
      mockFetchAttributionUsernames.mockReturnValue(pending);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUsernameLookup());

      // Start the lookup but don't await
      act(() => {
        result.current.lookupUsernames(["u1"]);
      });

      // loading should be true while pending
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise({ u1: "Alice" });
        await pending;
      });

      // loading should be false after completion
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    test("should clear error before each lookup", async () => {
      mockFetchAttributionUsernames.mockResolvedValue({});
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUsernameLookup());

      await act(async () => {
        await result.current.lookupUsernames(["u1"]);
      });

      expect(mockSetError).toHaveBeenCalledWith(null);
    });
  });

  // -------------------------------------------------------------------------
  describe("lookupUsernames Error Behavior", () => {
    test("should call setError with message when fetchAttributionUsernames throws", async () => {
      mockFetchAttributionUsernames.mockRejectedValue(new Error("Lookup error"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUsernameLookup());

      await act(async () => {
        await result.current.lookupUsernames(["u1"]);
      });

      expect(mockSetError).toHaveBeenCalledWith("Lookup error");
    });

    test("should use generic message when non-Error is thrown", async () => {
      mockFetchAttributionUsernames.mockRejectedValue("string error");
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUsernameLookup());

      await act(async () => {
        await result.current.lookupUsernames(["u1"]);
      });

      expect(mockSetError).toHaveBeenCalledWith("Error looking up usernames");
    });

    test("should set loading to false even when an error occurs", async () => {
      mockFetchAttributionUsernames.mockRejectedValue(new Error("Network error"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUsernameLookup());

      await act(async () => {
        await result.current.lookupUsernames(["u1"]);
      });

      // BEHAVIOR: finally block ensures loading resets to false
      expect(result.current.loading).toBe(false);
    });

    test("should NOT re-throw the error (error is swallowed internally)", async () => {
      mockFetchAttributionUsernames.mockRejectedValue(new Error("Network error"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUsernameLookup());

      // Should not throw
      await expect(
        act(async () => {
          await result.current.lookupUsernames(["u1"]);
        })
      ).resolves.not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  describe("Memoization Behavior", () => {
    test("lookupUsernames reference should be stable across re-renders when activeGroupId unchanged", () => {
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result, rerender } = renderHook(() => useUsernameLookup());

      const firstRef = result.current.lookupUsernames;
      rerender();

      expect(result.current.lookupUsernames).toBe(firstRef);
    });

    test("lookupUsernames reference should change when activeGroupId changes", () => {
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result, rerender } = renderHook(() => useUsernameLookup());

      const firstRef = result.current.lookupUsernames;

      // Simulate context change
      mockContextValue = makeContext({ activeGroupId: "g2" });
      rerender();

      // BEHAVIOR: useCallback dep on activeGroupId → new reference on change
      expect(result.current.lookupUsernames).not.toBe(firstRef);
    });
  });
});
