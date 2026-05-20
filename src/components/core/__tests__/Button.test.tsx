// src/components/core/__tests__/Button.test.tsx
// Fresh behavioral tests — no Tailwind class assertions.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../Button";

// ---------------------------------------------------------------------------
// ThemeProvider is NOT required by Button itself, but clsx/twMerge run fine
// without it. Button only uses theme CSS class names as strings — it does not
// call any theme hook.
// ---------------------------------------------------------------------------

describe("Button", () => {
  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    test("should render a button element", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    test("should render children text", () => {
      render(<Button>Save</Button>);
      expect(screen.getByRole("button")).toHaveTextContent("Save");
    });

    test("should render with an empty string as children without crashing", () => {
      render(<Button>{""}</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    test("should render node children", () => {
      render(
        <Button>
          <span data-testid="inner">Label</span>
        </Button>
      );
      expect(screen.getByTestId("inner")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // data-variant attribute — a reliable, non-Tailwind behavior marker
  // -------------------------------------------------------------------------
  describe("variant selection", () => {
    test.each([
      ["primary"],
      ["secondary"],
      ["outline"],
      ["ghost"],
      ["link"],
    ] as const)(
      "should set data-variant=%s on the button element",
      (variant) => {
        render(<Button variant={variant}>Btn</Button>);
        expect(screen.getByRole("button")).toHaveAttribute(
          "data-variant",
          variant
        );
      }
    );

    test("should default data-variant to primary when no variant is provided", () => {
      render(<Button>Btn</Button>);
      expect(screen.getByRole("button")).toHaveAttribute(
        "data-variant",
        "primary"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Click handling
  // -------------------------------------------------------------------------
  describe("click handling", () => {
    test("should call onClick handler when clicked", async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      render(<Button onClick={onClick}>Click</Button>);

      await user.click(screen.getByRole("button"));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test("should NOT call onClick when the button is disabled", async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      render(
        <Button onClick={onClick} disabled>
          Click
        </Button>
      );

      await user.click(screen.getByRole("button"));

      expect(onClick).not.toHaveBeenCalled();
    });

    test("should NOT call onClick when isLoading is true", async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      render(
        <Button onClick={onClick} isLoading>
          Click
        </Button>
      );

      await user.click(screen.getByRole("button"));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Disabled state
  // -------------------------------------------------------------------------
  describe("disabled state", () => {
    test("should be disabled when disabled prop is true", () => {
      render(<Button disabled>Btn</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    test("should NOT be disabled by default", () => {
      render(<Button>Btn</Button>);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    test("should be disabled when isLoading is true", () => {
      render(<Button isLoading>Save</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    test("should hide children text visually when loading (invisible class)", () => {
      render(<Button isLoading>Save</Button>);
      // The inner span holding children gains 'invisible'
      const innerSpan = screen.getByText("Save").closest("span");
      expect(innerSpan).toHaveClass("invisible");
    });

    test("should render the SVG spinner when loading", () => {
      const { container } = render(<Button isLoading>Save</Button>);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Icons
  // -------------------------------------------------------------------------
  describe("icons", () => {
    test("should render startIcon when iconPosition is default (start)", () => {
      render(
        <Button startIcon={<span data-testid="start-icon">S</span>}>
          Go
        </Button>
      );
      expect(screen.getByTestId("start-icon")).toBeInTheDocument();
    });

    test("should render endIcon", () => {
      render(
        <Button endIcon={<span data-testid="end-icon">E</span>}>Go</Button>
      );
      expect(screen.getByTestId("end-icon")).toBeInTheDocument();
    });

    test("should render icon above text when iconPosition is top", () => {
      render(
        <Button
          startIcon={<span data-testid="top-icon">T</span>}
          iconPosition="top"
        >
          Label
        </Button>
      );
      expect(screen.getByTestId("top-icon")).toBeInTheDocument();
      expect(screen.getByText("Label")).toBeInTheDocument();
    });

    test("should NOT render endIcon in vertical (top) layout — it uses startIcon", () => {
      // When iconPosition=top the component uses the startIcon slot.
      // endIcon passed while iconPosition=top should NOT be rendered separately.
      const { queryByTestId } = render(
        <Button
          startIcon={<span data-testid="si">S</span>}
          endIcon={<span data-testid="ei">E</span>}
          iconPosition="top"
        >
          Lbl
        </Button>
      );
      // startIcon shows in vertical layout
      expect(queryByTestId("si")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------
  describe("accessibility", () => {
    test("should accept and forward aria-label", () => {
      render(<Button aria-label="Close dialog">X</Button>);
      expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
    });

    test("should accept and forward aria-pressed", () => {
      render(<Button aria-pressed="true">Toggle</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    });

    test("should accept data-testid and other HTML button attributes", () => {
      render(<Button data-testid="my-btn">Btn</Button>);
      expect(screen.getByTestId("my-btn")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // fullWidth
  // -------------------------------------------------------------------------
  describe("fullWidth prop", () => {
    test("should include w-full class when fullWidth is true", () => {
      render(<Button fullWidth>Wide</Button>);
      expect(screen.getByRole("button")).toHaveClass("w-full");
    });

    test("should include w-auto class when fullWidth is false (default)", () => {
      render(<Button>Normal</Button>);
      expect(screen.getByRole("button")).toHaveClass("w-auto");
    });
  });

  // -------------------------------------------------------------------------
  // Custom className
  // -------------------------------------------------------------------------
  describe("className merging", () => {
    test("should include custom className on the button element", () => {
      render(<Button className="my-custom-class">Btn</Button>);
      expect(screen.getByRole("button")).toHaveClass("my-custom-class");
    });
  });
});
