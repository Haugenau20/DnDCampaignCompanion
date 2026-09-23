// src/context/firebase/hooks/__tests__/useAuth.test.tsx

import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../useAuth";

/**
 * useAuth Behavioral Testing
 *
 * Tests the useAuth hook by mocking useFirebaseContext (since FirebaseContext
 * is not exported) and firebaseServices. Validates:
 * - Returned API shape
 * - Success paths (sendSignInLink, completeSignInLink, signInWithGoogle,
 *   signOut, renewSession, etc.)
 *
 * The `signIn(email, password)` suite was replaced: password sign-in was
 * removed on purpose (T022). Each passwordless entrance is held to the same
 * contract that suite asserted -- error cleared first, surfaced via setError
 * and re-thrown on failure.
 * - Error paths: errors are surfaced via setError AND re-thrown
 * - State transitions: sessionExpired flag
 * - Memoization: callbacks stable across re-renders when deps unchanged
 */

// ---------------------------------------------------------------------------
// Mock firebaseServices
// ---------------------------------------------------------------------------
const mockSendSignInLink = jest.fn();
const mockCompleteSignInLink = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockLinkGoogle = jest.fn();
const mockGetSignInMethods = jest.fn();
const mockSignOut = jest.fn();
const mockUpdateLastActivity = jest.fn();
const mockRenewSession = jest.fn();
const mockCheckSessionExpired = jest.fn();

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    auth: {
      sendSignInLink: (...args: any[]) => mockSendSignInLink(...args),
      completeSignInLink: (...args: any[]) => mockCompleteSignInLink(...args),
      signInWithGoogle: (...args: any[]) => mockSignInWithGoogle(...args),
      linkGoogle: (...args: any[]) => mockLinkGoogle(...args),
      getSignInMethods: (...args: any[]) => mockGetSignInMethods(...args),
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

      expect(typeof result.current.sendSignInLink).toBe("function");
      expect(typeof result.current.completeSignInLink).toBe("function");
      expect(typeof result.current.signInWithGoogle).toBe("function");
      expect(typeof result.current.linkGoogle).toBe("function");
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
  describe.each([
    {
      name: "sendSignInLink",
      mock: mockSendSignInLink,
      call: (auth: any) => auth.sendSignInLink("user@test.com", "http://app/auth/link", true),
      args: ["user@test.com", "http://app/auth/link", true],
      fallback: "Could not send the sign-in link",
      returnsResult: false,
    },
    {
      name: "completeSignInLink",
      mock: mockCompleteSignInLink,
      call: (auth: any) => auth.completeSignInLink("user@test.com", "http://app/auth/link?oobCode=x", true),
      args: ["user@test.com", "http://app/auth/link?oobCode=x", true],
      fallback: "An error occurred during sign in",
      returnsResult: true,
    },
    {
      name: "signInWithGoogle",
      mock: mockSignInWithGoogle,
      call: (auth: any) => auth.signInWithGoogle(true, "user@gmail.com"),
      args: [true, "user@gmail.com"],
      fallback: "An error occurred during sign in",
      returnsResult: true,
    },
  ])("$name Behavior", ({ mock, call, args, fallback, returnsResult }) => {
    test("should delegate to the auth service with the same arguments", async () => {
      mock.mockResolvedValue({ user: { uid: "u1" }, isNewUser: false });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await call(result.current);
      });

      expect(mock).toHaveBeenCalledWith(...args);
    });

    test("should clear error before calling the service", async () => {
      mock.mockResolvedValue({ user: { uid: "u1" }, isNewUser: false });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await call(result.current);
      });

      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    test("should return the service's result, or nothing when it has none", async () => {
      const outcome = { user: { uid: "u99" }, isNewUser: true };
      mock.mockResolvedValue(outcome);
      const { result } = renderHook(() => useAuth());

      let returned: any;
      await act(async () => {
        returned = await call(result.current);
      });

      expect(returned).toBe(returnsResult ? outcome : undefined);
    });

    test("should call setError with the message on failure (Error instance)", async () => {
      mock.mockRejectedValue(new Error("INVITE_REQUIRED"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await call(result.current);
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("INVITE_REQUIRED");
    });

    test("should use a generic message when a non-Error is thrown", async () => {
      mock.mockRejectedValue("non-error string");
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await call(result.current);
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith(fallback);
    });

    test("should re-throw on failure", async () => {
      mock.mockRejectedValue(new Error("sign in failed"));
      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await call(result.current);
        })
      ).rejects.toThrow("sign in failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("Account methods", () => {
    test("linkGoogle delegates to the auth service", async () => {
      mockLinkGoogle.mockResolvedValue({ uid: "u1" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.linkGoogle();
      });

      expect(mockLinkGoogle).toHaveBeenCalled();
    });

    test("getSignInMethods reports what the auth service reports", () => {
      mockGetSignInMethods.mockReturnValue(["email", "google"]);
      const { result } = renderHook(() => useAuth());
      expect(result.current.getSignInMethods()).toEqual(["email", "google"]);
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
    test("signInWithGoogle reference should be stable across re-renders when setError is stable", () => {
      const { result, rerender } = renderHook(() => useAuth());

      const firstRef = result.current.signInWithGoogle;
      rerender();

      expect(result.current.signInWithGoogle).toBe(firstRef);
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
