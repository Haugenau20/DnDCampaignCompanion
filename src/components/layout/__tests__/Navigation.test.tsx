// src/components/layout/__tests__/Navigation.test.tsx
// Behavioral tests for Navigation component.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navigation from "../Navigation";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();
const mockShouldHighlightPath = jest.fn();

jest.mock("../../../hooks/useNavigation", () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require("../../../hooks/useNavigation");

function setupHook({
  activePath = "",
}: { activePath?: string } = {}) {
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    shouldHighlightPath: (path: string) => path === activePath,
  });
}

describe("Navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    test("should render a <nav> element", () => {
      render(<Navigation />);
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    test("should render all six navigation items", () => {
      render(<Navigation />);
      const navLabels = ["Story", "Quests", "Rumors", "NPCs", "Locations", "Notes"];
      navLabels.forEach((label) => {
        // each label appears twice (desktop + mobile layout)
        const matches = screen.getAllByText(label);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Navigation behavior
  // -------------------------------------------------------------------------
  describe("navigation behavior", () => {
    test("should call navigateToPage with /story when Story is clicked", async () => {
      const user = userEvent.setup();
      render(<Navigation />);

      // Click the first "Story" button (desktop layout)
      const storyBtns = screen.getAllByRole("button", { name: /story/i });
      await user.click(storyBtns[0]);

      expect(mockNavigateToPage).toHaveBeenCalledWith("/story");
    });

    test("should call navigateToPage with /quests when Quests is clicked", async () => {
      const user = userEvent.setup();
      render(<Navigation />);

      const questBtns = screen.getAllByRole("button", { name: /quests/i });
      await user.click(questBtns[0]);

      expect(mockNavigateToPage).toHaveBeenCalledWith("/quests");
    });

    test("should call navigateToPage with /npcs when NPCs is clicked", async () => {
      const user = userEvent.setup();
      render(<Navigation />);

      const npcBtns = screen.getAllByRole("button", { name: /npcs/i });
      await user.click(npcBtns[0]);

      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs");
    });

    test("should call navigateToPage with /locations when Locations is clicked", async () => {
      const user = userEvent.setup();
      render(<Navigation />);

      const locBtns = screen.getAllByRole("button", { name: /locations/i });
      await user.click(locBtns[0]);

      expect(mockNavigateToPage).toHaveBeenCalledWith("/locations");
    });

    test("should call navigateToPage with /rumors when Rumors is clicked", async () => {
      const user = userEvent.setup();
      render(<Navigation />);

      const rumorBtns = screen.getAllByRole("button", { name: /rumors/i });
      await user.click(rumorBtns[0]);

      expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors");
    });

    test("should call navigateToPage with /notes when Notes is clicked", async () => {
      const user = userEvent.setup();
      render(<Navigation />);

      const notesBtns = screen.getAllByRole("button", { name: /notes/i });
      await user.click(notesBtns[0]);

      expect(mockNavigateToPage).toHaveBeenCalledWith("/notes");
    });
  });

  // -------------------------------------------------------------------------
  // Active state
  // -------------------------------------------------------------------------
  describe("active state", () => {
    test("should mark the active path item with navigation-item-active class", () => {
      setupHook({ activePath: "/npcs" });
      render(<Navigation />);

      // The button for NPCs should carry the active class
      const npcBtns = screen.getAllByRole("button", { name: /npcs/i });
      // At least one button should have the active class
      const activeBtn = npcBtns.find((b) =>
        b.classList.contains("navigation-item-active")
      );
      expect(activeBtn).toBeDefined();
    });

    test("should mark inactive paths with navigation-item class, not navigation-item-active", () => {
      setupHook({ activePath: "/npcs" });
      render(<Navigation />);

      // Story buttons should NOT be active
      const storyBtns = screen.getAllByRole("button", { name: /story/i });
      const anyActive = storyBtns.some((b) =>
        b.classList.contains("navigation-item-active")
      );
      expect(anyActive).toBe(false);
    });

    test("should call shouldHighlightPath for each nav item", () => {
      const shouldHighlight = jest.fn().mockReturnValue(false);
      (useNavigation as jest.Mock).mockReturnValue({
        navigateToPage: mockNavigateToPage,
        shouldHighlightPath: shouldHighlight,
      });

      render(<Navigation />);

      // 6 nav items × 2 layouts = 12 calls
      expect(shouldHighlight).toHaveBeenCalledTimes(12);
    });
  });

  // -------------------------------------------------------------------------
  // Both desktop and mobile layouts
  // -------------------------------------------------------------------------
  describe("dual layout (desktop + mobile)", () => {
    test("should render each nav label at least twice (one per layout)", () => {
      render(<Navigation />);
      // Each label appears in both the desktop hidden-md:flex section and the md:hidden section
      const storyItems = screen.getAllByText("Story");
      expect(storyItems.length).toBeGreaterThanOrEqual(2);
    });
  });
});
