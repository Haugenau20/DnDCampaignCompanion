// src/pages/profile/__tests__/ProfileSectionRail.test.tsx
import React from "react";
import { render, screen, within } from "@testing-library/react";
import ProfileSectionRail, { ProfileSection } from "../ProfileSectionRail";

const sections: ProfileSection[] = [
  { id: "account", label: "Account" },
  { id: "group", label: "The Fellowship" },
  { id: "characters", label: "Characters" },
  { id: "appearance", label: "Appearance" },
  { id: "danger", label: "Leaving and deleting", tone: "error" },
];

describe("ProfileSectionRail", () => {
  it("renders one anchor per section, linking to its id", () => {
    render(<ProfileSectionRail sections={sections} />);

    const nav = screen.getByRole("navigation", { name: /profile sections/i });
    const links = within(nav).getAllByRole("link");

    expect(links).toHaveLength(sections.length);
    sections.forEach((section) => {
      const link = within(nav).getByRole("link", { name: section.label });
      expect(link).toHaveAttribute("href", `#${section.id}`);
    });
  });

  it("marks the first section active before any observation has happened", () => {
    render(<ProfileSectionRail sections={sections} />);

    const nav = screen.getByRole("navigation", { name: /profile sections/i });
    const firstLink = within(nav).getByRole("link", { name: "Account" });
    const otherLinks = sections
      .slice(1)
      .map((section) => within(nav).getByRole("link", { name: section.label }));

    expect(firstLink).toHaveAttribute("aria-current", "page");
    otherLinks.forEach((link) => {
      expect(link).not.toHaveAttribute("aria-current");
    });
  });

  it("renders nothing harmful when IntersectionObserver is unavailable", () => {
    // jsdom does not implement IntersectionObserver at all, so this is
    // already the environment every other test in this file runs under.
    // This test makes that assumption explicit and asserts the component
    // does not throw and still falls back to the first section.
    expect(typeof (globalThis as any).IntersectionObserver).toBe("undefined");

    expect(() => render(<ProfileSectionRail sections={sections} />)).not.toThrow();

    const nav = screen.getByRole("navigation", { name: /profile sections/i });
    expect(within(nav).getByRole("link", { name: "Account" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
