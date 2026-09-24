// src/shared/components/user-menu/__tests__/UserMenuTrigger.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import UserMenuTrigger from "../UserMenuTrigger";
import { sigilIndexFor } from "@/core/utils/entity-sigil";

const mockOnToggle = jest.fn();

jest.mock("@/features/user-management", () => ({
  useGroups: jest.fn(),
}));

const { useGroups } = require("@/features/user-management");

function setupMocks(activeGroupUserProfile: {
  userId?: string;
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

  // The chip names the active character, so it wears that character's sigil:
  // the letter and the hue then describe the same identity, and switching who
  // you post as changes both, exactly as it changes the name beside them.
  test("wears the posting character's sigil, not a generic person icon", () => {
    setupMocks({
      userId: "user-1",
      username: "playerOne",
      characters: [
        { id: "c1", name: "Elandra" },
        { id: "c2", name: "Boros" },
      ],
      activeCharacterId: "c2",
    });

    render(<UserMenuTrigger isOpen={false} onToggle={mockOnToggle} />);

    const button = screen.getByRole("button");
    const sigil = button.querySelector('[data-testid="entity-sigil"]');
    expect(sigil).toHaveTextContent("B");
    expect(sigil).toHaveAttribute("data-sigil-index", String(sigilIndexFor("c2")));
    expect(button.querySelector("svg.lucide-user")).not.toBeInTheDocument();
  });

  test("with no character posting, the sigil is the account's own", () => {
    setupMocks({
      userId: "user-1",
      username: "playerOne",
      characters: [{ id: "c1", name: "Elandra" }],
      activeCharacterId: null,
    });

    render(<UserMenuTrigger isOpen={false} onToggle={mockOnToggle} />);

    const sigil = screen.getByRole("button").querySelector('[data-testid="entity-sigil"]');
    expect(sigil).toHaveTextContent("P");
    expect(sigil).toHaveAttribute("data-sigil-index", String(sigilIndexFor("user-1")));
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
    const avatar = button.querySelector('[data-testid="entity-sigil"]');
    expect(avatar).toHaveClass("shrink-0");

    const chevron = button.querySelector("svg.lucide-chevron-down");
    expect(chevron).toHaveClass("flex-shrink-0");
  });
});
