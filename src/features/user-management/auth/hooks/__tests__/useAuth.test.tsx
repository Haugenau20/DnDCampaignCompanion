// src/context/firebase/hooks/__tests__/useAuth.test.tsx

import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../useAuth";

/**
 * useAuth Behavioral Testing
 *
 * Tests the useAuth hook by mocking useFirebaseContext (since FirebaseContext
 * is not exported) and firebaseServices. Validates:
 * - Returned API shape
 * - Success paths (signIn, signOut, renewSession, etc.)
 * - Error paths: errors are surfaced via setError AND re-thrown
 * - State transitions: sessionExpired flag
 * - Memoization: callbacks stable across re-renders when deps unchanged
 */

// ---------------------------------------------------------------------------
// Mock firebaseServices
// ---------------------------------------------------------------------------
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockUpdateLastActivity = jest.fn();
const mockRenewSession = jest.fn();
const mockCheckSessionExpired = jest.fn();

jest.mock("@/services/firebase", () => ({
  __esModule: true,
  default: {
    auth: {
      signIn: (...args: any[]) => mockSignIn(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      updateLastActivity: (...args: any[]) => mockUpdateLastActivity(...args),
      renewSession: (...args: any[]) => mockRenewSession(...args),
      checkSessionExpired: (...args: any[]) => mockCheckSessionExpired(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock useFirebaseContext
// ---------------------------------------------------------------------------
const mockSetError = jest.fn();
const mockRefreshUserProfile = jest.fn();

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
    refreshUserProfile: mockRefreshUserProfile,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("useAuth Behavioral Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckSessionExpired.mockReturnValue(false);
    mockContextValue = makeContext();
  });

  // -------------------------------------------------------------------------
  describe("Initialization / Shape", () => {
    test("should expose all required API members", () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signOut).toBe("function");
      expect(typeof result.current.refreshSession).toBe("function");
      expect(typeof result.current.renewSession).toBe("function");
      expect(typeof result.current.checkSessionExpired).toBe("function");
      expect(typeof result.current.sessionExpired).toBe("boolean");
      expect(typeof result.current.isAuthenticated).toBe("boolean");
    });

    test("should reflect user from context", () => {
      const fakeUser = { uid: "u1" } as any;
      mockContextValue = makeContext({ user: fakeUser });

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBe(fakeUser);
    });

    test("should set isAuthenticated to false when user is null", () => {
      mockContextValue = makeContext({ user: null });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
    });

    test("should set isAuthenticated to true when user is non-null", () => {
      mockContextValue = makeContext({ user: { uid: "u1" } as any });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(true);
    });

    test("should initialize sessionExpired as false", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.sessionExpired).toBe(false);
    });

    test("should reflect loading from context", () => {
      mockContextValue = makeContext({ loading: true });

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
    });

    test("should reflect error from context", () => {
      mockContextValue = makeContext({ error: "Some error" });

      const { result } = renderHook(() => useAuth());

      expect(result.current.error).toBe("Some error");
    });
  });

  // -------------------------------------------------------------------------
  describe("signIn Behavior", () => {
    test("should call firebaseServices.auth.signIn with correct args", async () => {
      const fakeUser = { uid: "u1" } as any;
      mockSignIn.mockResolvedValue(fakeUser);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password", true);
      });

      expect(mockSignIn).toHaveBeenCalledWith("user@test.com", "password", true);
    });

    test("should use default rememberMe=false when not provided", async () => {
      mockSignIn.mockResolvedValue({ uid: "u1" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password");
      });

      expect(mockSignIn).toHaveBeenCalledWith("user@test.com", "password", false);
    });

    test("should clear error before calling signIn", async () => {
      mockSignIn.mockResolvedValue({ uid: "u1" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password");
      });

      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    test("should return the user returned by firebaseServices.auth.signIn", async () => {
      const fakeUser = { uid: "u99" } as any;
      mockSignIn.mockResolvedValue(fakeUser);

      const { result } = renderHook(() => useAuth());

      let returnedUser: any;
      await act(async () => {
        returnedUser = await result.current.signIn("a@b.com", "pw");
      });

      expect(returnedUser).toBe(fakeUser);
    });

    test("should call setError with message on signIn failure (Error instance)", async () => {
      mockSignIn.mockRejectedValue(new Error("Invalid credentials"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("bad@user.com", "wrong");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Invalid credentials");
    });

    test("should use generic message when non-Error thrown during signIn", async () => {
      mockSignIn.mockRejectedValue("non-error string");

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("a@b.com", "pw");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("An error occurred during sign in");
    });

    test("should re-throw on signIn failure", async () => {
      const error = new Error("sign in failed");
      mockSignIn.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("a@b.com", "pw");
        })
      ).rejects.toThrow("sign in failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("signOut Behavior", () => {
    test("should call firebaseServices.auth.signOut", async () => {
      mockSignOut.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    test("should clear error before calling signOut", async () => {
      mockSignOut.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    test("should call setError with message on signOut failure", async () => {
      mockSignOut.mockRejectedValue(new Error("Sign out failed"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signOut();
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Sign out failed");
    });

    test("should re-throw on signOut failure", async () => {
      mockSignOut.mockRejectedValue(new Error("logout error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signOut();
        })
      ).rejects.toThrow("logout error");
    });
  });

  // -------------------------------------------------------------------------
  describe("refreshSession Behavior", () => {
    test("should call updateLastActivity when user is present", () => {
      mockContextValue = makeContext({ user: { uid: "u1" } as any });

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.refreshSession();
      });

      expect(mockUpdateLastActivity).toHaveBeenCalledTimes(1);
    });

    test("should NOT call updateLastActivity when user is null", () => {
      mockContextValue = makeContext({ user: null });

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.refreshSession();
      });

      expect(mockUpdateLastActivity).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("renewSession Behavior", () => {
    test("should call firebaseServices.auth.renewSession with rememberMe arg", async () => {
      mockRenewSession.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.renewSession(true);
      });

      expect(mockRenewSession).toHaveBeenCalledWith(true);
    });

    test("should reset sessionExpired to false on successful renewSession", async () => {
      mockRenewSession.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.renewSession();
      });

      expect(result.current.sessionExpired).toBe(false);
    });

    test("should call setError with message on renewSession failure", async () => {
      mockRenewSession.mockRejectedValue(new Error("Session expired"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.renewSession();
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Session expired");
    });

    test("should re-throw on renewSession failure", async () => {
      mockRenewSession.mockRejectedValue(new Error("renew failed"));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.renewSession();
        })
      ).rejects.toThrow("renew failed");
    });

    test("should use generic message on non-Error renewSession failure", async () => {
      mockRenewSession.mockRejectedValue("plain string error");

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.renewSession();
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Failed to renew session");
    });
  });

  // -------------------------------------------------------------------------
  describe("checkSessionExpired Behavior", () => {
    test("should delegate to firebaseServices.auth.checkSessionExpired and return result", () => {
      mockCheckSessionExpired.mockReturnValue(true);

      const { result } = renderHook(() => useAuth());

      const expired = result.current.checkSessionExpired();

      expect(mockCheckSessionExpired).toHaveBeenCalledTimes(1);
      expect(expired).toBe(true);
    });

    test("should return false when service reports not expired", () => {
      mockCheckSessionExpired.mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      expect(result.current.checkSessionExpired()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe("Memoization Behavior", () => {
    test("signIn reference should be stable across re-renders when setError is stable", () => {
      const { result, rerender } = renderHook(() => useAuth());

      const firstRef = result.current.signIn;
      rerender();

      expect(result.current.signIn).toBe(firstRef);
    });

    test("signOut reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useAuth());

      const firstRef = result.current.signOut;
      rerender();

      expect(result.current.signOut).toBe(firstRef);
    });

    test("checkSessionExpired reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useAuth());

      const firstRef = result.current.checkSessionExpired;
      rerender();

      expect(result.current.checkSessionExpired).toBe(firstRef);
    });

    test("renewSession reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useAuth());

      const firstRef = result.current.renewSession;
      rerender();

      expect(result.current.renewSession).toBe(firstRef);
    });
  });
});
