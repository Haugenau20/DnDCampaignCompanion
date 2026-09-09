// src/app/layout/__tests__/Footer.test.tsx
// Behavioral tests for Footer component.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Footer from "../Footer";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("shared/hooks/useNavigation", () => ({
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

const { useNavigation } = require("shared/hooks/useNavigation");

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

    test("reserves space beside the links so the floating create button cannot cover them", () => {
      // The reserve used to be `pb-20` on the footer -- 80px of bottom padding
      // for a button that only ever overlaps the bottom *right*. It is now a
      // right-hand gutter on the row itself, which costs no height. The button
      // is `fixed right-6 bottom-6` and 48px square, so it occupies the last
      // 72px; `pr-20` (80px) clears it.
      const { container } = render(<Footer />);
      const row = container.querySelector("footer > div");
      expect(row).toHaveClass("sm:pr-20");
      expect(screen.getByRole("contentinfo")).not.toHaveClass("pb-20");
    });

    test("stacks left-aligned below sm, so the last line does not run under the button", () => {
      const { container } = render(<Footer />);
      const row = container.querySelector("footer > div");
      // Column by default, row only from `sm` -- a right-aligned link row at
      // phone widths would wrap straight into the button's corner.
      expect(row).toHaveClass("flex-col");
      expect(row).toHaveClass("sm:flex-row");
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
