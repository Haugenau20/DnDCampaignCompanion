// src/features/user-management/admin/pages/__tests__/AdminGroupPage.test.tsx
import React from "react";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminGroupPage from "../AdminGroupPage";
import type { AdminOutletContext } from "../admin-outlet";
import type { GroupMember } from "../../types";

jest.mock("@/features/user-management/groups/hooks/useGroups", () => ({
  useGroups: jest.fn(),
}));

jest.mock("@/features/user-management/profiles/components/LeaveGroupDialog", () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="leave-group-dialog" /> : null,
}));

const { useGroups } = require("@/features/user-management/groups/hooks/useGroups");

const MEMBERS: GroupMember[] = [
  { id: "u1", username: "DungeonMaster", role: "admin" },
  { id: "u2", username: "Legolas", role: "member" },
];

const createGroup = jest.fn().mockResolvedValue("g2");
const updateGroup = jest.fn().mockResolvedValue(undefined);

function setup({ members = MEMBERS, createdBy = "u1" } = {}) {
  useGroups.mockReturnValue({
    groups: [
      {
        id: "group1",
        name: "The Fellowship",
        description: "A group bound by a common quest",
        createdAt: new Date("2025-05-31"),
        createdBy,
      },
    ],
    activeGroupId: "group1",
    activeGroup: { id: "group1", name: "The Fellowship" },
    createGroup,
    updateGroup,
  });

  const context: AdminOutletContext = {
    members,
    membersLoading: false,
    membersError: null,
    reloadMembers: jest.fn().mockResolvedValue(undefined),
  };

  return render(
    <MemoryRouter initialEntries={["/admin/group"]}>
      <Routes>
        <Route path="/admin" element={<OutletHost context={context} />}>
          <Route path="/admin/group" element={<AdminGroupPage />} />
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

describe("AdminGroupPage", () => {
  beforeEach(() => jest.clearAllMocks());

  test("names the group and its description", async () => {
    setup();
    await settle();
    expect(
      screen.getByRole("heading", { name: "The Fellowship" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("A group bound by a common quest")
    ).toBeInTheDocument();
  });

  // The whole argument of this phase in one assertion: a workspace that has to
  // explain its own tabs was in the wrong container.
  test("the note telling you to use two other tabs is gone", async () => {
    setup();
    await settle();
    expect(screen.queryByText(/Registration Tokens" tab/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/please use the "Users" tab/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bNote:/)).not.toBeInTheDocument();
  });

  describe("created by is history, not authority", () => {
    test("names the creator", async () => {
      setup();
      await settle();
      expect(screen.getByText("DungeonMaster")).toBeInTheDocument();
    });

    test("never calls them the owner, the admin, or the DM", async () => {
      setup();
      await settle();
      expect(screen.queryByText(/\bowner\b/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/\bthe admin\b/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/dungeon master/i)).not.toBeInTheDocument();
    });

    test("copes with a creator who has since left", async () => {
      setup({ createdBy: "someone-gone" });
      await settle();
      expect(
        screen.getByText(/no longer in the group/i)
      ).toBeInTheDocument();
    });
  });

  test("the group id is a value to copy, not a field to read", async () => {
    setup();
    await settle();
    expect(screen.getByText("group1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  // T036: `GroupService.updateGroup` exists now, backed by a rule that already
  // let a group admin update the group document. The test this replaced
  // pinned the control's absence "because nothing server-side can do it".
  describe("editing the group", () => {
    async function openEdit() {
      setup();
      await settle();
      await userEvent.click(screen.getByRole("button", { name: "Edit" }));
      return screen.findByRole("dialog");
    }

    test("opens on the group as it stands", async () => {
      const dialog = await openEdit();
      expect(within(dialog).getByLabelText(/^Name/)).toHaveValue("The Fellowship");
      expect(within(dialog).getByLabelText(/^Description/)).toHaveValue(
        "A group bound by a common quest"
      );
    });

    test("saves a new name and description, trimmed, and closes", async () => {
      const dialog = await openEdit();
      const name = within(dialog).getByLabelText(/^Name/);
      await userEvent.clear(name);
      await userEvent.type(name, "  The Company  ");
      const description = within(dialog).getByLabelText(/^Description/);
      await userEvent.clear(description);
      await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      await settle();
      expect(updateGroup).toHaveBeenCalledWith("The Company", "");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("will not save a blank name", async () => {
      const dialog = await openEdit();
      await userEvent.clear(within(dialog).getByLabelText(/^Name/));
      expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
    });

    test("keeps the dialog open and says why when the save fails", async () => {
      updateGroup.mockRejectedValueOnce(new Error("Only group admins can edit the group"));
      const dialog = await openEdit();
      await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      await settle();
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Only group admins can edit the group"
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    test("cancelling writes nothing", async () => {
      const dialog = await openEdit();
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(updateGroup).not.toHaveBeenCalled();
    });
  });

  describe("the way out", () => {
    test("leaving is the last thing on the page and names the group", async () => {
      setup();
      await settle();
      const danger = screen.getByRole("region", { name: "Leaving" });
      expect(
        within(danger).getByRole("button", { name: "Leave The Fellowship" })
      ).toBeInTheDocument();
    });

    test("leaving goes through a confirmation", async () => {
      setup({
        members: [...MEMBERS, { id: "u3", username: "Aragorn", role: "admin" }],
      });
      await settle();
      expect(screen.queryByTestId("leave-group-dialog")).not.toBeInTheDocument();
      await userEvent.click(
        screen.getByRole("button", { name: "Leave The Fellowship" })
      );
      expect(screen.getByTestId("leave-group-dialog")).toBeInTheDocument();
    });

    // T035: the server refuses the last admin's leaving while anyone else is
    // in the group. The page says so before the click, and points at the way
    // out, rather than offering a button that fails.
    test("the only admin is sent to People to promote someone first", async () => {
      setup();
      await settle();
      const danger = screen.getByRole("region", { name: "Leaving" });
      expect(
        within(danger).getByRole("button", { name: "Leave The Fellowship" })
      ).toBeDisabled();
      expect(
        within(danger).getByRole("link", { name: "make another member an admin" })
      ).toHaveAttribute("href", "/admin/people");
    });

    test("the only admin may still leave a group nobody else is in", async () => {
      setup({ members: [MEMBERS[0]] });
      await settle();
      const danger = screen.getByRole("region", { name: "Leaving" });
      expect(
        within(danger).getByRole("button", { name: "Leave The Fellowship" })
      ).toBeEnabled();
      expect(within(danger).queryByRole("link")).not.toBeInTheDocument();
    });

    test("an admin with another admin beside them may leave", async () => {
      setup({
        members: [...MEMBERS, { id: "u3", username: "Aragorn", role: "admin" }],
      });
      await settle();
      expect(
        screen.getByRole("button", { name: "Leave The Fellowship" })
      ).toBeEnabled();
    });

    // Deleting a group has no server implementation at all -- no service
    // method, no Cloud Function. Rendering the control would be a promise the
    // product cannot keep.
    test("offers no delete-group control", async () => {
      setup();
      await settle();
      expect(
        screen.queryByRole("button", { name: /delete group|delete the group/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("creating a different group", () => {
    test("is a plain action low on the page, not a primary in the header", async () => {
      setup();
      await settle();
      const action = screen.getByRole("button", {
        name: "Create a different group",
      });
      expect(action).toBeInTheDocument();
      // Not inside the group's own identity card, where it would invite the
      // wrong click.
      expect(
        within(screen.getByRole("region", { name: "The Fellowship" })).queryByRole(
          "button",
          { name: /create/i }
        )
      ).not.toBeInTheDocument();
    });

    test("says the current group is unaffected", async () => {
      setup();
      await settle();
      await userEvent.click(
        screen.getByRole("button", { name: "Create a different group" })
      );
      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent(/is unaffected/i);
    });

    test("creates the group", async () => {
      setup();
      await settle();
      await userEvent.click(
        screen.getByRole("button", { name: "Create a different group" })
      );
      const dialog = await screen.findByRole("dialog");
      await userEvent.type(within(dialog).getByLabelText(/^Name/), "The Second Party");
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Create group" })
      );
      await settle();
      expect(createGroup).toHaveBeenCalledWith("The Second Party", "");
    });
  });
});
