// src/shared/components/gated/__tests__/useSelectableCampaigns.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useSelectableCampaigns } from "../useSelectableCampaigns";

let mockGroups: Array<{ id: string; name: string }> = [];

jest.mock("features/user-management", () => ({
  useGroups: () => ({ groups: mockGroups }),
}));

const mockGetCampaigns = jest.fn();

jest.mock("core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: {
      getCampaigns: (groupId: string) => mockGetCampaigns(groupId),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGroups = [
    { id: "g-1", name: "The Fellowship" },
    { id: "g-2", name: "The Council" },
  ];
  mockGetCampaigns.mockImplementation((groupId: string) =>
    Promise.resolve(
      groupId === "g-1"
        ? [{ id: "c-1", name: "Phandelver" }]
        : [{ id: "c-2", name: "Curse of Strahd" }]
    )
  );
});

describe("useSelectableCampaigns", () => {
  it("fetches nothing until it is enabled", () => {
    renderHook(() => useSelectableCampaigns(false));
    expect(mockGetCampaigns).not.toHaveBeenCalled();
  });

  it("merges campaigns from every group the user belongs to", async () => {
    const { result } = renderHook(() => useSelectableCampaigns(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toEqual([
      {
        campaignId: "c-2",
        campaignName: "Curse of Strahd",
        groupId: "g-2",
        groupName: "The Council",
      },
      {
        campaignId: "c-1",
        campaignName: "Phandelver",
        groupId: "g-1",
        groupName: "The Fellowship",
      },
    ]);
  });

  it("asks each group exactly once", async () => {
    const { result } = renderHook(() => useSelectableCampaigns(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetCampaigns).toHaveBeenCalledTimes(2);
    expect(mockGetCampaigns).toHaveBeenCalledWith("g-1");
    expect(mockGetCampaigns).toHaveBeenCalledWith("g-2");
  });

  it("drops only the failing group's rows, not the whole list", async () => {
    // Same failure policy as useGroupSummaries: a row is decoration, and one
    // group's permissions problem must not blank a list the user can act on.
    mockGetCampaigns.mockImplementation((groupId: string) =>
      groupId === "g-1"
        ? Promise.reject(new Error("permission-denied"))
        : Promise.resolve([{ id: "c-2", name: "Curse of Strahd" }])
    );
    const { result } = renderHook(() => useSelectableCampaigns(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0].campaignId).toBe("c-2");
  });

  it("finishes loading with an empty list when the user has no groups", async () => {
    mockGroups = [];
    const { result } = renderHook(() => useSelectableCampaigns(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toEqual([]);
    expect(mockGetCampaigns).not.toHaveBeenCalled();
  });

  it("sorts by group, then by campaign", async () => {
    mockGroups = [{ id: "g-1", name: "The Fellowship" }];
    mockGetCampaigns.mockResolvedValue([
      { id: "c-b", name: "Zephyr" },
      { id: "c-a", name: "Avernus" },
    ]);
    const { result } = renderHook(() => useSelectableCampaigns(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options.map((o) => o.campaignName)).toEqual([
      "Avernus",
      "Zephyr",
    ]);
  });

  it("settles loading when disabled while a fetch is still in flight", async () => {
    // Reproduces the stuck-loading bug: GatedContent flips `enabled` to false
    // the moment the user picks a campaign, which can happen before the
    // group fetches resolve. `loading` must not be left stranded at `true`.
    let resolveFetch: (campaigns: Array<{ id: string; name: string }>) => void =
      () => {};
    const pending = new Promise<Array<{ id: string; name: string }>>(
      (resolve) => {
        resolveFetch = resolve;
      }
    );
    mockGetCampaigns.mockImplementation(() => pending);

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useSelectableCampaigns(enabled),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => expect(result.current.loading).toBe(true));

    rerender({ enabled: false });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Let the in-flight fetch resolve after the disable, so it doesn't leak
    // an unhandled rejection/act warning into a later test.
    resolveFetch([{ id: "c-1", name: "Phandelver" }]);
  });
});
