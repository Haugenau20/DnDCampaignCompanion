import React from "react";
import { render, screen } from "@testing-library/react";
import HighlightedText from "../HighlightedText";

describe("HighlightedText", () => {
  it("wraps a literal match in <mark> with a theme-aware text color, not just a background", () => {
    // Tailwind preflight does not reset the UA's `mark { color: MarkText }`
    // (effectively black), and there is no `mark` rule anywhere in
    // src/styles/ or src/core/themes/css/ to override it. Black on the dark
    // theme's `background.accent` (#3B3B52) is roughly 2:1 contrast, far
    // below the 4.5:1 floor -- `text-primary` is the CSS-var-backed token
    // that fixes it in both themes.
    render(<HighlightedText text="Droop the goblin" query="droop" />);
    const mark = screen.getByText("Droop", { selector: "mark" });
    expect(mark.className).toContain("bg-accent");
    expect(mark.className).toContain("text-primary");
  });

  it("renders unmatched text plainly, with no mark at all", () => {
    render(<HighlightedText text="Droop the goblin" query="zzz" />);
    expect(screen.queryByText("Droop", { selector: "mark" })).not.toBeInTheDocument();
    expect(screen.getByText("Droop the goblin")).toBeInTheDocument();
  });
});
