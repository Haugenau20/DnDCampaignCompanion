// src/core/components/__tests__/Select.test.tsx
// Behavioral tests for the Select primitive (PR 8.0).
//
// Select is Input's sibling: same prop names for the same jobs, label above,
// helper below, error *replacing* the helper, and an id generated when a label
// is given so the association is automatic rather than remembered.
//
// The gate that matters is that a label actually names its control. The eleven
// form files carry 17 hand-written labels that do not (WCAG 1.3.1, 4.1.2), and
// 8.1 fixes them by moving them onto this component's `label` prop — which only
// works if the association is this component's job and not the caller's.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "../Select";

// ---------------------------------------------------------------------------
// Select uses no theme hooks — no ThemeProvider needed, same as Input.
// ---------------------------------------------------------------------------

/** The option set most call sites look like: a placeholder plus real values. */
const renderBasic = (props: Record<string, unknown> = {}) =>
  render(
    <Select label="Status" {...props}>
      <option value="">Select a status</option>
      <option value="unconfirmed">Unconfirmed</option>
      <option value="confirmed">Confirmed</option>
    </Select>
  );

describe("Select", () => {
  // -------------------------------------------------------------------------
  // Default rendering
  // -------------------------------------------------------------------------
  describe("default rendering", () => {
    test("should render a native <select> element", () => {
      renderBasic();
      const select = screen.getByRole("combobox");
      expect(select.tagName).toBe("SELECT");
    });

    test("should render the options it is given as children", () => {
      renderBasic();
      expect(screen.getAllByRole("option")).toHaveLength(3);
    });

    test("should NOT render a label element when label prop is omitted", () => {
      render(
        <Select aria-label="Status">
          <option value="a">A</option>
        </Select>
      );
      expect(document.querySelectorAll("label")).toHaveLength(0);
    });

    test("should NOT render a message paragraph when none is given", () => {
      renderBasic();
      expect(document.querySelector("p")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Label association — the point of the whole PR
  // -------------------------------------------------------------------------
  describe("label association", () => {
    test("should resolve the control by its label text alone", () => {
      renderBasic();
      const select = screen.getByLabelText("Status");
      expect(select.tagName).toBe("SELECT");
    });

    test("should point the label's htmlFor at the select's generated id", () => {
      renderBasic();
      const select = screen.getByLabelText("Status");
      const label = document.querySelector("label") as HTMLLabelElement;

      expect(label.htmlFor).toBeTruthy();
      expect(label.htmlFor).toBe(select.id);
    });

    test("should honour an explicitly passed id over the generated one", () => {
      renderBasic({ id: "rumor-status" });
      const select = screen.getByLabelText("Status");

      expect(select.id).toBe("rumor-status");
      expect((document.querySelector("label") as HTMLLabelElement).htmlFor).toBe(
        "rumor-status"
      );
    });

    test("should give two Selects on one page distinct ids", () => {
      render(
        <>
          <Select label="Status">
            <option value="a">A</option>
          </Select>
          <Select label="Source Type">
            <option value="b">B</option>
          </Select>
        </>
      );

      const first = screen.getByLabelText("Status");
      const second = screen.getByLabelText("Source Type");
      expect(first.id).toBeTruthy();
      expect(first.id).not.toBe(second.id);
    });
  });

  // -------------------------------------------------------------------------
  // Helper, error and success messaging
  // -------------------------------------------------------------------------
  describe("messages", () => {
    test("should render helper text below the control", () => {
      renderBasic({ helperText: "Pick one" });
      expect(screen.getByText("Pick one")).toBeInTheDocument();
    });

    test("should render an error message", () => {
      renderBasic({ error: "Status is required" });
      expect(screen.getByText("Status is required")).toBeInTheDocument();
    });

    // Input's contract, and A3's: "error text replacing helper — never both".
    test("should replace the helper text with the error, never show both", () => {
      renderBasic({ helperText: "Pick one", error: "Status is required" });

      expect(screen.getByText("Status is required")).toBeInTheDocument();
      expect(screen.queryByText("Pick one")).not.toBeInTheDocument();
      expect(document.querySelectorAll("p")).toHaveLength(1);
    });

    test("should replace the helper text with the success message", () => {
      renderBasic({ helperText: "Pick one", successMessage: "Looks good" });

      expect(screen.getByText("Looks good")).toBeInTheDocument();
      expect(screen.queryByText("Pick one")).not.toBeInTheDocument();
      expect(document.querySelectorAll("p")).toHaveLength(1);
    });

    test("should prefer the error over the success message", () => {
      renderBasic({ successMessage: "Looks good", error: "Status is required" });

      expect(screen.getByText("Status is required")).toBeInTheDocument();
      expect(screen.queryByText("Looks good")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state is not carried by colour alone (design language §2)
  // -------------------------------------------------------------------------
  describe("error semantics", () => {
    test("should mark the control invalid to assistive tech when in error", () => {
      renderBasic({ error: "Status is required" });
      expect(screen.getByLabelText("Status")).toHaveAttribute(
        "aria-invalid",
        "true"
      );
    });

    test("should not claim invalid when there is no error", () => {
      renderBasic({ helperText: "Pick one" });
      expect(screen.getByLabelText("Status")).not.toHaveAttribute("aria-invalid");
    });

    test("should name the error message as the control's description", () => {
      renderBasic({ error: "Status is required" });
      const select = screen.getByLabelText("Status");
      const describedBy = select.getAttribute("aria-describedby");

      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy as string)).toHaveTextContent(
        "Status is required"
      );
    });

    test("should name the helper text as the control's description", () => {
      renderBasic({ helperText: "Pick one" });
      const select = screen.getByLabelText("Status");
      const describedBy = select.getAttribute("aria-describedby");

      expect(document.getElementById(describedBy as string)).toHaveTextContent(
        "Pick one"
      );
    });

    test("should not describe the control when there is no message", () => {
      renderBasic();
      expect(screen.getByLabelText("Status")).not.toHaveAttribute(
        "aria-describedby"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Selection behaviour — the native control, doing its native job
  // -------------------------------------------------------------------------
  describe("selection", () => {
    test("should report the chosen value to onChange", async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      renderBasic({ onChange: handleChange });

      await user.selectOptions(screen.getByLabelText("Status"), "confirmed");

      expect(handleChange).toHaveBeenCalled();
      expect(handleChange.mock.calls[0][0].target.value).toBe("confirmed");
    });

    test("should render as a controlled component when given a value", () => {
      renderBasic({ value: "confirmed", onChange: jest.fn() });
      expect(screen.getByLabelText("Status")).toHaveValue("confirmed");
    });

    test("should be selectable with the keyboard alone", async () => {
      const user = userEvent.setup();
      renderBasic({ defaultValue: "" });
      const select = screen.getByLabelText("Status");

      await user.tab();
      expect(select).toHaveFocus();

      await user.selectOptions(select, "unconfirmed");
      expect(select).toHaveValue("unconfirmed");
    });
  });

  // -------------------------------------------------------------------------
  // Disabled
  // -------------------------------------------------------------------------
  describe("disabled", () => {
    test("should disable the control when disabled is passed", () => {
      renderBasic({ disabled: true });
      expect(screen.getByLabelText("Status")).toBeDisabled();
    });

    test("should skip a disabled control in the tab order", async () => {
      const user = userEvent.setup();
      renderBasic({ disabled: true });

      await user.tab();
      expect(screen.getByLabelText("Status")).not.toHaveFocus();
    });
  });

  // -------------------------------------------------------------------------
  // Ref forwarding — 8.3 needs to focus the first invalid control
  // -------------------------------------------------------------------------
  describe("ref forwarding", () => {
    test("should forward a ref to the underlying select element", () => {
      const ref = React.createRef<HTMLSelectElement>();
      render(
        <Select label="Status" ref={ref}>
          <option value="a">A</option>
        </Select>
      );

      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
      expect(ref.current).toBe(screen.getByLabelText("Status"));
    });

    test("should let a caller focus the control through the ref", () => {
      const ref = React.createRef<HTMLSelectElement>();
      render(
        <Select label="Status" ref={ref}>
          <option value="a">A</option>
        </Select>
      );

      ref.current?.focus();
      expect(screen.getByLabelText("Status")).toHaveFocus();
    });
  });

  // -------------------------------------------------------------------------
  // Painting — from field.* only, via the same classes Input uses
  // -------------------------------------------------------------------------
  describe("painting", () => {
    test("should paint from the shared field classes rather than naming colours", () => {
      renderBasic();
      const select = screen.getByLabelText("Status");

      expect(select).toHaveClass("input");
      expect(select.getAttribute("style")).toBeFalsy();
    });

    test("should add the error paint class only when in error", () => {
      const { rerender } = renderBasic();
      expect(screen.getByLabelText("Status")).not.toHaveClass("input-error");

      rerender(
        <Select label="Status" error="Status is required">
          <option value="">Select a status</option>
        </Select>
      );
      expect(screen.getByLabelText("Status")).toHaveClass("input-error");
    });

    test("should pass a caller's className through to the control", () => {
      renderBasic({ className: "custom-select" });
      expect(screen.getByLabelText("Status")).toHaveClass("custom-select");
    });

    test("should pass containerClassName to the wrapper, not the control", () => {
      const { container } = renderBasic({ containerClassName: "mb-8" });

      expect(container.firstChild).toHaveClass("mb-8");
      expect(screen.getByLabelText("Status")).not.toHaveClass("mb-8");
    });
  });

  // -------------------------------------------------------------------------
  // Native attributes pass through — the control stays native (8.0 rule 4)
  // -------------------------------------------------------------------------
  describe("native passthrough", () => {
    test("should forward required to the underlying select", () => {
      renderBasic({ required: true });
      expect(screen.getByLabelText("Status")).toBeRequired();
    });

    test("should forward name to the underlying select", () => {
      renderBasic({ name: "status" });
      expect(screen.getByLabelText("Status")).toHaveAttribute("name", "status");
    });
  });
});
