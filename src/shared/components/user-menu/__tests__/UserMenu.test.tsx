// src/shared/components/user-menu/__tests__/UserMenu.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserMenu from "../UserMenu";

jest.mock("@/features/user-management", () => ({
  useGroups: jest.fn(),
}));

const { useGroups } = require("@/features/user-management");

// The trigger, the rows and the keyboard contract are each covered by their
// own suite (UserMenuTrigger, PostingAsList, ThemeSegmented, UserMenuLinks,
// usePopoverKeys). This suite only needs to prove the shell around them --
// open/close and focus management -- so the rows are stubbed down to the
// one thing usePopoverKeys cares about: being `[role="menuitem"]`.
jest.mock("../UserMenuTrigger", () => ({
  __esModule: true,
  default: React.forwardRef(function MockTrigger(
    { isOpen, onToggle }: { isOpen: boolean; onToggle: () => void },
    ref: React.Ref<HTMLButtonElement>
  ) {
    return (
      <button ref={ref} onClick={onToggle} aria-haspopup="menu" aria-expanded={isOpen}>
        Trigger
      </button>
    );
  }),
}));

jest.mock("../PostingAsList", () => ({
  __esModule: true,
  default: () => <button role="menuitem">Row A</button>,
}));

jest.mock("../ThemeSegmented", () => ({
  __esModule: true,
  default: () => <button role="menuitem">Row B</button>,
}));

jest.mock("../UserMenuLinks", () => ({
  __esModule: true,
  default: () => <button role="menuitem">Row C</button>,
}));

function setupMocks() {
  useGroups.mockReturnValue({
    activeGroup: { name: "The Fellowship" },
    activeGroupUserProfile: { role: "member", username: "playerOne" },
  });
}

describe("UserMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  test("closes on click outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <UserMenu onOpenAdmin={jest.fn()} />
        <button>Outside</button>
      </div>
    );

    await user.click(screen.getByText("Trigger"));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByText("Outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<UserMenu onOpenAdmin={jest.fn()} />);

    await user.click(screen.getByText("Trigger"));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByText("Trigger")).toHaveFocus();
  });

  test("arrow keys move between rows", async () => {
    const user = userEvent.setup();
    render(<UserMenu onOpenAdmin={jest.fn()} />);

    await user.click(screen.getByText("Trigger"));

    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("Row B")).toHaveFocus();

    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("Row C")).toHaveFocus();
  });
});
