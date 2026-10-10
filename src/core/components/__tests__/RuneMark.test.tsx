// src/core/components/__tests__/RuneMark.test.tsx
// The rune ᛗ decorates; it never speaks. Both forms are hidden from a screen
// reader, because each sits beside words that already say "Muninn".

import React from "react";
import { render, screen } from "@testing-library/react";
import { BrandMark, RuneMark, RUNE } from "../RuneMark";

describe("RuneMark", () => {
  test("draws ᛗ at the given size, hidden from a screen reader", () => {
    render(<RuneMark size={26} />);
    const glyph = screen.getByText("ᛗ");
    expect(RUNE).toBe("ᛗ");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(glyph).toHaveClass("rune-mark");
    expect(glyph).toHaveStyle({ fontSize: "26px" });
  });
});

describe("BrandMark", () => {
  // Painted by the theme's logo tokens, not by colours of its own: the tile
  // and the rune take `--logo-bg` and `--logo-on` through their classes.
  test("is the logo tile and the rune on it, silent to a screen reader", () => {
    render(<BrandMark />);
    const mark = screen.getByTestId("brand-mark");
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark).toHaveAttribute("width", "28");
    expect(mark.innerHTML).toContain('class="brand-mark-tile"');
    expect(mark.innerHTML).toContain('class="brand-mark-glyph"');
    expect(mark.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  test("takes another size", () => {
    render(<BrandMark size={24} />);
    expect(screen.getByTestId("brand-mark")).toHaveAttribute("height", "24");
  });
});
