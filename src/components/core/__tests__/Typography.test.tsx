// src/components/core/__tests__/Typography.test.tsx
// Behavioral tests — no Tailwind class assertions.

import React from "react";
import { render, screen } from "@testing-library/react";
import { Typography } from "../Typography";

// ---------------------------------------------------------------------------
// Typography uses no external hooks or context — no provider needed.
// ---------------------------------------------------------------------------

describe("Typography", () => {
  // -------------------------------------------------------------------------
  // Rendering / default element selection
  // -------------------------------------------------------------------------
  describe("default element selection", () => {
    test("should render a <p> element by default (variant=body)", () => {
      const { container } = render(<Typography>Hello</Typography>);
      expect(container.querySelector("p")).toBeInTheDocument();
    });

    test("should render <h1> for variant=h1", () => {
      const { container } = render(<Typography variant="h1">Title</Typography>);
      expect(container.querySelector("h1")).toBeInTheDocument();
    });

    test("should render <h2> for variant=h2", () => {
      const { container } = render(<Typography variant="h2">Sub</Typography>);
      expect(container.querySelector("h2")).toBeInTheDocument();
    });

    test("should render <h3> for variant=h3", () => {
      const { container } = render(<Typography variant="h3">Sub3</Typography>);
      expect(container.querySelector("h3")).toBeInTheDocument();
    });

    test("should render <h4> for variant=h4", () => {
      const { container } = render(<Typography variant="h4">Sub4</Typography>);
      expect(container.querySelector("h4")).toBeInTheDocument();
    });

    test("should render <p> for variant=body-lg", () => {
      const { container } = render(
        <Typography variant="body-lg">Text</Typography>
      );
      expect(container.querySelector("p")).toBeInTheDocument();
    });

    test("should render <p> for variant=body-sm", () => {
      const { container } = render(
        <Typography variant="body-sm">Small</Typography>
      );
      expect(container.querySelector("p")).toBeInTheDocument();
    });

    test("should render <span> for variant=caption", () => {
      const { container } = render(
        <Typography variant="caption">Cap</Typography>
      );
      expect(container.querySelector("span")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // as prop — polymorphic override
  // -------------------------------------------------------------------------
  describe("as prop (polymorphic rendering)", () => {
    test("should render the element specified by the as prop", () => {
      const { container } = render(
        <Typography as="span">Text</Typography>
      );
      expect(container.querySelector("span")).toBeInTheDocument();
      expect(container.querySelector("p")).not.toBeInTheDocument();
    });

    test("should render <div> when as=div is supplied", () => {
      const { container } = render(
        <Typography as="div">Text</Typography>
      );
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    test("should render <label> when as=label is supplied", () => {
      const { container } = render(
        <Typography as="label">Label text</Typography>
      );
      expect(container.querySelector("label")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Children rendering
  // -------------------------------------------------------------------------
  describe("children", () => {
    test("should display text children", () => {
      render(<Typography>Hello World</Typography>);
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    test("should display node children", () => {
      render(
        <Typography>
          <span data-testid="child-node">Inner</span>
        </Typography>
      );
      expect(screen.getByTestId("child-node")).toBeInTheDocument();
    });

    test("should display long text without truncation by default", () => {
      const longText = "A".repeat(200);
      render(<Typography>{longText}</Typography>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Variant styles — checking Tailwind classes emitted per variant spec
  // These are structural, not theme-specific — they define the visual scale.
  // -------------------------------------------------------------------------
  describe("variant styles applied", () => {
    test.each([
      ["h1", "text-4xl"],
      ["h2", "text-3xl"],
      ["h3", "text-2xl"],
      ["h4", "text-xl"],
      ["body-lg", "text-lg"],
      ["body", "text-base"],
      ["body-sm", "text-sm"],
      ["caption", "text-sm"],
    ] as const)("variant=%s should carry %s class", (variant, cls) => {
      const { container } = render(
        <Typography variant={variant}>T</Typography>
      );
      // The element rendered (first child of container)
      const el = container.firstElementChild!;
      expect(el).toHaveClass(cls);
    });
  });

  // -------------------------------------------------------------------------
  // centered prop
  // -------------------------------------------------------------------------
  describe("centered prop", () => {
    test("should add text-center class when centered=true", () => {
      const { container } = render(
        <Typography centered>Centered</Typography>
      );
      expect(container.firstElementChild).toHaveClass("text-center");
    });

    test("should NOT add text-center class when centered is not set", () => {
      const { container } = render(<Typography>Normal</Typography>);
      expect(container.firstElementChild).not.toHaveClass("text-center");
    });
  });

  // -------------------------------------------------------------------------
  // truncate prop
  // -------------------------------------------------------------------------
  describe("truncate prop", () => {
    test("should add truncate class when truncate=true", () => {
      const { container } = render(
        <Typography truncate>Long text</Typography>
      );
      expect(container.firstElementChild).toHaveClass("truncate");
    });

    test("should NOT add truncate class by default", () => {
      const { container } = render(<Typography>Text</Typography>);
      expect(container.firstElementChild).not.toHaveClass("truncate");
    });
  });

  // -------------------------------------------------------------------------
  // className merging
  // -------------------------------------------------------------------------
  describe("className prop", () => {
    test("should include custom className on the rendered element", () => {
      const { container } = render(
        <Typography className="my-custom">Text</Typography>
      );
      expect(container.firstElementChild).toHaveClass("my-custom");
    });
  });

  // -------------------------------------------------------------------------
  // displayName
  // -------------------------------------------------------------------------
  describe("displayName", () => {
    test("should have displayName set to Typography", () => {
      expect(Typography.displayName).toBe("Typography");
    });
  });

  // -------------------------------------------------------------------------
  // Heading detection — headings should carry typography-heading class
  // -------------------------------------------------------------------------
  describe("heading class", () => {
    test.each(["h1", "h2", "h3", "h4"] as const)(
      "variant=%s should carry typography-heading class",
      (variant) => {
        const { container } = render(
          <Typography variant={variant}>Heading</Typography>
        );
        expect(container.firstElementChild).toHaveClass("typography-heading");
      }
    );

    test.each(["body", "body-lg", "body-sm", "caption"] as const)(
      "variant=%s should NOT carry typography-heading class",
      (variant) => {
        const { container } = render(
          <Typography variant={variant}>Body</Typography>
        );
        expect(container.firstElementChild).not.toHaveClass(
          "typography-heading"
        );
      }
    );
  });
});
