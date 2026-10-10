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
  test("is the mark file, with no name of its own", () => {
    render(<BrandMark />);
    const img = screen.getByRole("presentation", { hidden: true });
    expect(img).toHaveAttribute("src", "/mark.svg");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
    expect(img).toHaveAttribute("width", "28");
  });

  test("takes another size", () => {
    render(<BrandMark size={24} />);
    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute("height", "24");
  });
});
