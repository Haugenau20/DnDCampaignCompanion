// src/features/user-management/admin/pages/__tests__/AdminCampaignsPage.test.tsx
import React from "react";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminCampaignsPage from "../AdminCampaignsPage";
import type { AdminOutletContext } from "../admin-outlet";

jest.mock("@/features/user-management/groups/hooks/useGroups", () => ({
  useGroups: jest.fn(),
}));

jest.mock("@/features/user-management/groups/hooks/useCampaigns", () => ({
  useCampaigns: jest.fn(),
}));

const { useGroups } = require("@/features/user-management/groups/hooks/useGroups");
const { useCampaigns } = require("@/features/user-management/groups/hooks/useCampaigns");

const CAMPAIGNS = [
  {
    id: "c1",
    groupId: "g1",
    name: "The Lord of the Rings",
    description: "A long walk to a volcano",
    createdAt: new Date("2025-05-31"),
    createdBy: "u1",
    isActive: true,
  },
  {
    id: "c2",
    groupId: "g1",
    name: "Curse of Strahd",
    description: "",
    createdAt: new Date("2025-04-01"),
    createdBy: "u1",
    isActive: false,
  },
];

const createCampaign = jest.fn().mockResolvedValue("c3");
const updateCampaign = jest.fn().mockResolvedValue(undefined);
const deleteCampaign = jest.fn().mockResolvedValue(undefined);
let getCampaigns = jest.fn();

function setup({ campaigns = CAMPAIGNS, activeCampaignId = "c1" } = {}) {
  getCampaigns = jest.fn().mockResolvedValue(campaigns);
  useGroups.mockReturnValue({
    activeGroupId: "g1",
    activeGroup: { id: "g1", name: "The Fellowship" },
  });
  useCampaigns.mockReturnValue({
    campaigns,
    activeCampaignId,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaigns,
  });
  const context: AdminOutletContext = {
    members: [{ id: "u1", username: "DungeonMaster", role: "admin" }],
    membersLoading: false,
    membersError: null,
    reloadMembers: jest.fn().mockResolvedValue(undefined),
  };

  return render(
    <MemoryRouter initialEntries={["/admin/campaigns"]}>
      <Routes>
        <Route path="/admin" element={<OutletHost context={context} />}>
          <Route path="/admin/campaigns" element={<AdminCampaignsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

const OutletHost: React.FC<{ context: AdminOutletContext }> = ({ context }) => {
  const { Outlet } = require("react-router-dom");
  return <Outlet context={context} />;
};

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

function list() {
  return within(screen.getByRole("region", { name: "Campaigns" })).getByRole("list");
}

describe("AdminCampaignsPage", () => {
  beforeEach(() => jest.clearAllMocks());

  test("lists campaigns as rows, newest first", async () => {
    setup();
    await settle();
    const rows = within(list()).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("The Lord of the Rings");
    expect(rows[1]).toHaveTextContent("Curse of Strahd");
  });

  // The one thing this view could not tell you before.
  test("marks the active campaign in words, not by colour alone", async () => {
    setup();
    await settle();
    const active = within(list())
      .getAllByRole("listitem")
      .find((row) => row.textContent?.includes("The Lord of the Rings"))!;
    expect(within(active).getByText("Current")).toBeInTheDocument();

    const other = within(list())
      .getAllByRole("listitem")
      .find((row) => row.textContent?.includes("Curse of Strahd"))!;
    expect(within(other).queryByText("Current")).not.toBeInTheDocument();
  });

  // Metadata, not authority -- and a uid is not metadata anybody can read.
  test("names the author rather than printing a uid", async () => {
    setup();
    await settle();
    const row = within(list())
      .getAllByRole("listitem")
      .find((r) => r.textContent?.includes("The Lord of the Rings"))!;
    expect(within(row).getByText("by DungeonMaster")).toBeInTheDocument();
    expect(row).not.toHaveTextContent("u1");
  });

  test("omits the author when they have left the group", async () => {
    setup({
      campaigns: [{ ...CAMPAIGNS[0], createdBy: "someone-gone" }],
    });
    await settle();
    expect(screen.queryByText(/^by /)).not.toBeInTheDocument();
  });

  test("searching filters the list", async () => {
    setup();
    await settle();
    await userEvent.type(screen.getByLabelText("Search campaigns"), "strahd");
    expect(within(list()).getAllByRole("listitem")).toHaveLength(1);
  });

  describe("the empty state", () => {
    test("reads as new rather than broken, and offers the next step", async () => {
      setup({ campaigns: [] });
      await settle();
      expect(screen.getByText(/has no campaigns yet/i)).toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: "New campaign" }).length
      ).toBeGreaterThan(0);
    });
  });

  describe("creating and renaming", () => {
    test("New campaign opens an empty form", async () => {
      setup();
      await settle();
      await userEvent.click(
        screen.getAllByRole("button", { name: "New campaign" })[0]
      );
      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent("New campaign");
      expect(within(dialog).getByLabelText(/^Name/)).toHaveValue("");
    });

    test("Edit opens the form already filled in", async () => {
      setup();
      await settle();
      const row = within(list())
        .getAllByRole("listitem")
        .find((r) => r.textContent?.includes("Curse of Strahd"))!;
      await userEvent.click(within(row).getByRole("button", { name: "Edit" }));

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByLabelText(/^Name/)).toHaveValue("Curse of Strahd");
    });

    test("saving an edit updates that campaign", async () => {
      setup();
      await settle();
      const row = within(list())
        .getAllByRole("listitem")
        .find((r) => r.textContent?.includes("Curse of Strahd"))!;
      await userEvent.click(within(row).getByRole("button", { name: "Edit" }));

      const dialog = await screen.findByRole("dialog");
      const field = within(dialog).getByLabelText(/^Name/);
      await userEvent.clear(field);
      await userEvent.type(field, "Curse of Strahd Reloaded");
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Save changes" })
      );
      await settle();

      expect(updateCampaign).toHaveBeenCalledWith("c2", {
        name: "Curse of Strahd Reloaded",
        description: "",
      });
    });
  });

  describe("deleting", () => {
    test("names the campaign and states the blast radius", async () => {
      setup();
      await settle();
      const row = within(list())
        .getAllByRole("listitem")
        .find((r) => r.textContent?.includes("Curse of Strahd"))!;
      await userEvent.click(within(row).getByRole("button", { name: "Delete" }));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent(/Curse of Strahd/);
      expect(dialog).toHaveTextContent(/NPCs, locations, quests, rumours/i);
      expect(dialog).toHaveTextContent(/every member's notes/i);
      expect(dialog).toHaveTextContent(/cannot be undone/i);
      expect(deleteCampaign).not.toHaveBeenCalled();
    });

    test("confirming deletes it", async () => {
      setup();
      await settle();
      const row = within(list())
        .getAllByRole("listitem")
        .find((r) => r.textContent?.includes("Curse of Strahd"))!;
      await userEvent.click(within(row).getByRole("button", { name: "Delete" }));
      const dialog = await screen.findByRole("dialog");
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Delete campaign" })
      );
      await settle();
      expect(deleteCampaign).toHaveBeenCalledWith("c2");
    });
  });
});
