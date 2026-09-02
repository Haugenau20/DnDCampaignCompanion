// src/features/user-management/profiles/hooks/__tests__/useGroupFootprint.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useGroupFootprint } from "../useGroupFootprint";

// ---------------------------------------------------------------------------
// Mock the domain barrel, then re-point the direct sibling import at it --
// same pattern as useAccountTheme.test.ts.
// ---------------------------------------------------------------------------
jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));

const { useAuth } = require("@/features/user-management");

// ---------------------------------------------------------------------------
// Mock firebaseServices directly -- not part of the user-management barrel.
// ---------------------------------------------------------------------------
const mockGetCampaigns = jest.fn();
const mockGetCampaignCounts = jest.fn();
const mockGetCollectionCount = jest.fn();

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: {
      getCampaigns: (...args: unknown[]) => mockGetCampaigns(...args),
      getCampaignCounts: (...args: unknown[]) => mockGetCampaignCounts(...args),
    },
    document: {
      getCollectionCount: (...args: unknown[]) => mockGetCollectionCount(...args),
    },
  },
}));

const mockUser = { uid: "user-1" };

describe("useGroupFootprint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });
  });

  test("counts campaigns, chapters across all campaigns, and the user's own notes", async () => {
    mockGetCampaigns.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    mockGetCampaignCounts.mockImplementation((_groupId: string, campaignId: string) =>
      Promise.resolve({ chapters: campaignId === "c1" ? 5 : 34, npcs: 0 })
    );
    mockGetCollectionCount.mockResolvedValue(14);

    const { result } = renderHook(() => useGroupFootprint("group-1"));

    await waitFor(() => {
      expect(result.current.campaigns).toBe(2);
      expect(result.current.chapters).toBe(39);
      expect(result.current.notes).toBe(14);
    });

    expect(mockGetCampaigns).toHaveBeenCalledWith("group-1");
    expect(mockGetCampaignCounts).toHaveBeenCalledWith("group-1", "c1");
    expect(mockGetCampaignCounts).toHaveBeenCalledWith("group-1", "c2");
    expect(mockGetCollectionCount).toHaveBeenCalledWith("groups/group-1/users/user-1/notes");
  });

  test("leaves a count null when its query rejects, and reports no error", async () => {
    mockGetCampaigns.mockResolvedValue([{ id: "c1" }]);
    mockGetCampaignCounts.mockRejectedValue(new Error("permission denied"));
    mockGetCollectionCount.mockRejectedValue(new Error("permission denied"));

    const { result } = renderHook(() => useGroupFootprint("group-1"));

    await waitFor(() => {
      expect(result.current.campaigns).toBe(1);
    });

    await waitFor(() => {
      expect(result.current.chapters).toBeNull();
      expect(result.current.notes).toBeNull();
    });

    expect(Object.keys(result.current).sort()).toEqual(["campaigns", "chapters", "notes"]);
  });

  test("does not fetch without a group", () => {
    renderHook(() => useGroupFootprint(null));

    expect(mockGetCampaigns).not.toHaveBeenCalled();
    expect(mockGetCampaignCounts).not.toHaveBeenCalled();
    expect(mockGetCollectionCount).not.toHaveBeenCalled();
  });
});
