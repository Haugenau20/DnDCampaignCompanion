// src/core/components/__tests__/Chip.test.tsx
// Behavioral tests for the two chips (PR 8.2).
//
// Nine `selectable-item` ternaries across the entity forms each decided for
// themselves what a selected thing looks like, and fourteen `.tag` divs drew a
// removable one a second way. Two components, sharing paint, replace both.
//
// They are deliberately NOT one component with a `mode` prop: one toggles and
// one deletes, and a component that does both is two components wearing a coat.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectableChip, RemovableChip } from "../Chip";

describe("SelectableChip", () => {
  // -------------------------------------------------------------------------
  // Selection lives in the accessibility tree, not in a class name
  //
  // 6.2 learned this the hard way: a test that pinned `aria-pressed` rather
  // than a class is what caught the filter-pill regression (D51).
  // -------------------------------------------------------------------------
  describe("selection semantics", () => {
    test("should be a toggle button rather than a plain button", () => {
      render(<SelectableChip selected={false} onToggle={jest.fn()}>Gandalf</SelectableChip>);
      expect(screen.getByRole("button", { name: "Gandalf" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    test("should report itself as pressed when selected", () => {
      render(<SelectableChip selected onToggle={jest.fn()}>Gandalf</SelectableChip>);
      expect(screen.getByRole("button", { name: "Gandalf" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    // The query that matters: a caller can find the selected chips without
    // knowing a single thing about how they are painted.
    test("should let the selected chips be found by pressed state alone", () => {
      render(
        <>
          <SelectableChip selected onToggle={jest.fn()}>Gandalf</SelectableChip>
          <SelectableChip selected={false} onToggle={jest.fn()}>Frodo</SelectableChip>
          <SelectableChip selected onToggle={jest.fn()}>Aragorn</SelectableChip>
        </>
      );
      const pressed = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-pressed") === "true")
        .map((b) => b.textContent);
      expect(pressed).toEqual(["Gandalf", "Aragorn"]);
    });
  });

  // -------------------------------------------------------------------------
  // Toggling
  // -------------------------------------------------------------------------
  describe("toggling", () => {
    test("should call onToggle when clicked", async () => {
      const user = userEvent.setup();
      const onToggle = jest.fn();
      render(<SelectableChip selected={false} onToggle={onToggle}>Gandalf</SelectableChip>);

      await user.click(screen.getByRole("button", { name: "Gandalf" }));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    test("should call onToggle when activated from the keyboard", async () => {
      const user = userEvent.setup();
      const onToggle = jest.fn();
      render(<SelectableChip selected={false} onToggle={onToggle}>Gandalf</SelectableChip>);

      await user.tab();
      expect(screen.getByRole("button", { name: "Gandalf" })).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    // These chips live inside forms. A <button> with no type submits its form,
    // which would save the record instead of picking a name.
    test("should never submit the form it sits in", () => {
      render(<SelectableChip selected={false} onToggle={jest.fn()}>Gandalf</SelectableChip>);
      expect(screen.getByRole("button", { name: "Gandalf" })).toHaveAttribute(
        "type",
        "button"
      );
    });

    test("should not fire onToggle when disabled", async () => {
      const user = userEvent.setup();
      const onToggle = jest.fn();
      render(
        <SelectableChip selected={false} onToggle={onToggle} disabled>
          Gandalf
        </SelectableChip>
      );

      await user.click(screen.getByRole("button", { name: "Gandalf" }));
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Painting: accent-bordered, never accent-filled
  // -------------------------------------------------------------------------
  describe("painting", () => {
    test("should paint from the shared chip classes rather than naming colours", () => {
      render(<SelectableChip selected={false} onToggle={jest.fn()}>Gandalf</SelectableChip>);
      const chip = screen.getByRole("button", { name: "Gandalf" });

      expect(chip).toHaveClass("chip-toggle");
      expect(chip.getAttribute("style")).toBeFalsy();
    });

    test("should add the selected paint class only when selected", () => {
      const { rerender } = render(
        <SelectableChip selected={false} onToggle={jest.fn()}>Gandalf</SelectableChip>
      );
      expect(screen.getByRole("button")).not.toHaveClass("chip-toggle-selected");

      rerender(<SelectableChip selected onToggle={jest.fn()}>Gandalf</SelectableChip>);
      expect(screen.getByRole("button")).toHaveClass("chip-toggle-selected");
    });

    // The whole point of D51's outline treatment: six selected chips must not
    // put six filled accents on a form and bury the primary action.
    test("should never wear the filled primary-action paint", () => {
      render(<SelectableChip selected onToggle={jest.fn()}>Gandalf</SelectableChip>);
      const chip = screen.getByRole("button", { name: "Gandalf" });

      expect(chip).not.toHaveClass("button-primary");
      expect(chip.className).not.toMatch(/\bbg-primary\b/);
    });

    test("should pass a caller's className through", () => {
      render(
        <SelectableChip selected={false} onToggle={jest.fn()} className="w-full text-left">
          Gandalf
        </SelectableChip>
      );
      expect(screen.getByRole("button")).toHaveClass("w-full", "text-left");
    });
  });
});

describe("RemovableChip", () => {
  test("should render its label", () => {
    render(<RemovableChip onRemove={jest.fn()} removeLabel="Remove tag merchant">merchant</RemovableChip>);
    expect(screen.getByText("merchant")).toBeInTheDocument();
  });

  test("should expose a remove control named for what it removes", () => {
    render(<RemovableChip onRemove={jest.fn()} removeLabel="Remove tag merchant">merchant</RemovableChip>);
    expect(screen.getByRole("button", { name: "Remove tag merchant" })).toBeInTheDocument();
  });

  test("should call onRemove when the remove control is used", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(<RemovableChip onRemove={onRemove} removeLabel="Remove tag merchant">merchant</RemovableChip>);

    await user.click(screen.getByRole("button", { name: "Remove tag merchant" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test("should reach the remove control with the keyboard alone", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(<RemovableChip onRemove={onRemove} removeLabel="Remove tag merchant">merchant</RemovableChip>);

    await user.tab();
    expect(screen.getByRole("button", { name: "Remove tag merchant" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test("should never submit the form it sits in", () => {
    render(<RemovableChip onRemove={jest.fn()} removeLabel="Remove tag merchant">merchant</RemovableChip>);
    expect(screen.getByRole("button", { name: "Remove tag merchant" })).toHaveAttribute(
      "type",
      "button"
    );
  });

  // It is a label with an affordance, not a toggle. Announcing it pressed or
  // unpressed would describe a state it does not have.
  test("should not claim a pressed state", () => {
    render(<RemovableChip onRemove={jest.fn()} removeLabel="Remove tag merchant">merchant</RemovableChip>);
    expect(screen.getByRole("button", { name: "Remove tag merchant" }))
      .not.toHaveAttribute("aria-pressed");
  });

  // One of the nine call sites disabled its remove control while the form was
  // submitting. Dropping that would let someone delete a relation out from under
  // a write that is already in flight.
  test("should disable the remove control when disabled", () => {
    render(
      <RemovableChip onRemove={jest.fn()} removeLabel="Remove tag merchant" disabled>
        merchant
      </RemovableChip>
    );
    expect(screen.getByRole("button", { name: "Remove tag merchant" })).toBeDisabled();
  });

  test("should not fire onRemove while disabled", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(
      <RemovableChip onRemove={onRemove} removeLabel="Remove tag merchant" disabled>
        merchant
      </RemovableChip>
    );

    await user.click(screen.getByRole("button", { name: "Remove tag merchant" }));
    expect(onRemove).not.toHaveBeenCalled();
  });

  test("should paint from the shared chip classes", () => {
    const { container } = render(
      <RemovableChip onRemove={jest.fn()} removeLabel="Remove tag merchant">merchant</RemovableChip>
    );
    expect(container.firstChild).toHaveClass("chip-tag");
    expect((container.firstChild as HTMLElement).getAttribute("style")).toBeFalsy();
  });
});
