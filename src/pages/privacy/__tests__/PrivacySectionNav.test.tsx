// src/pages/privacy/__tests__/PrivacySectionNav.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import PrivacySectionNav from "../PrivacySectionNav";
import { PRIVACY_SECTIONS } from "core/constants/privacy";
import { unnamedControlsIn } from "@/test-utils/accessible-names";
import { formAccentsIn } from "@/test-utils/accent-budget";

describe("PrivacySectionNav", () => {
  it("is a labelled landmark, so it can be skipped to and past", () => {
    render(<PrivacySectionNav />);
    expect(
      screen.getByRole("navigation", { name: /the full text/i })
    ).toBeInTheDocument();
  });

  it("links to every section, and to nothing else", () => {
    render(<PrivacySectionNav />);
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(PRIVACY_SECTIONS.map((s) => `#${s.id}`));
  });

  it("labels each link with the section's own heading text", () => {
    render(<PrivacySectionNav />);
    PRIVACY_SECTIONS.forEach((section) => {
      expect(
        screen.getByRole("link", { name: section.label })
      ).toBeInTheDocument();
    });
  });

  it("marks the active section for assistive technology", () => {
    render(<PrivacySectionNav activeId="entity-extraction" />);
    expect(
      screen.getByRole("link", { name: "Entity extraction" })
    ).toHaveAttribute("aria-current", "true");
  });

  it("marks nothing active when no section is given", () => {
    const { container } = render(<PrivacySectionNav />);
    expect(container.querySelector("[aria-current]")).toBeNull();
  });

  it("sticks on wide viewports without trapping narrow ones", () => {
    const { container } = render(<PrivacySectionNav />);
    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("lg:sticky");
    expect(nav?.className).not.toMatch(/(^|\s)sticky(\s|$)/);
  });
});

// ---------------------------------------------------------------------------
// A5 gates (PR 10.2).
// ---------------------------------------------------------------------------
describe("PrivacySectionNav — names and accents", () => {
  it("names every control", () => {
    const { container } = render(<PrivacySectionNav />);

    expect(container.querySelectorAll("a[href]").length).toBeGreaterThan(0);
    expect(unnamedControlsIn(container)).toEqual([]);
  });

  it("spends no accent: navigation is not an action on the record", () => {
    const { container } = render(<PrivacySectionNav />);

    // D90 settled the same question for the chapter rail: "you are here" is
    // carried by ground, ink and aria-current, never by the accent.
    expect(formAccentsIn(container)).toEqual([]);
  });
});
