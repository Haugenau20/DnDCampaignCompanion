// src/features/user-management/profiles/components/__tests__/AccountCard.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountCard from "../AccountCard";

const mockCompleteJoin = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useJoinGroupCompletion: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useJoinGroupCompletion", () => require("@/features/user-management"));

// AccountCard mounts JoinGroupDialog directly (a sibling import, per the
// domain's own-import rule) -- stub it the same way Header's suite does, so
// this suite only has to assert AccountCard opens/wires it, not that the
// dialog's own form behaves.
jest.mock("@/features/user-management/groups/components/JoinGroupDialog", () => ({
  __esModule: true,
  default: ({
    open,
    onSuccess,
  }: {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Join a Group">
        <button data-testid="trigger-join-success" onClick={onSuccess}>
          Join
        </button>
      </div>
    ) : null,
}));

const { useAuth, useGroups, useJoinGroupCompletion } = require("@/features/user-management");

function setupMocks(overrides: { groups?: Array<{ id: string; name: string }> } = {}) {
  useAuth.mockReturnValue({ user: { uid: "user-1", email: "test@test.com" } });
  useGroups.mockReturnValue({
    groups: overrides.groups ?? [{ id: "group-1", name: "Test Campaign" }],
  });
  useJoinGroupCompletion.mockReturnValue(mockCompleteJoin);
}

describe("AccountCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockCompleteJoin.mockResolvedValue(undefined);
  });

  test("displays the user's email", () => {
    render(<AccountCard />);
    expect(screen.getByText("test@test.com")).toBeInTheDocument();
  });

  test("shows the email with a 'used to sign in' note", () => {
    render(<AccountCard />);
    expect(screen.getByText("test@test.com")).toBeInTheDocument();
    expect(screen.getByText(/used to sign in/i)).toBeInTheDocument();
  });

  test("lists every group the user is in", () => {
    setupMocks({
      groups: [
        { id: "group-1", name: "Test Campaign" },
        { id: "group-2", name: "The Council of Elrond" },
      ],
    });
    render(<AccountCard />);
    expect(screen.getByText("Test Campaign, The Council of Elrond")).toBeInTheDocument();
  });

  test("'Join another' opens the join dialog", async () => {
    const user = userEvent.setup();
    render(<AccountCard />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /join another/i }));

    expect(screen.getByRole("dialog", { name: /join a group/i })).toBeInTheDocument();
  });

  test("a successful join goes through the shared completion hook", async () => {
    const user = userEvent.setup();
    render(<AccountCard />);

    await user.click(screen.getByRole("button", { name: /join another/i }));
    await user.click(screen.getByTestId("trigger-join-success"));

    expect(mockCompleteJoin).toHaveBeenCalled();
  });
});
