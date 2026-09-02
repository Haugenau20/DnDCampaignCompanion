import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchTrigger from "../SearchTrigger";

describe("SearchTrigger", () => {
  it("announces the keyboard shortcut that opens the palette", () => {
    render(<SearchTrigger onOpen={jest.fn()} />);
    const button = screen.getByRole("button", { name: /search/i });
    expect(button).toHaveAttribute("aria-keyshortcuts", "Meta+K Control+K");
  });

  it("opens the palette when clicked", async () => {
    const onOpen = jest.fn();
    render(<SearchTrigger onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("never shrinks", () => {
    render(<SearchTrigger onOpen={jest.fn()} />);
    expect(screen.getByRole("button", { name: /search/i }).className).toContain("shrink-0");
  });
});
