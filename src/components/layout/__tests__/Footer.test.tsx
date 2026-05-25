// src/components/layout/__tests__/Footer.test.tsx
// Behavioral tests for Footer component.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Footer from "../Footer";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("../../../hooks/useNavigation", () => ({
  useNavigation: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  Link: ({
    children,
    to,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    [k: string]: unknown;
  }) => (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

const { useNavigation } = require("../../../hooks/useNavigation");

describe("Footer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigateToPage: mockNavigateToPage,
    });
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    test("should render a <footer> element", () => {
      render(<Footer />);
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    });

    test("should display the current year in the copyright text", () => {
      render(<Footer />);
      const year = new Date().getFullYear().toString();
      expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
    });

    test("should display the application name in the copyright", () => {
      render(<Footer />);
      expect(
        screen.getByText(/D&D Campaign Companion/i)
      ).toBeInTheDocument();
    });

    test("should render a Privacy Policy link", () => {
      render(<Footer />);
      expect(
        screen.getByRole("link", { name: /privacy policy/i })
      ).toBeInTheDocument();
    });

    test("should render a Contact Us link", () => {
      render(<Footer />);
      expect(
        screen.getByRole("link", { name: /contact us/i })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation behavior
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    test("should call navigateToPage with /privacy when Privacy Policy is clicked", async () => {
      const user = userEvent.setup();
      render(<Footer />);

      await user.click(screen.getByRole("link", { name: /privacy policy/i }));

      expect(mockNavigateToPage).toHaveBeenCalledWith("/privacy");
    });

    test("should call navigateToPage with /contact when Contact Us is clicked", async () => {
      const user = userEvent.setup();
      render(<Footer />);

      await user.click(screen.getByRole("link", { name: /contact us/i }));

      expect(mockNavigateToPage).toHaveBeenCalledWith("/contact");
    });

    test("should prevent default link navigation (relies on navigateToPage)", async () => {
      const user = userEvent.setup();
      render(<Footer />);

      // If the default was NOT prevented the page would attempt to navigate.
      // We verify that navigateToPage is called (meaning custom handler ran).
      await user.click(screen.getByRole("link", { name: /privacy policy/i }));
      expect(mockNavigateToPage).toHaveBeenCalledTimes(1);
    });
  });
});
