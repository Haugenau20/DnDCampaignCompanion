// src/features/user-management/admin/components/__tests__/DeleteGroupDialog.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteGroupDialog from "../DeleteGroupDialog";
import { unnamedControlsIn } from "@/test-utils/accessible-names";
import { dialogAccentsIn, formAccentsIn } from "@/test-utils/accent-budget";

const mockRefreshGroups = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

const { useNavigate } = require("react-router-dom");

jest.mock("@/features/user-management/groups/hooks/useGroups", () => ({
  useGroups: jest.fn(),
}));

const { useGroups } = require("@/features/user-management/groups/hooks/useGroups");

jest.mock("@/core/components/Dialog", () => {
  const Dialog = ({ open, onClose, title, children }: any) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="close dialog">X</button>
        {children}
      </div>
    );
  };
  return Dialog;
});

const mockDeleteGroup = jest.fn();

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    group: { deleteGroup: (...args: unknown[]) => mockDeleteGroup(...args) },
  },
}));

const mockGroup = { id: "group-1", name: "The Fellowship" };

const confirmButton = () => screen.getByRole("button", { name: /delete group/i });
const confirmInput = () => screen.getByLabelText(/type .* to confirm/i);

async function typeNameAndConfirm(name = mockGroup.name) {
  render(<DeleteGroupDialog open onClose={jest.fn()} />);
  await userEvent.type(confirmInput(), name);
  await userEvent.click(confirmButton());
}

describe("DeleteGroupDialog (T037)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGroups.mockReturnValue({ activeGroup: mockGroup, refreshGroups: mockRefreshGroups });
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockDeleteGroup.mockResolvedValue(undefined);
    mockRefreshGroups.mockResolvedValue([]);
  });

  test("asks about the group by name", () => {
    render(<DeleteGroupDialog open onClose={jest.fn()} />);
    expect(screen.getByRole("dialog", { name: "Delete “The Fellowship”?" })).toBeInTheDocument();
  });

  test("says it is for everyone, what goes, that accounts stay, and that it is final", () => {
    render(<DeleteGroupDialog open onClose={jest.fn()} />);
    const text = screen.getByRole("dialog").textContent ?? "";
    expect(text).toMatch(/every member/i);
    expect(text).toMatch(/campaign/i);
    expect(text).toMatch(/notes/i);
    expect(text).toMatch(/keep their accounts/i);
    expect(text).toMatch(/cannot be undone/i);
  });

  test("keeps the confirm button disabled until the group's name is typed", async () => {
    render(<DeleteGroupDialog open onClose={jest.fn()} />);
    expect(confirmButton()).toBeDisabled();

    await userEvent.type(confirmInput(), "The Fellow");
    expect(confirmButton()).toBeDisabled();

    await userEvent.type(confirmInput(), "ship");
    expect(confirmButton()).toBeEnabled();
  });

  test("accepts the name case-insensitively, ignoring surrounding spaces", async () => {
    render(<DeleteGroupDialog open onClose={jest.fn()} />);
    await userEvent.type(confirmInput(), "  the fellowship ");
    expect(confirmButton()).toBeEnabled();
  });

  test("deletes the active group, then refreshes the groups, then goes home", async () => {
    await typeNameAndConfirm();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(mockDeleteGroup).toHaveBeenCalledWith("group-1");
    const order = [mockDeleteGroup, mockRefreshGroups, mockNavigate]
      .map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test("stays open and says why when the deletion fails", async () => {
    mockDeleteGroup.mockRejectedValue(new Error("Only group admins can delete a group."));
    await typeNameAndConfirm();

    expect(await screen.findByText("Only group admins can delete a group.")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockRefreshGroups).not.toHaveBeenCalled();
    expect(confirmButton()).toBeEnabled();
  });

  test("names every control, and spends no filled accent on a delete", () => {
    const { container } = render(<DeleteGroupDialog open onClose={jest.fn()} />);

    // Paired with a positive assertion so an empty list cannot mean "this
    // rendered nothing at all" (R31).
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(unnamedControlsIn(container)).toEqual([]);
    expect(dialogAccentsIn(container)).toEqual([]);
    expect(formAccentsIn(container)).toEqual([]);
  });
});
