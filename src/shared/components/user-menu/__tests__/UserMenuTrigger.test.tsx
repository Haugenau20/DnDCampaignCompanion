// src/shared/components/user-menu/__tests__/UserMenuTrigger.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import UserMenuTrigger from "../UserMenuTrigger";

const mockOnToggle = jest.fn();

jest.mock("@/features/user-management", () => ({
  useGroups: jest.fn(),
}));

const { useGroups } = require("@/features/user-management");

function setupMocks(activeGroupUserProfile: {
  username?: string;
  characters?: Array<{ id: string; name: string }>;
  activeCharacterId?: string | null;
} = {}) {
  useGroups.mockReturnValue({ activeGroupUserProfile });
}

describe("UserMenuTrigger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("names the posting-as character", () => {
    setupMocks({
      username: "playerOne",
      characters: [
        { id: "c1", name: "Elandra" },
        { id: "c2", name: "Boros" },
      ],
      activeCharacterId: "c2",
    });

    render(<UserMenuTrigger isOpen={false} onToggle={mockOnToggle} />);

    expect(screen.getByText("Boros")).toBeInTheDocument();
  });

  test("falls back to the username when no character is active", () => {
    setupMocks({
      username: "playerOne",
      characters: [{ id: "c1", name: "Elandra" }],
      activeCharacterId: null,
    });

    render(<UserMenuTrigger isOpen={false} onToggle={mockOnToggle} />);

    expect(screen.getByText("playerOne")).toBeInTheDocument();
    expect(screen.queryByText("Elandra")).not.toBeInTheDocument();
  });

  test("carries aria-haspopup and reflects aria-expanded", () => {
    setupMocks({ username: "playerOne", characters: [], activeCharacterId: null });

    const { rerender } = render(
      <UserMenuTrigger isOpen={false} onToggle={mockOnToggle} />
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");

    rerender(<UserMenuTrigger isOpen={true} onToggle={mockOnToggle} />);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  test("hides the account name below the nav breakpoint but never shrinks the avatar or chevron", () => {
    setupMocks({
      username: "playerOne",
      characters: [{ id: "c1", name: "Elandra" }],
      activeCharacterId: "c1",
    });

    render(<UserMenuTrigger isOpen={false} onToggle={mockOnToggle} />);

    const name = screen.getByText("Elandra");
    expect(name).toHaveClass("hidden", "nav:inline");

    const button = screen.getByRole("button");
    const avatar = button.querySelector("span.rounded-full");
    expect(avatar).toHaveClass("flex-shrink-0");

    const chevron = button.querySelector("svg.lucide-chevron-down");
    expect(chevron).toHaveClass("flex-shrink-0");
  });
});
