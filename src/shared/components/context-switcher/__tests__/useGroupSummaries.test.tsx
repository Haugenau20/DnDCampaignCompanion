// src/shared/components/context-switcher/__tests__/useGroupSummaries.test.tsx

import { renderHook, waitFor } from "@testing-library/react";
import { useGroupSummaries } from "../useGroupSummaries";

const mockGetCampaigns = jest.fn();
const mockGetGroupUsers = jest.fn();
const mockGetCurrentUserId = jest.fn();

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    auth: { getCurrentUserId: () => mockGetCurrentUserId() },
    campaign: { getCampaigns: (...args: any[]) => mockGetCampaigns(...args) },
    group: { getGroupUsers: (...args: any[]) => mockGetGroupUsers(...args) },
  },
}));

describe("useGroupSummaries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockReturnValue("u1");
    mockGetCampaigns.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    mockGetGroupUsers.mockResolvedValue([
      { id: "u1", userId: "u1", role: "admin", joinedAt: "2026-04-02T00:00:00.000Z" },
      { id: "u2", userId: "u2", role: "member", joinedAt: "2026-04-03T00:00:00.000Z" },
      { id: "u3", userId: "u3", role: "member", joinedAt: "2026-04-04T00:00:00.000Z" },
    ]);
  });

  test("returns nothing until it is enabled", () => {
    const { result } = renderHook(() => useGroupSummaries(["g1"], false));

    expect(result.current).toEqual({});
    expect(mockGetCampaigns).not.toHaveBeenCalled();
  });

  test("describes a group by its campaigns, members and the caller's place in it", async () => {
    const { result } = renderHook(() => useGroupSummaries(["g1"], true));

    await waitFor(() => {
      expect(result.current.g1).toEqual({
        campaignCount: 2,
        memberCount: 3,
        isAdmin: true,
        joinedAt: "2026-04-02T00:00:00.000Z",
      });
    });
  });

  test("reports a non-admin caller as such", async () => {
    mockGetCurrentUserId.mockReturnValue("u2");

    const { result } = renderHook(() => useGroupSummaries(["g1"], true));

    await waitFor(() => {
      expect(result.current.g1?.isAdmin).toBe(false);
    });
  });

  test("omits a group whose lookup failed rather than failing the list", async () => {
    mockGetGroupUsers.mockRejectedValue(new Error("permission-denied"));

    const { result } = renderHook(() => useGroupSummaries(["g1"], true));

    await waitFor(() => {
      expect(mockGetGroupUsers).toHaveBeenCalled();
    });
    expect(result.current.g1).toBeUndefined();
  });
});
