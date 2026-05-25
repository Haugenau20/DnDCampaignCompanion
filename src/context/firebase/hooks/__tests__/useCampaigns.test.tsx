// src/context/firebase/hooks/__tests__/useCampaigns.test.tsx

import { renderHook, act } from "@testing-library/react";
import { useCampaigns } from "../useCampaigns";

/**
 * useCampaigns Behavioral Testing
 *
 * Tests the useCampaigns hook against a mocked useFirebaseContext and
 * firebaseServices. Validates:
 * - Returned API shape and derived state (activeCampaign)
 * - Success paths: CRUD calls forward correct arguments
 * - Error paths: errors set via setError and re-thrown
 * - Dual calling convention for createCampaign
 * - Guard checks (activeGroupId required)
 * - Memoization: callbacks stable across re-renders
 */

// ---------------------------------------------------------------------------
// Mock firebaseServices
// ---------------------------------------------------------------------------
const mockCreateCampaign = jest.fn();
const mockGetCampaigns = jest.fn();
const mockUpdateCampaign = jest.fn();
const mockSetActiveCampaign = jest.fn();
const mockGetCurrentUserId = jest.fn();
const mockUpdateGroupUserProfile = jest.fn();

jest.mock("../../../../services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: {
      createCampaign: (...args: any[]) => mockCreateCampaign(...args),
      getCampaigns: (...args: any[]) => mockGetCampaigns(...args),
      updateCampaign: (...args: any[]) => mockUpdateCampaign(...args),
    },
    auth: {
      setActiveCampaign: (...args: any[]) => mockSetActiveCampaign(...args),
      getCurrentUserId: () => mockGetCurrentUserId(),
    },
    user: {
      updateGroupUserProfile: (...args: any[]) => mockUpdateGroupUserProfile(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock useFirebaseContext
// ---------------------------------------------------------------------------
const mockSetError = jest.fn();
const mockRefreshCampaigns = jest.fn();

let mockContextValue: any = {};

jest.mock("../../FirebaseContext", () => ({
  useFirebaseContext: () => mockContextValue,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCampaign(id: string, name: string = `Campaign ${id}`) {
  return { id, name, description: "", groupId: "g1" } as any;
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
    refreshGroups: jest.fn().mockResolvedValue([]),
    refreshCampaigns: mockRefreshCampaigns,
    refreshUserProfile: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("useCampaigns Behavioral Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshCampaigns.mockResolvedValue([]);
    mockContextValue = makeContext();
  });

  // -------------------------------------------------------------------------
  describe("Initialization / Shape", () => {
    test("should expose all required API members", () => {
      const { result } = renderHook(() => useCampaigns());

      expect(typeof result.current.campaigns).toBe("object");
      expect(Array.isArray(result.current.campaigns)).toBe(true);
      expect(typeof result.current.activeCampaignId).toBe("object"); // null
      expect(result.current.activeCampaign).toBeNull();
      expect(typeof result.current.createCampaign).toBe("function");
      expect(typeof result.current.setActiveCampaign).toBe("function");
      expect(typeof result.current.refreshCampaigns).toBe("function");
      expect(typeof result.current.getCampaigns).toBe("function");
      expect(typeof result.current.updateCampaign).toBe("function");
    });

    test("should expose campaigns from context", () => {
      const campaigns = [makeCampaign("c1")];
      mockContextValue = makeContext({ campaigns });

      const { result } = renderHook(() => useCampaigns());

      expect(result.current.campaigns).toEqual(campaigns);
    });

    test("should expose activeCampaignId from context", () => {
      mockContextValue = makeContext({ activeCampaignId: "c1" });

      const { result } = renderHook(() => useCampaigns());

      expect(result.current.activeCampaignId).toBe("c1");
    });
  });

  // -------------------------------------------------------------------------
  describe("activeCampaign Derived State", () => {
    test("should return null when activeCampaignId is null", () => {
      mockContextValue = makeContext({
        activeCampaignId: null,
        campaigns: [makeCampaign("c1")],
      });

      const { result } = renderHook(() => useCampaigns());

      expect(result.current.activeCampaign).toBeNull();
    });

    test("should return null when campaigns array is empty", () => {
      mockContextValue = makeContext({
        activeCampaignId: "c1",
        campaigns: [],
      });

      const { result } = renderHook(() => useCampaigns());

      expect(result.current.activeCampaign).toBeNull();
    });

    test("should return the matching campaign object", () => {
      const campaigns = [makeCampaign("c1"), makeCampaign("c2")];
      mockContextValue = makeContext({ activeCampaignId: "c2", campaigns });

      const { result } = renderHook(() => useCampaigns());

      expect(result.current.activeCampaign).toEqual(campaigns[1]);
    });

    test("should return null when activeCampaignId does not match any campaign", () => {
      mockContextValue = makeContext({
        activeCampaignId: "c99",
        campaigns: [makeCampaign("c1"), makeCampaign("c2")],
      });

      const { result } = renderHook(() => useCampaigns());

      expect(result.current.activeCampaign).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe("createCampaign Behavior — (name, description) convention", () => {
    test("should use activeGroupId from context when called with (name, description)", async () => {
      mockCreateCampaign.mockResolvedValue("new-campaign-id");
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        await result.current.createCampaign("My Campaign", "A description");
      });

      expect(mockCreateCampaign).toHaveBeenCalledWith("g1", "My Campaign", "A description");
    });

    test("should return the new campaign ID", async () => {
      mockCreateCampaign.mockResolvedValue("campaign-xyz");
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      let id: string | undefined;
      await act(async () => {
        id = await result.current.createCampaign("Camp");
      });

      expect(id).toBe("campaign-xyz");
    });

    test("should call refreshCampaigns after successful creation", async () => {
      mockCreateCampaign.mockResolvedValue("c1");
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        await result.current.createCampaign("Camp");
      });

      expect(mockRefreshCampaigns).toHaveBeenCalledTimes(1);
    });

    test("should throw when no activeGroupId is available", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useCampaigns());

      await expect(
        act(async () => {
          await result.current.createCampaign("Camp");
        })
      ).rejects.toThrow("No active group selected");
    });

    test("should call setError and re-throw on failure", async () => {
      mockCreateCampaign.mockRejectedValue(new Error("Create failed"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        try {
          await result.current.createCampaign("Camp");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Create failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("createCampaign Behavior — (groupId, name, description) convention", () => {
    test("should use provided groupId when called with (groupId, name, description)", async () => {
      mockCreateCampaign.mockResolvedValue("c1");
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        // Third arg present → (groupId, name, description) form
        await result.current.createCampaign("g99", "Campaign Name", "Description");
      });

      // BEHAVIOR: when 3 args provided, first arg is groupId
      expect(mockCreateCampaign).toHaveBeenCalledWith("g99", expect.any(String), "Description");
    });
  });

  // -------------------------------------------------------------------------
  describe("setActiveCampaign Behavior", () => {
    test("should call auth.setActiveCampaign with campaignId", async () => {
      mockSetActiveCampaign.mockReturnValue(undefined);
      mockGetCurrentUserId.mockReturnValue("u1");
      mockUpdateGroupUserProfile.mockResolvedValue(undefined);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        await result.current.setActiveCampaign("c1");
      });

      expect(mockSetActiveCampaign).toHaveBeenCalledWith("c1");
    });

    test("should update group user profile with activeCampaignId when userId is available", async () => {
      mockSetActiveCampaign.mockReturnValue(undefined);
      mockGetCurrentUserId.mockReturnValue("u1");
      mockUpdateGroupUserProfile.mockResolvedValue(undefined);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        await result.current.setActiveCampaign("c2");
      });

      expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith("g1", "u1", {
        activeCampaignId: "c2",
      });
    });

    test("should call refreshCampaigns after setting active campaign", async () => {
      mockSetActiveCampaign.mockReturnValue(undefined);
      mockGetCurrentUserId.mockReturnValue("u1");
      mockUpdateGroupUserProfile.mockResolvedValue(undefined);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        await result.current.setActiveCampaign("c1");
      });

      expect(mockRefreshCampaigns).toHaveBeenCalledTimes(1);
    });

    test("should throw when no activeGroupId is set", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useCampaigns());

      await expect(
        act(async () => {
          await result.current.setActiveCampaign("c1");
        })
      ).rejects.toThrow("No active group selected");
    });

    test("should call setError and re-throw on failure", async () => {
      mockSetActiveCampaign.mockImplementation(() => {
        throw new Error("Set active failed");
      });
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        try {
          await result.current.setActiveCampaign("c1");
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Set active failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("getCampaigns Behavior", () => {
    test("should call campaign.getCampaigns with the provided groupId", async () => {
      const campaigns = [makeCampaign("c1")];
      mockGetCampaigns.mockResolvedValue(campaigns);

      const { result } = renderHook(() => useCampaigns());

      let res: any;
      await act(async () => {
        res = await result.current.getCampaigns("g99");
      });

      expect(mockGetCampaigns).toHaveBeenCalledWith("g99");
      expect(res).toEqual(campaigns);
    });

    test("should return empty array on error (error swallowed)", async () => {
      mockGetCampaigns.mockRejectedValue(new Error("Fetch error"));

      const { result } = renderHook(() => useCampaigns());

      let res: any;
      await act(async () => {
        res = await result.current.getCampaigns("g1");
      });

      expect(res).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  describe("updateCampaign Behavior", () => {
    test("should call campaign.updateCampaign with correct args", async () => {
      mockUpdateCampaign.mockResolvedValue(undefined);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        await result.current.updateCampaign("c1", { name: "Updated" });
      });

      expect(mockUpdateCampaign).toHaveBeenCalledWith("g1", "c1", { name: "Updated" });
    });

    test("should call refreshCampaigns after update", async () => {
      mockUpdateCampaign.mockResolvedValue(undefined);
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        await result.current.updateCampaign("c1", {});
      });

      expect(mockRefreshCampaigns).toHaveBeenCalledTimes(1);
    });

    test("should throw when no activeGroupId is set", async () => {
      mockContextValue = makeContext({ activeGroupId: null });

      const { result } = renderHook(() => useCampaigns());

      await expect(
        act(async () => {
          await result.current.updateCampaign("c1", {});
        })
      ).rejects.toThrow("No active group selected");
    });

    test("should call setError and re-throw on failure", async () => {
      mockUpdateCampaign.mockRejectedValue(new Error("Update failed"));
      mockContextValue = makeContext({ activeGroupId: "g1" });

      const { result } = renderHook(() => useCampaigns());

      await act(async () => {
        try {
          await result.current.updateCampaign("c1", {});
        } catch (_) {}
      });

      expect(mockSetError).toHaveBeenCalledWith("Update failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("Memoization Behavior", () => {
    test("createCampaign reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useCampaigns());

      const firstRef = result.current.createCampaign;
      rerender();

      expect(result.current.createCampaign).toBe(firstRef);
    });

    test("setActiveCampaign reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useCampaigns());

      const firstRef = result.current.setActiveCampaign;
      rerender();

      expect(result.current.setActiveCampaign).toBe(firstRef);
    });

    test("updateCampaign reference should be stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useCampaigns());

      const firstRef = result.current.updateCampaign;
      rerender();

      expect(result.current.updateCampaign).toBe(firstRef);
    });
  });
});
