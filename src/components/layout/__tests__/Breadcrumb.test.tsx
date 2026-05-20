// src/components/layout/__tests__/Breadcrumb.test.tsx
// Behavioral tests for Breadcrumb component.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Breadcrumb from "../Breadcrumb";

// ---------------------------------------------------------------------------
// Breadcrumb uses react-router-dom's <Link> — mock it.
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    [k: string]: unknown;
  }) => (
    <a href={typeof to === "string" ? to : "#"} {...rest}>
      {children}
    </a>
  ),
}));

describe("Breadcrumb", () => {
  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    test("should render a <nav> element with aria-label=Breadcrumb", () => {
      render(<Breadcrumb items={[]} />);
      expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
    });

    test("should render a home link to / by default", () => {
      render(<Breadcrumb items={[]} />);
      const homeLink = screen.getByRole("link", { name: /home/i });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute("href", "/");
    });

    test("should render nothing extra when items array is empty", () => {
      render(<Breadcrumb items={[]} />);
      // Only the home link should be present
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(1); // just the Home link
    });
  });

  // -------------------------------------------------------------------------
  // Items rendering
  // -------------------------------------------------------------------------
  describe("items", () => {
    test("should render each item label as text", () => {
      const items = [
        { label: "NPCs", href: "/npcs" },
        { label: "Gandalf" },
      ];
      render(<Breadcrumb items={items} />);
      expect(screen.getByText("NPCs")).toBeInTheDocument();
      expect(screen.getByText("Gandalf")).toBeInTheDocument();
    });

    test("should render non-last items as links with the provided href", () => {
      const items = [
        { label: "NPCs", href: "/npcs" },
        { label: "Gandalf" },
      ];
      render(<Breadcrumb items={items} />);
      const npcLink = screen.getByRole("link", { name: "NPCs" });
      expect(npcLink).toHaveAttribute("href", "/npcs");
    });

    test("should render the last item as text (not a link)", () => {
      const items = [
        { label: "NPCs", href: "/npcs" },
        { label: "Gandalf" },
      ];
      render(<Breadcrumb items={items} />);
      // Gandalf is last — should NOT be a link
      const links = screen.getAllByRole("link");
      const linkTexts = links.map((l) => l.textContent?.trim());
      expect(linkTexts).not.toContain("Gandalf");
    });

    test("should render the last item with aria-current=page", () => {
      const items = [{ label: "Quests", href: "/quests" }, { label: "Dragon Quest" }];
      render(<Breadcrumb items={items} />);
      const lastItem = screen.getByText("Dragon Quest");
      expect(lastItem.closest("[aria-current='page']") ?? lastItem).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    test("should fall back to # href when item href is omitted for non-last items", () => {
      const items = [
        { label: "Locations" }, // no href
        { label: "Castle" },
      ];
      render(<Breadcrumb items={items} />);
      const locLink = screen.getByRole("link", { name: "Locations" });
      expect(locLink).toHaveAttribute("href", "#");
    });

    test("should render a single item as the current page (no link)", () => {
      const items = [{ label: "Only Item" }];
      render(<Breadcrumb items={items} />);
      // The single item is last — should not be a link
      const links = screen.getAllByRole("link");
      const linkTexts = links.map((l) => l.textContent?.trim());
      expect(linkTexts).not.toContain("Only Item");
    });
  });

  // -------------------------------------------------------------------------
  // className passthrough
  // -------------------------------------------------------------------------
  describe("className prop", () => {
    test("should apply custom className to the nav element", () => {
      render(<Breadcrumb items={[]} className="my-breadcrumb" />);
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("my-breadcrumb");
    });
  });

  // -------------------------------------------------------------------------
  // Multiple items
  // -------------------------------------------------------------------------
  describe("multiple items", () => {
    test("should render all intermediate labels as links and last as text", () => {
      const items = [
        { label: "Story", href: "/story" },
        { label: "Chapter 1", href: "/story/chapter-1" },
        { label: "Section A" },
      ];
      render(<Breadcrumb items={items} />);

      expect(screen.getByRole("link", { name: "Story" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Chapter 1" })).toBeInTheDocument();

      const allLinkTexts = screen
        .getAllByRole("link")
        .map((l) => l.textContent?.trim());
      expect(allLinkTexts).not.toContain("Section A");
      expect(screen.getByText("Section A")).toBeInTheDocument();
    });
  });
});
