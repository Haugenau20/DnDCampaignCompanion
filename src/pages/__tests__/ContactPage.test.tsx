// src/pages/__tests__/ContactPage.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import ContactPage from "../ContactPage";

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, variant, color }: any) => (
    <div
      data-testid={
        color
          ? `typography-${color}`
          : variant
          ? `typography-${variant}`
          : "typography-default"
      }
    >
      {children}
    </div>
  ),
}));

jest.mock("../../components/features/contact/ContactForm", () => ({
  __esModule: true,
  default: () => <div data-testid="contact-form" />,
}));

jest.mock("lucide-react", () => ({
  Mail: () => <span data-testid="mail-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  Bug: () => <span data-testid="bug-icon" />,
  PlusCircle: () => <span data-testid="plus-circle-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<ContactPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ContactPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders 'Contact Us' page heading", () => {
      renderPage();
      expect(screen.getByTestId("typography-h1")).toHaveTextContent(
        "Contact Us"
      );
    });

    it("renders introductory description text", () => {
      renderPage();
      expect(
        screen.getByText(/Have questions about our D&D Campaign Companion/i)
      ).toBeInTheDocument();
    });

    it("renders the ContactForm component", () => {
      renderPage();
      expect(screen.getByTestId("contact-form")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Info sections
  // -------------------------------------------------------------------------
  describe("info sections", () => {
    it("renders 'Email' section heading", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h4");
      const emailHeading = headings.find((el) =>
        el.textContent?.includes("Email")
      );
      expect(emailHeading).toBeInTheDocument();
    });

    it("renders 'Response Time' section heading", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h4");
      const responseHeading = headings.find((el) =>
        el.textContent?.includes("Response Time")
      );
      expect(responseHeading).toBeInTheDocument();
    });

    it("renders 'Feature Request' section heading", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h4");
      const featureHeading = headings.find((el) =>
        el.textContent?.includes("Feature Request")
      );
      expect(featureHeading).toBeInTheDocument();
    });

    it("renders 'Bug' section heading", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h4");
      const bugHeading = headings.find((el) =>
        el.textContent?.includes("Bug")
      );
      expect(bugHeading).toBeInTheDocument();
    });

    it("renders response time description (1-2 weeks)", () => {
      renderPage();
      expect(
        screen.getByText(/We aim to respond to all inquiries within 1-2 weeks/i)
      ).toBeInTheDocument();
    });

    it("renders feature request description", () => {
      renderPage();
      expect(
        screen.getByText(/Have an idea to make the Campaign Companion better/i)
      ).toBeInTheDocument();
    });

    it("renders bug report description", () => {
      renderPage();
      expect(
        screen.getByText(/Notice something not working quite right/i)
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Icons
  // -------------------------------------------------------------------------
  describe("icons", () => {
    it("renders Mail icon", () => {
      renderPage();
      expect(screen.getByTestId("mail-icon")).toBeInTheDocument();
    });

    it("renders Clock icon", () => {
      renderPage();
      expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
    });

    it("renders PlusCircle icon for feature requests", () => {
      renderPage();
      expect(screen.getByTestId("plus-circle-icon")).toBeInTheDocument();
    });

    it("renders Bug icon", () => {
      renderPage();
      expect(screen.getByTestId("bug-icon")).toBeInTheDocument();
    });
  });
});
