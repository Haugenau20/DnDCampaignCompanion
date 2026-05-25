// src/components/layout/__tests__/Layout.test.tsx
// Behavioral tests for the Layout component.
// Layout composes Header, Navigation, Footer, FloatingUsageIndicator, and
// GlobalActionButton — mock all sub-components to keep tests focused.

import React from "react";
import { render, screen } from "@testing-library/react";
import Layout from "../Layout";

// ---------------------------------------------------------------------------
// Mock all child components
// ---------------------------------------------------------------------------
jest.mock("../Header", () => ({
  __esModule: true,
  default: () => <div data-testid="header" />,
}));

jest.mock("../Navigation", () => ({
  __esModule: true,
  default: () => <nav data-testid="navigation" />,
}));

jest.mock("../Footer", () => ({
  __esModule: true,
  default: () => <footer data-testid="footer" />,
}));

jest.mock("../../features/notes/FloatingUsageIndicator", () => ({
  __esModule: true,
  default: () => <div data-testid="floating-usage" />,
}));

jest.mock("../../shared/GlobalActionButton", () => ({
  __esModule: true,
  default: () => <div data-testid="global-action" />,
}));

describe("Layout", () => {
  // -------------------------------------------------------------------------
  // Structural rendering
  // -------------------------------------------------------------------------
  describe("structural rendering", () => {
    test("should render without crashing", () => {
      render(
        <Layout>
          <p>Page content</p>
        </Layout>
      );
      expect(screen.getByText("Page content")).toBeInTheDocument();
    });

    test("should render the Header component", () => {
      render(
        <Layout>
          <p>Content</p>
        </Layout>
      );
      expect(screen.getByTestId("header")).toBeInTheDocument();
    });

    test("should render the Navigation component", () => {
      render(
        <Layout>
          <p>Content</p>
        </Layout>
      );
      expect(screen.getByTestId("navigation")).toBeInTheDocument();
    });

    test("should render the Footer component", () => {
      render(
        <Layout>
          <p>Content</p>
        </Layout>
      );
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });

    test("should render the FloatingUsageIndicator", () => {
      render(
        <Layout>
          <p>Content</p>
        </Layout>
      );
      expect(screen.getByTestId("floating-usage")).toBeInTheDocument();
    });

    test("should render the GlobalActionButton", () => {
      render(
        <Layout>
          <p>Content</p>
        </Layout>
      );
      expect(screen.getByTestId("global-action")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Children rendering
  // -------------------------------------------------------------------------
  describe("children", () => {
    test("should render children inside a <main> element", () => {
      render(
        <Layout>
          <p data-testid="page-child">My page</p>
        </Layout>
      );
      const main = screen.getByRole("main");
      expect(main).toBeInTheDocument();
      expect(screen.getByTestId("page-child")).toBeInTheDocument();
    });

    test("should render multiple children", () => {
      render(
        <Layout>
          <p data-testid="child-1">First</p>
          <p data-testid="child-2">Second</p>
        </Layout>
      );
      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });

    test("should render children with correct nesting inside <main>", () => {
      render(
        <Layout>
          <section data-testid="section">Section content</section>
        </Layout>
      );
      const main = screen.getByRole("main");
      expect(main).toContainElement(screen.getByTestId("section"));
    });
  });

  // -------------------------------------------------------------------------
  // Layout structure
  // -------------------------------------------------------------------------
  describe("layout structure", () => {
    test("should render the outer wrapper as a flex column", () => {
      const { container } = render(
        <Layout>
          <p>Content</p>
        </Layout>
      );
      // Top-level div should have the flex column structure
      expect(container.firstElementChild).toHaveClass("min-h-screen");
      expect(container.firstElementChild).toHaveClass("flex");
      expect(container.firstElementChild).toHaveClass("flex-col");
    });
  });
});
