// src/app/layout/__tests__/Navigation.test.tsx
// Behavioral tests for Navigation component.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navigation, { navItems } from "../Navigation";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();
const mockShouldHighlightPath = jest.fn();

jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require("shared/hooks/useNavigation");

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

      // One call per nav item. Each variant renders a single layout now, so the
      // count is no longer doubled.
      expect(shouldHighlight).toHaveBeenCalledTimes(navItems.length);
    });

    test("marks the active item with aria-current", () => {
      (useNavigation as jest.Mock).mockReturnValue({
        navigateToPage: mockNavigateToPage,
        shouldHighlightPath: (path: string) => path === "/story",
      });

      render(<Navigation />);

      expect(
        screen.getByRole("button", { name: /story/i })
      ).toHaveAttribute("aria-current", "page");
      expect(
        screen.getByRole("button", { name: /quests/i })
      ).not.toHaveAttribute("aria-current");
    });
  });

  // -------------------------------------------------------------------------
  // Variants — the inline variant is what removes the second nav row
  // -------------------------------------------------------------------------
  describe("variants", () => {
    test("renders each label once per variant, not twice in one render", () => {
      render(<Navigation variant="inline" />);
      // Both layouts used to render together and be hidden with breakpoint classes.
      expect(screen.getAllByText("Story")).toHaveLength(1);
    });

    test("defaults to the inline variant", () => {
      const { container } = render(<Navigation />);
      const nav = container.querySelector("nav")!;
      expect(nav.className).toContain("md:flex");
      expect(nav.className).not.toContain("navigation");
    });

    test("the inline variant is hidden below md, where it cannot fit the bar", () => {
      const { container } = render(<Navigation variant="inline" />);
      expect(container.querySelector("nav")!.className).toContain("hidden");
    });

    test("the mobile variant keeps its own strip and hides from md up", () => {
      const { container } = render(<Navigation variant="mobile" />);
      const nav = container.querySelector("nav")!;
      expect(nav.className).toContain("navigation");
      expect(nav.className).toContain("md:hidden");
    });

    test("both variants expose the same destinations", () => {
      const { unmount } = render(<Navigation variant="inline" />);
      const inline = navItems.map((i) => i.label);
      inline.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
      unmount();

      render(<Navigation variant="mobile" />);
      inline.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    test("includes Home as an explicit destination", () => {
      render(<Navigation />);
      // The logo was the only route home.
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    test("navigates to / from Home", async () => {
      const user = userEvent.setup();
      render(<Navigation />);
      await user.click(screen.getByRole("button", { name: /home/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/");
    });
  });

  // -------------------------------------------------------------------------
  // Bug #100: missing key prop on mapped nav items (both layouts)
  // -------------------------------------------------------------------------
  describe("list key warnings (bug #100)", () => {
    test("should not emit a React 'key' warning when rendering the desktop or mobile nav lists", () => {
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<Navigation />);

      const keyWarning = errorSpy.mock.calls.some((args) =>
        args.some(
          (arg) => typeof arg === "string" && arg.includes('unique "key" prop')
        )
      );
      expect(keyWarning).toBe(false);

      errorSpy.mockRestore();
    });
  });
});
