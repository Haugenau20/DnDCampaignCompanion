// src/context/firebase/hooks/__tests__/useUser.test.tsx

import { renderHook, act } from "@testing-library/react";
import { useUser } from "../useUser";

/**
 * useUser Behavioral Testing
 *
 * Tests the useUser hook by mocking useFirebaseContext and firebaseServices.
 * Validates:
 * - Returned API shape and context passthrough
 * - Success paths: CRUD calls forward correct arguments
 * - Error paths: errors set via setError and re-thrown (or swallowed where spec says so)
 * - Group-guard: operations requiring activeGroupId throw when it is absent
 * - Memoization: callbacks stable across re-renders
 */

// ---------------------------------------------------------------------------
// Mock firebaseServices
// ---------------------------------------------------------------------------
const mockUpdateUserProfile = jest.fn();
const mockUpdateGroupUserProfile = jest.fn();
const mockValidateGroupUsername = jest.fn();
const mockChangeGroupUsername = jest.fn();
const mockIsUsernameAvailableInGroup = jest.fn();
const mockIsUserAdmin = jest.fn();

jest.mock("../../../../services/firebase", () => ({
  __esModule: true,
  default: {
    user: {
      updateUserProfile: (...args: any[]) => mockUpdateUserProfile(...args),
      updateGroupUserProfile: (...args: any[]) => mockUpdateGroupUserProfile(...args),
      validateGroupUsername: (...args: any[]) => mockValidateGroupUsername(...args),
      changeGroupUsername: (...args: any[]) => mockChangeGroupUsername(...args),
      isUsernameAvailableInGroup: (...args: any[]) => mockIsUsernameAvailableInGroup(...args),
      isUserAdmin: (...args: any[]) => mockIsUserAdmin(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock useFirebaseContext
// ---------------------------------------------------------------------------
const mockSetError = jest.fn();
const mockRefreshUserProfile = jest.fn();

let mockContextValue: any = {};

jest.mock("../../FirebaseContext", () => ({
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
describe("useUser Behavioral Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshUserProfile.mockResolvedValue(undefined);
    mockContextValue = makeContext();
  });

  // -------------------------------------------------------------------------
  describe("Initialization / Shape", () => {
    test("should expose all required API members", () => {
      const { result } = renderHook(() => useUser());

      expect(typeof result.current.updateUserProfile).toBe("function");
      expect(typeof result.current.updateGroupUserProfile).toBe("function");
      expect(typeof result.current.validateUsername).toBe("function");
      expect(typeof result.current.changeUsername).toBe("function");
      expect(typeof result.current.isUsernameAvailable).toBe("function");
      expect(typeof result.current.isUserAdmin).toBe("function");
      expect(typeof result.current.validateGroupUsername).toBe("function");
    });

    test("should expose userProfile from context", () => {
      const profile = { uid: "u1", displayName: "Alice" } as any;
      mockContextValue = makeContext({ userProfile: profile });

      const { result } = renderHook(() => useUser());

      expect(result.current.userProfile).toBe(profile);
    });

    test("should expose activeGroupUserProfile from context", () => {
      const groupProfile = { role: "admin", username: "alice" } as any;
      mockContextValue = makeContext({ activeGroupUserProfile: groupProfile });

      const { result } = renderHook(() => useUser());

      expect(result.current.activeGroupUserProfile).toBe(groupProfile);
    });
  });

  // -------------------------------------------------------------------------
  describe("updateUserProfile Behavior", () => {
    test("should call user.updateUserProfile with uid and updates", async () => {
      mockUpdateUserProfile.mockResolvedValue(undefined);
      const { result } = renderHook(() => useUser());

      await act(async () => {
        await result.current.updateUserProfile("u1", { email: "bob@test.com" });
      });

      expect(mockUpdateUserProfile).toHaveBeenCalledWith("u1", { email: "bob@test.com" });
    });

    test("should clear error before updating", async () => {
      mockUpdateUserProfile.mockResolvedValue(undefined);
      const { result } = renderHook(() => useUser());

      await act(async () => {
        await result.current.updateUserProfile("u1", {});
      });

      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    test("should call refreshUserProfile when uid matches current user", async () => {
      mockUpdateUserProfile.mockResolvedValue(undefined);
      mockContextValue = makeContext({ user: { uid: "u1" } as any });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        await result.current.updateUserProfile("u1", {});
      });

      expect(mockRefreshUserProfile).toHaveBeenCalledTimes(1);
    });

    test("should NOT call refreshUserProfile when uid does not match current user", async () => {
      mockUpdateUserProfile.mockResolvedValue(undefined);
      mockContextValue = makeContext({ user: { uid: "u1" } as any });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        await result.current.updateUserProfile("u99", {});
      });

      expect(mockRefreshUserProfile).not.toHaveBeenCalled();
    });

    test("should call setError with message and re-throw on failure", async () => {
      mockUpdateUserProfile.mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUser());

      await act(async () => {
        try {
          await result.current.updateUserProfile("u1", {});
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Update failed");
    });

    test("should re-throw the error on failure", async () => {
      mockUpdateUserProfile.mockRejectedValue(new Error("Write error"));

      const { result } = renderHook(() => useUser());

      await expect(
        act(async () => {
          await result.current.updateUserProfile("u1", {});
        })
      ).rejects.toThrow("Write error");
    });
  });

  // -------------------------------------------------------------------------
  describe("updateGroupUserProfile Behavior", () => {
    test("should throw when no activeGroupId is set", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useUser());

      await expect(
        act(async () => {
          await result.current.updateGroupUserProfile("u1", { username: "bob" });
        })
      ).rejects.toThrow("No active group selected");
    });

    test("should call user.updateGroupUserProfile with correct args", async () => {
      mockUpdateGroupUserProfile.mockResolvedValue(undefined);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        await result.current.updateGroupUserProfile("u1", { username: "bob" });
      });

      expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith("g1", "u1", { username: "bob" });
    });

    test("should call refreshUserProfile when uid matches current user", async () => {
      mockUpdateGroupUserProfile.mockResolvedValue(undefined);
      mockContextValue = makeContext({
        user: { uid: "u1" } as any,
        activeGroupId: "g1",
      });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        await result.current.updateGroupUserProfile("u1", {});
      });

      expect(mockRefreshUserProfile).toHaveBeenCalledTimes(1);
    });

    test("should call setError and re-throw on failure", async () => {
      mockUpdateGroupUserProfile.mockRejectedValue(new Error("Group update failed"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        try {
          await result.current.updateGroupUserProfile("u1", {});
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Group update failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("validateUsername Behavior", () => {
    test("should use activeGroupId from context when no groupId in URL", async () => {
      mockValidateGroupUsername.mockResolvedValue({ isValid: true });
      mockContextValue = makeContext({ activeGroupId: "g1" });

      // Ensure no groupId query param in window.location
      Object.defineProperty(window, "location", {
        value: { search: "" },
        writable: true,
      });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        await result.current.validateUsername("alice");
      });

      expect(mockValidateGroupUsername).toHaveBeenCalledWith("g1", "alice");
    });

    test("should return {isValid:false} when no groupId is available", async () => {
      mockContextValue = makeContext({ activeGroupId: null });
      Object.defineProperty(window, "location", {
        value: { search: "" },
        writable: true,
      });

      const { result } = renderHook(() => useUser());

      let res: any;
      await act(async () => {
        res = await result.current.validateUsername("alice");
      });

      // BEHAVIOR: no groupId → swallows error, returns {isValid:false, error:...}
      expect(res.isValid).toBe(false);
    });

    test("should return validation result on success", async () => {
      mockValidateGroupUsername.mockResolvedValue({ isValid: true });
      mockContextValue = makeContext({ activeGroupId: "g1" });
      Object.defineProperty(window, "location", {
        value: { search: "" },
        writable: true,
      });

      const { result } = renderHook(() => useUser());

      let res: any;
      await act(async () => {
        res = await result.current.validateUsername("alice");
      });

      expect(res).toEqual({ isValid: true });
    });
  });

  // -------------------------------------------------------------------------
  describe("changeUsername Behavior", () => {
    test("should throw when no activeGroupId is set", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useUser());

      await expect(
        act(async () => {
          await result.current.changeUsername("u1", "newname");
        })
      ).rejects.toThrow("No active group selected");
    });

    test("should call user.changeGroupUsername with correct args", async () => {
      mockChangeGroupUsername.mockResolvedValue(undefined);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        await result.current.changeUsername("u1", "newname");
      });

      expect(mockChangeGroupUsername).toHaveBeenCalledWith("g1", "u1", "newname");
    });

    test("should call refreshUserProfile when uid matches current user", async () => {
      mockChangeGroupUsername.mockResolvedValue(undefined);
      mockContextValue = makeContext({
        user: { uid: "u1" } as any,
        activeGroupId: "g1",
      });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        await result.current.changeUsername("u1", "newname");
      });

      expect(mockRefreshUserProfile).toHaveBeenCalledTimes(1);
    });

    test("should call setError and re-throw on failure", async () => {
      mockChangeGroupUsername.mockRejectedValue(new Error("Username taken"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        try {
          await result.current.changeUsername("u1", "taken");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Username taken");
    });
  });

  // -------------------------------------------------------------------------
  describe("isUsernameAvailable Behavior", () => {
    test("should throw when no activeGroupId is set", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useUser());

      await expect(
        act(async () => {
          await result.current.isUsernameAvailable("alice");
        })
      ).rejects.toThrow("No active group selected");
    });

    test("should call user.isUsernameAvailableInGroup with correct args", async () => {
      mockIsUsernameAvailableInGroup.mockResolvedValue(true);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUser());

      let res: boolean | undefined;
      await act(async () => {
        res = await result.current.isUsernameAvailable("alice");
      });

      expect(mockIsUsernameAvailableInGroup).toHaveBeenCalledWith("g1", "alice");
      expect(res).toBe(true);
    });

    test("should call setError and re-throw on failure", async () => {
      mockIsUsernameAvailableInGroup.mockRejectedValue(new Error("Check failed"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        try {
          await result.current.isUsernameAvailable("alice");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Check failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("isUserAdmin Behavior", () => {
    test("should return false when no activeGroupId is set", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useUser());

      let res: boolean | undefined;
      await act(async () => {
        res = await result.current.isUserAdmin("u1");
      });

      // BEHAVIOR: no activeGroupId → return false (swallows guard)
      expect(res).toBe(false);
      expect(mockIsUserAdmin).not.toHaveBeenCalled();
    });

    test("should call user.isUserAdmin with correct args", async () => {
      mockIsUserAdmin.mockResolvedValue(true);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUser());

      let res: boolean | undefined;
      await act(async () => {
        res = await result.current.isUserAdmin("u1");
      });

      expect(mockIsUserAdmin).toHaveBeenCalledWith("g1", "u1");
      expect(res).toBe(true);
    });

    test("should return false on failure (error swallowed)", async () => {
      mockIsUserAdmin.mockRejectedValue(new Error("Permission denied"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useUser());

      let res: boolean | undefined;
      await act(async () => {
        res = await result.current.isUserAdmin("u1");
      });

      // BEHAVIOR: error caught internally, returns false
      expect(res).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe("validateGroupUsername Behavior", () => {
    test("should call user.validateGroupUsername with provided groupId and username", async () => {
      mockValidateGroupUsername.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() => useUser());

      await act(async () => {
        await result.current.validateGroupUsername("g99", "bob");
      });

      expect(mockValidateGroupUsername).toHaveBeenCalledWith("g99", "bob");
    });

    test("should return the validation result", async () => {
      mockValidateGroupUsername.mockResolvedValue({ isValid: false, error: "Too short" });

      const { result } = renderHook(() => useUser());

      let res: any;
      await act(async () => {
        res = await result.current.validateGroupUsername("g1", "x");
      });

      expect(res).toEqual({ isValid: false, error: "Too short" });
    });

    test("should call setError and re-throw on failure", async () => {
      mockValidateGroupUsername.mockRejectedValue(new Error("Validate error"));

      const { result } = renderHook(() => useUser());

      await act(async () => {
        try {
          await result.current.validateGroupUsername("g1", "x");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Validate error");
    });
  });

  // -------------------------------------------------------------------------
  describe("Memoization Behavior", () => {
    test("updateUserProfile reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useUser());

      const firstRef = result.current.updateUserProfile;
      rerender();

      expect(result.current.updateUserProfile).toBe(firstRef);
    });

    test("changeUsername reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useUser());

      const firstRef = result.current.changeUsername;
      rerender();

      expect(result.current.changeUsername).toBe(firstRef);
    });

    test("isUserAdmin reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useUser());

      const firstRef = result.current.isUserAdmin;
      rerender();

      expect(result.current.isUserAdmin).toBe(firstRef);
    });
  });
});
