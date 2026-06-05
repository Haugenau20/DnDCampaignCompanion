// src/context/firebase/hooks/__tests__/useGroups.test.tsx

import { renderHook, act, waitFor } from "@testing-library/react";
import { useGroups } from "../useGroups";

/**
 * useGroups Behavioral Testing
 *
 * Tests the useGroups hook against a mocked useFirebaseContext and
 * firebaseServices. Validates:
 * - Returned API shape and derived state (activeGroup, isAdmin, loading)
 * - Success paths: CRUD calls forward correct arguments
 * - Error paths: errors surface via setError and are re-thrown
 * - Guard checks (activeGroupId, isAdmin required)
 * - Loading state derived from fullyLoaded effect
 * - Memoization: callbacks stable across re-renders
 */

// ---------------------------------------------------------------------------
// Mock firebaseServices
// ---------------------------------------------------------------------------
const mockCreateGroup = jest.fn();
const mockGetGroupUsers = jest.fn();
const mockRemoveUserFromGroup = jest.fn();
const mockUpdateUserProfile = jest.fn();
const mockGetCurrentUserId = jest.fn();
const mockJoinGroupWithToken = jest.fn();

jest.mock("@/services/firebase", () => ({
  __esModule: true,
  default: {
    group: {
      createGroup: (...args: any[]) => mockCreateGroup(...args),
      getGroupUsers: (...args: any[]) => mockGetGroupUsers(...args),
      removeUserFromGroup: (...args: any[]) => mockRemoveUserFromGroup(...args),
    },
    user: {
      updateUserProfile: (...args: any[]) => mockUpdateUserProfile(...args),
    },
    auth: {
      getCurrentUserId: () => mockGetCurrentUserId(),
    },
    invitation: {
      joinGroupWithToken: (...args: any[]) => mockJoinGroupWithToken(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock useFirebaseContext
// ---------------------------------------------------------------------------
const mockSetError = jest.fn();
const mockRefreshGroups = jest.fn();

let mockContextValue: any = {};

jest.mock("@/features/user-management/auth/context/FirebaseContext", () => ({
  useFirebaseContext: () => mockContextValue,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeGroup(id: string, name: string = `Group ${id}`) {
  return { id, name } as any;
}

function makeGroupUserProfile(role: string = "member") {
  return { role, username: "alice" } as any;
}

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
    refreshGroups: mockRefreshGroups,
    refreshCampaigns: jest.fn().mockResolvedValue([]),
    refreshUserProfile: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("useGroups Behavioral Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshGroups.mockResolvedValue([]);
    mockContextValue = makeContext();
  });

  // -------------------------------------------------------------------------
  describe("Initialization / Shape", () => {
    test("should expose all required API members", () => {
      const { result } = renderHook(() => useGroups());

      expect(typeof result.current.user).toBe("object");
      expect(Array.isArray(result.current.groups)).toBe(true);
      expect(typeof result.current.activeGroupId).toBe("object");
      expect(typeof result.current.activeGroup).toBe("object"); // null
      expect(typeof result.current.activeGroupUserProfile).toBe("object");
      expect(typeof result.current.createGroup).toBe("function");
      expect(typeof result.current.setActiveGroup).toBe("function");
      expect(typeof result.current.switchGroup).toBe("function");
      expect(typeof result.current.joinGroupWithToken).toBe("function");
      expect(typeof result.current.refreshGroups).toBe("function");
      expect(typeof result.current.getAllUsers).toBe("function");
      expect(typeof result.current.removeUser).toBe("function");
      expect(typeof result.current.deleteUser).toBe("function");
      expect(typeof result.current.isAdmin).toBe("boolean");
      expect(typeof result.current.loading).toBe("boolean");
    });

    test("setActiveGroup and switchGroup should be the same function reference", () => {
      const { result } = renderHook(() => useGroups());

      expect(result.current.setActiveGroup).toBe(result.current.switchGroup);
    });
  });

  // -------------------------------------------------------------------------
  describe("activeGroup Derived State", () => {
    test("should return null when groups array is empty", () => {
      mockContextValue = makeContext({ groups: [], activeGroupId: "g1" });

      const { result } = renderHook(() => useGroups());

      expect(result.current.activeGroup).toBeNull();
    });

    test("should return null when activeGroupId is null", () => {
      mockContextValue = makeContext({ groups: [makeGroup("g1")], activeGroupId: null });

      const { result } = renderHook(() => useGroups());

      expect(result.current.activeGroup).toBeNull();
    });

    test("should return the matching group object", () => {
      const groups = [makeGroup("g1"), makeGroup("g2")];
      mockContextValue = makeContext({ groups, activeGroupId: "g2" });

      const { result } = renderHook(() => useGroups());

      expect(result.current.activeGroup).toEqual(groups[1]);
    });

    test("should return null when activeGroupId does not match any group", () => {
      mockContextValue = makeContext({
        groups: [makeGroup("g1")],
        activeGroupId: "g99",
      });

      const { result } = renderHook(() => useGroups());

      expect(result.current.activeGroup).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe("isAdmin Derived State", () => {
    test("should be false when activeGroupUserProfile is null", () => {
      mockContextValue = makeContext({ activeGroupUserProfile: null });

      const { result } = renderHook(() => useGroups());

      expect(result.current.isAdmin).toBe(false);
    });

    test("should be true when activeGroupUserProfile.role is 'admin'", () => {
      mockContextValue = makeContext({
        activeGroupUserProfile: makeGroupUserProfile("admin"),
      });

      const { result } = renderHook(() => useGroups());

      expect(result.current.isAdmin).toBe(true);
    });

    test("should be false when activeGroupUserProfile.role is 'member'", () => {
      mockContextValue = makeContext({
        activeGroupUserProfile: makeGroupUserProfile("member"),
      });

      const { result } = renderHook(() => useGroups());

      expect(result.current.isAdmin).toBe(false);
    });

    test("should be true when role is 'ADMIN' (case-insensitive)", () => {
      mockContextValue = makeContext({
        activeGroupUserProfile: makeGroupUserProfile("ADMIN"),
      });

      const { result } = renderHook(() => useGroups());

      expect(result.current.isAdmin).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe("loading Derived State", () => {
    test("should be true initially when user is null and groups is empty", () => {
      mockContextValue = makeContext({ user: null, groups: [] });

      const { result } = renderHook(() => useGroups());

      // loading = !fullyLoaded; fullyLoaded requires user + (groups > 0 || activeGroupUserProfile)
      expect(result.current.loading).toBe(true);
    });

    // BUG #701: loading never becomes false for an authenticated user with no groups.
    // The useEffect condition uses `groups.length > 0` which is false for empty array,
    // contradicting the comment "even if empty array". New users who haven't joined
    // any group will see loading=true indefinitely.
    test("should become false when user is authenticated but has no groups (post-load) — skipped due to bug #701", async () => {
      // Expected: after Firebase confirms the user has 0 groups, loading should resolve to false
      // Actual: loading stays true forever because groups.length > 0 is never satisfied
      mockContextValue = makeContext({
        user: { uid: "u1" } as any,
        groups: [],  // empty array — groups have been fetched, just none exist
        activeGroupUserProfile: null,
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 1000 });
    });

    test("should become false when user is set and groups array is non-empty", async () => {
      mockContextValue = makeContext({
        user: { uid: "u1" } as any,
        groups: [makeGroup("g1")],
        activeGroupUserProfile: null,
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    test("should become false when user is set and activeGroupUserProfile is non-null", async () => {
      mockContextValue = makeContext({
        user: { uid: "u1" } as any,
        groups: [],
        activeGroupUserProfile: makeGroupUserProfile("member"),
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("createGroup Behavior", () => {
    test("should call group.createGroup with name and description", async () => {
      mockCreateGroup.mockResolvedValue("g1");

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.createGroup("My Group", "A description");
      });

      expect(mockCreateGroup).toHaveBeenCalledWith("My Group", "A description");
    });

    test("should call refreshGroups after successful creation", async () => {
      mockCreateGroup.mockResolvedValue("g1");

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.createGroup("My Group");
      });

      expect(mockRefreshGroups).toHaveBeenCalledTimes(1);
    });

    test("should return the new group ID", async () => {
      mockCreateGroup.mockResolvedValue("new-group-id");

      const { result } = renderHook(() => useGroups());

      let id: string | undefined;
      await act(async () => {
        id = await result.current.createGroup("Camp");
      });

      expect(id).toBe("new-group-id");
    });

    test("should call setError and re-throw on failure", async () => {
      mockCreateGroup.mockRejectedValue(new Error("Creation failed"));

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.createGroup("Fail Group");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Creation failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("switchGroup / setActiveGroup Behavior", () => {
    test("should call user.updateUserProfile with activeGroupId update", async () => {
      mockGetCurrentUserId.mockReturnValue("u1");
      mockUpdateUserProfile.mockResolvedValue(undefined);
      mockContextValue = makeContext({ user: { uid: "u1" } as any });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.switchGroup("g2");
      });

      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        expect.any(String),
        { activeGroupId: "g2" }
      );
    });

    test("should call refreshGroups after switching", async () => {
      mockUpdateUserProfile.mockResolvedValue(undefined);
      mockContextValue = makeContext({ user: { uid: "u1" } as any });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.switchGroup("g2");
      });

      expect(mockRefreshGroups).toHaveBeenCalledTimes(1);
    });

    test("should call setError and re-throw on failure", async () => {
      mockUpdateUserProfile.mockRejectedValue(new Error("Switch failed"));

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.switchGroup("g2");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Switch failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("joinGroupWithToken Behavior", () => {
    test("should call invitation.joinGroupWithToken with token and username", async () => {
      mockJoinGroupWithToken.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.joinGroupWithToken("token123", "alice");
      });

      expect(mockJoinGroupWithToken).toHaveBeenCalledWith("token123", "alice");
    });

    test("should call refreshGroups after joining", async () => {
      mockJoinGroupWithToken.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.joinGroupWithToken("tok", "bob");
      });

      expect(mockRefreshGroups).toHaveBeenCalledTimes(1);
    });

    test("should call setError and re-throw on failure", async () => {
      mockJoinGroupWithToken.mockRejectedValue(new Error("Invalid token"));

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.joinGroupWithToken("bad-token", "user");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Invalid token");
    });
  });

  // -------------------------------------------------------------------------
  describe("getAllUsers Behavior", () => {
    test("should throw when no activeGroupId is set", async () => {
      mockContextValue = makeContext({
        activeGroupId: null,
        activeGroupUserProfile: makeGroupUserProfile("admin"),
      });

      const { result } = renderHook(() => useGroups());

      await expect(
        act(async () => {
          await result.current.getAllUsers();
        })
      ).rejects.toThrow("No active group selected");
    });

    test("should throw when user is not admin", async () => {
      mockContextValue = makeContext({
        activeGroupId: "g1",
        activeGroupUserProfile: makeGroupUserProfile("member"),
      });

      const { result } = renderHook(() => useGroups());

      await expect(
        act(async () => {
          await result.current.getAllUsers();
        })
      ).rejects.toThrow("Only admins can view user list");
    });

    test("should call group.getGroupUsers with activeGroupId when admin", async () => {
      const users = [{ uid: "u1" }, { uid: "u2" }];
      mockGetGroupUsers.mockResolvedValue(users);
      mockContextValue = makeContext({
        activeGroupId: "g1",
        activeGroupUserProfile: makeGroupUserProfile("admin"),
      });

      const { result } = renderHook(() => useGroups());

      let res: any;
      await act(async () => {
        res = await result.current.getAllUsers();
      });

      expect(mockGetGroupUsers).toHaveBeenCalledWith("g1");
      expect(res).toEqual(users);
    });

    test("should call setError and re-throw on failure", async () => {
      mockGetGroupUsers.mockRejectedValue(new Error("Fetch users failed"));
      mockContextValue = makeContext({
        activeGroupId: "g1",
        activeGroupUserProfile: makeGroupUserProfile("admin"),
      });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.getAllUsers();
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Fetch users failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("removeUser Behavior", () => {
    test("should throw when no activeGroupId is set", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useGroups());

      await expect(
        act(async () => {
          await result.current.removeUser("u1");
        })
      ).rejects.toThrow("No active group selected");
    });

    test("should call group.removeUserFromGroup with correct args", async () => {
      mockRemoveUserFromGroup.mockResolvedValue(undefined);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.removeUser("u1");
      });

      expect(mockRemoveUserFromGroup).toHaveBeenCalledWith("g1", "u1");
    });

    test("should call setError and re-throw on failure", async () => {
      mockRemoveUserFromGroup.mockRejectedValue(new Error("Remove failed"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.removeUser("u1");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Remove failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("deleteUser Behavior", () => {
    test("should delegate to group.removeUserFromGroup (same as removeUser)", async () => {
      mockRemoveUserFromGroup.mockResolvedValue(undefined);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.deleteUser("u1");
      });

      expect(mockRemoveUserFromGroup).toHaveBeenCalledWith("g1", "u1");
    });

    test("should throw when no activeGroupId is set", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useGroups());

      await expect(
        act(async () => {
          await result.current.deleteUser("u1");
        })
      ).rejects.toThrow("No active group selected");
    });
  });

  // -------------------------------------------------------------------------
  describe("Non-Error throw paths — ternary fallback strings (lines 121, 139, 155)", () => {
    // When a non-Error value is thrown (e.g., a string or plain object), the
    // ternary `err instanceof Error ? err.message : 'Failed...'` takes the
    // false branch. These tests cover that branch.

    test("createGroup: setError uses fallback string when a non-Error is thrown", async () => {
      mockCreateGroup.mockRejectedValue("string error not an Error object");

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.createGroup("Group");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Failed to create group");
    });

    test("switchGroup: setError uses fallback string when a non-Error is thrown", async () => {
      mockUpdateUserProfile.mockRejectedValue({ code: "UNAVAILABLE" });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.switchGroup("g1");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Failed to switch group");
    });

    test("joinGroupWithToken: setError uses fallback string when a non-Error is thrown", async () => {
      mockJoinGroupWithToken.mockRejectedValue(42);

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.joinGroupWithToken("tok", "user");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Failed to join group with token");
    });

    test("getAllUsers: setError uses fallback string when a non-Error is thrown (line 121)", async () => {
      mockGetGroupUsers.mockRejectedValue("server unavailable");
      mockContextValue = makeContext({
        activeGroupId: "g1",
        activeGroupUserProfile: makeGroupUserProfile("admin"),
      });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.getAllUsers();
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Failed to fetch users");
    });

    test("removeUser: setError uses fallback string when a non-Error is thrown (line 139)", async () => {
      mockRemoveUserFromGroup.mockRejectedValue({ status: 500 });
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.removeUser("u1");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Failed to remove user");
    });

    test("deleteUser: setError uses fallback string when a non-Error is thrown (line 155)", async () => {
      mockRemoveUserFromGroup.mockRejectedValue(null);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.deleteUser("u1");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Failed to delete user");
    });
  });

  // -------------------------------------------------------------------------
  describe("Loading state — Array.isArray branch (line 46)", () => {
    // The condition: user && (Array.isArray(groups) || activeGroupUserProfile)
    // Array.isArray(groups) is always true for the groups array state.
    // The right side of || (activeGroupUserProfile) is never evaluated because
    // Array.isArray short-circuits. This verifies the current behavior.
    test("should become fully loaded when user exists even without activeGroupUserProfile (Array.isArray short-circuit)", async () => {
      mockContextValue = makeContext({
        user: { uid: "u1" } as any,
        groups: [makeGroup("g1")],
        activeGroupUserProfile: null, // explicitly null - Array.isArray handles it
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    test("loading stays true when user is null even if groups array is non-empty", () => {
      mockContextValue = makeContext({
        user: null, // user=null means condition is false
        groups: [makeGroup("g1")],
        activeGroupUserProfile: null,
      });

      const { result } = renderHook(() => useGroups());

      // user is null → outer && is false → fullyLoaded stays false → loading=true
      expect(result.current.loading).toBe(true);
    });

    test("should become fully loaded when user is set and activeGroupUserProfile is set (even with empty groups)", async () => {
      // This test exercises the activeGroupUserProfile branch of the || in line 46.
      // When groups is an empty array, Array.isArray still returns true (short-circuit).
      // But activeGroupUserProfile being non-null still correctly triggers loading=false.
      mockContextValue = makeContext({
        user: { uid: "u1" } as any,
        groups: [],
        activeGroupUserProfile: makeGroupUserProfile("member"),
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("isAdmin — role property edge cases (line 38)", () => {
    test("should be false when activeGroupUserProfile.role is undefined", () => {
      mockContextValue = makeContext({
        activeGroupUserProfile: { role: undefined, username: "alice" } as any,
      });

      const { result } = renderHook(() => useGroups());

      expect(result.current.isAdmin).toBe(false);
    });

    test("should be false when activeGroupUserProfile.role is an empty string", () => {
      mockContextValue = makeContext({
        activeGroupUserProfile: makeGroupUserProfile(""),
      });

      const { result } = renderHook(() => useGroups());

      expect(result.current.isAdmin).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe("switchGroup — getCurrentUserId null fallback (line 75)", () => {
    test("should use empty string when getCurrentUserId returns null", async () => {
      // getCurrentUserId returns null → '' is used as userId for updateUserProfile
      mockGetCurrentUserId.mockReturnValue(null);
      mockUpdateUserProfile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        await result.current.switchGroup("g2");
      });

      expect(mockUpdateUserProfile).toHaveBeenCalledWith("", { activeGroupId: "g2" });
    });
  });

  // -------------------------------------------------------------------------
  describe("getAllUsers error path — setError called for guard errors", () => {
    test("getAllUsers: setError is called with 'No active group selected' message when thrown", async () => {
      mockContextValue = makeContext({
        activeGroupId: null,
        activeGroupUserProfile: makeGroupUserProfile("admin"),
      });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.getAllUsers();
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("No active group selected");
    });

    test("getAllUsers: setError is called with admin-check message when non-admin", async () => {
      mockContextValue = makeContext({
        activeGroupId: "g1",
        activeGroupUserProfile: makeGroupUserProfile("member"),
      });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.getAllUsers();
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Only admins can view user list");
    });
  });

  // -------------------------------------------------------------------------
  describe("removeUser error path — setError called for guard errors", () => {
    test("removeUser: setError is called with 'No active group selected' message when thrown", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.removeUser("u1");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("No active group selected");
    });
  });

  // -------------------------------------------------------------------------
  describe("deleteUser error path — setError called for guard errors", () => {
    test("deleteUser: setError is called with 'No active group selected' message when thrown", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useGroups());

      await act(async () => {
        try {
          await result.current.deleteUser("u1");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("No active group selected");
    });
  });

  // -------------------------------------------------------------------------
  describe("Memoization Behavior", () => {
    test("createGroup reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useGroups());

      const firstRef = result.current.createGroup;
      rerender();

      expect(result.current.createGroup).toBe(firstRef);
    });

    test("switchGroup reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useGroups());

      const firstRef = result.current.switchGroup;
      rerender();

      expect(result.current.switchGroup).toBe(firstRef);
    });

    test("getAllUsers reference should be stable across re-renders when isAdmin is stable", () => {
      mockContextValue = makeContext({
        activeGroupUserProfile: makeGroupUserProfile("admin"),
      });

      const { result, rerender } = renderHook(() => useGroups());

      const firstRef = result.current.getAllUsers;
      rerender();

      expect(result.current.getAllUsers).toBe(firstRef);
    });
  });
});
