// src/shared/components/context-switcher/__tests__/useCampaignCounts.test.tsx

import { renderHook, waitFor } from "@testing-library/react";
import { useCampaignCounts } from "../useCampaignCounts";

const mockGetCampaignCounts = jest.fn();

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: {
      getCampaignCounts: (...args: any[]) => mockGetCampaignCounts(...args),
    },
  },
}));

describe("useCampaignCounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCampaignCounts.mockResolvedValue({ chapters: 12, npcs: 8 });
  });

  test("returns nothing until it is enabled", () => {
    const { result } = renderHook(() =>
      useCampaignCounts("g1", ["c1", "c2"], false)
    );

    expect(result.current).toEqual({});
    expect(mockGetCampaignCounts).not.toHaveBeenCalled();
  });

  test("counts each campaign once enabled", async () => {
    const { result } = renderHook(() =>
      useCampaignCounts("g1", ["c1", "c2"], true)
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        c1: { chapters: 12, npcs: 8 },
        c2: { chapters: 12, npcs: 8 },
      });
    });
    expect(mockGetCampaignCounts).toHaveBeenCalledWith("g1", "c1");
    expect(mockGetCampaignCounts).toHaveBeenCalledWith("g1", "c2");
  });

  test("omits a campaign whose count failed rather than failing the list", async () => {
    mockGetCampaignCounts
      .mockResolvedValueOnce({ chapters: 12, npcs: 8 })
      .mockRejectedValueOnce(new Error("permission-denied"));

    const { result } = renderHook(() =>
      useCampaignCounts("g1", ["c1", "c2"], true)
    );

    await waitFor(() => {
      expect(result.current.c1).toEqual({ chapters: 12, npcs: 8 });
    });
    // The row shows its name and no second line. Decoration must never break
    // the list it decorates.
    expect(result.current.c2).toBeUndefined();
  });

  test("does nothing without a group", () => {
    renderHook(() => useCampaignCounts(null, ["c1"], true));
    expect(mockGetCampaignCounts).not.toHaveBeenCalled();
  });
});
