// src/components/core/__tests__/Input.test.tsx
// Behavioral tests for Input component.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../Input";

// ---------------------------------------------------------------------------
// Input uses no theme hooks — no ThemeProvider needed.
// ---------------------------------------------------------------------------

describe("Input", () => {
  // -------------------------------------------------------------------------
  // Default rendering (regular <input>)
  // -------------------------------------------------------------------------
  describe("default rendering", () => {
    test("should render an <input> element by default", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    test("should NOT render a label when label prop is omitted", () => {
      render(<Input />);
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
      // No label text node
      const labels = document.querySelectorAll("label");
      expect(labels).toHaveLength(0);
    });

    test("should NOT render helper text when helperText is omitted", () => {
      render(<Input />);
      expect(document.querySelector("p")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Label
  // -------------------------------------------------------------------------
  describe("label prop", () => {
    test("should render a <label> element when label is provided", () => {
      render(<Input label="Name" />);
      expect(screen.getByText("Name")).toBeInTheDocument();
      const label = document.querySelector("label");
      expect(label).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // helperText / error / successMessage
  // -------------------------------------------------------------------------
  describe("status messages", () => {
    test("should display helperText below the input", () => {
      render(<Input helperText="Enter your name" />);
      expect(screen.getByText("Enter your name")).toBeInTheDocument();
    });

    test("should display error message when error prop is provided", () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    test("should display successMessage when provided", () => {
      render(<Input successMessage="Looks good!" />);
      expect(screen.getByText("Looks good!")).toBeInTheDocument();
    });

    test("should prefer error over successMessage when both are provided", () => {
      render(<Input error="Error!" successMessage="Success!" />);
      // Only error is shown
      expect(screen.getByText("Error!")).toBeInTheDocument();
      expect(screen.queryByText("Success!")).not.toBeInTheDocument();
    });

    test("should prefer error over helperText when both are provided", () => {
      render(<Input error="Error!" helperText="Help" />);
      expect(screen.getByText("Error!")).toBeInTheDocument();
      expect(screen.queryByText("Help")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // isTextArea mode
  // -------------------------------------------------------------------------
  describe("textarea mode (isTextArea=true)", () => {
    test("should render a <textarea> when isTextArea=true", () => {
      render(<Input isTextArea />);
      expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA");
    });

    test("should NOT render an <input> when isTextArea=true", () => {
      const { container } = render(<Input isTextArea />);
      expect(container.querySelector("input")).not.toBeInTheDocument();
    });

    test("should pass the rows prop to the textarea", () => {
      render(<Input isTextArea rows={5} />);
      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.rows).toBe(5);
    });

    test("should default to 3 rows when rows is not specified", () => {
      render(<Input isTextArea />);
      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.rows).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // User interaction — typing
  // -------------------------------------------------------------------------
  describe("user interaction", () => {
    test("should accept user input in a controlled input", async () => {
      const user = userEvent.setup();
      let value = "";
      const onChange = jest.fn((e: React.ChangeEvent<HTMLInputElement>) => {
        value = e.target.value;
      });

      render(<Input onChange={onChange} />);
      const input = screen.getByRole("textbox");

      await user.type(input, "Hello");

      expect(onChange).toHaveBeenCalled();
      expect(input).toHaveValue("Hello");
    });

    test("should fire onChange when textarea value changes", async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      render(<Input isTextArea onChange={onChange} />);
      const textarea = screen.getByRole("textbox");

      await user.type(textarea, "Story content");

      expect(onChange).toHaveBeenCalled();
    });

    test("should be disabled when disabled=true", () => {
      render(<Input disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    test("should accept a placeholder", () => {
      render(<Input placeholder="Type here..." />);
      expect(screen.getByPlaceholderText("Type here...")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Icons
  // -------------------------------------------------------------------------
  describe("icons", () => {
    test("should render startIcon when provided", () => {
      render(
        <Input startIcon={<span data-testid="start-icon">S</span>} />
      );
      expect(screen.getByTestId("start-icon")).toBeInTheDocument();
    });

    test("should render endIcon when provided", () => {
      render(
        <Input endIcon={<span data-testid="end-icon">E</span>} />
      );
      expect(screen.getByTestId("end-icon")).toBeInTheDocument();
    });

    test("should render both icons simultaneously", () => {
      render(
        <Input
          startIcon={<span data-testid="si">S</span>}
          endIcon={<span data-testid="ei">E</span>}
        />
      );
      expect(screen.getByTestId("si")).toBeInTheDocument();
      expect(screen.getByTestId("ei")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // fullWidth
  // -------------------------------------------------------------------------
  describe("fullWidth prop", () => {
    test("should make container full width when fullWidth=true", () => {
      const { container } = render(<Input fullWidth />);
      // Container div (wrapper) should have w-full
      expect(container.firstElementChild).toHaveClass("w-full");
    });
  });

  // -------------------------------------------------------------------------
  // Ref forwarding
  // -------------------------------------------------------------------------
  describe("ref forwarding", () => {
    test("should forward ref to the input element", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref as React.Ref<HTMLInputElement>} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    test("should forward ref to the textarea element", () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(
        <Input
          isTextArea
          ref={ref as React.Ref<HTMLTextAreaElement>}
        />
      );
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });

  // -------------------------------------------------------------------------
  // Custom className
  // -------------------------------------------------------------------------
  describe("className prop", () => {
    test("should apply custom containerClassName to wrapper div", () => {
      const { container } = render(
        <Input containerClassName="my-container" />
      );
      expect(container.firstElementChild).toHaveClass("my-container");
    });

    test("should apply custom className to the input element", () => {
      render(<Input className="my-input" />);
      expect(screen.getByRole("textbox")).toHaveClass("my-input");
    });
  });

  // -------------------------------------------------------------------------
  // displayName
  // -------------------------------------------------------------------------
  describe("displayName", () => {
    test("should have displayName set to Input", () => {
      expect(Input.displayName).toBe("Input");
    });
  });
});
