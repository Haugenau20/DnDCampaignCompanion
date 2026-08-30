// src/shared/components/contact/__tests__/CategoryChips.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryChips from "../CategoryChips";

describe("CategoryChips", () => {
  it("renders one chip per category", () => {
    render(<CategoryChips value={null} onChange={jest.fn()} />);

    expect(screen.getByRole("radio", { name: "Something is broken" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Feature idea" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "More smart detection" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Account or group" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Something else" })).toBeInTheDocument();
  });

  it("labels the group so a screen reader hears the question", () => {
    render(<CategoryChips value={null} onChange={jest.fn()} />);

    expect(
      screen.getByRole("radiogroup", { name: "What's this about?" })
    ).toBeInTheDocument();
  });

  it("marks only the selected chip as checked", () => {
    render(<CategoryChips value="feature" onChange={jest.fn()} />);

    expect(screen.getByRole("radio", { name: "Feature idea" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Something is broken" })
    ).not.toBeChecked();
  });

  it("checks nothing when no category is selected", () => {
    render(<CategoryChips value={null} onChange={jest.fn()} />);

    screen.getAllByRole("radio").forEach((chip) => {
      expect(chip).not.toBeChecked();
    });
  });

  it("reports the id of a clicked chip", async () => {
    const onChange = jest.fn();
    render(<CategoryChips value={null} onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "More smart detection" }));

    expect(onChange).toHaveBeenCalledWith("smart-detection");
  });

  it("does not report clicks while disabled", async () => {
    const onChange = jest.fn();
    render(<CategoryChips value={null} onChange={onChange} disabled />);

    await userEvent.click(screen.getByRole("radio", { name: "Feature idea" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps only the selected chip in the tab order", () => {
    render(<CategoryChips value="account" onChange={jest.fn()} />);

    expect(screen.getByRole("radio", { name: "Account or group" })).toHaveAttribute(
      "tabindex",
      "0"
    );
    expect(screen.getByRole("radio", { name: "Feature idea" })).toHaveAttribute(
      "tabindex",
      "-1"
    );
  });

  it("puts the first chip in the tab order when nothing is selected", () => {
    render(<CategoryChips value={null} onChange={jest.fn()} />);

    expect(
      screen.getByRole("radio", { name: "Something is broken" })
    ).toHaveAttribute("tabindex", "0");
  });
});
