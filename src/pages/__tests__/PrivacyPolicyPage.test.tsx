// src/pages/__tests__/PrivacyPolicyPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PrivacyPolicyPage from "../PrivacyPolicyPage";

// ---------------------------------------------------------------------------
// hook mock — PrivacyPolicyPage uses hooks/useNavigation (not context directly)
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("../../hooks/useNavigation", () => ({
  __esModule: true,
  default: () => ({ navigateToPage: mockNavigateToPage }),
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

// useNavigation hook internally uses react-router-dom useLocation
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ pathname: "/privacy", search: "", hash: "" }),
}));

// useNavigation also uses NavigationContext underneath
jest.mock("../../context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage, state: {} }),
}));

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

jest.mock("../../components/core/Card", () => {
  const Card = ({ children }: any) => (
    <div data-testid="card">{children}</div>
  );
  Card.Content = ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  );
  return { __esModule: true, default: Card };
});

jest.mock("../../components/core/Button", () => ({
  __esModule: true,
  default: ({ children, onClick, startIcon }: any) => (
    <button
      data-testid={`button-${String(children).trim().replace(/\s+/g, "-").toLowerCase()}`}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

jest.mock("lucide-react", () => ({
  Shield: () => <span data-testid="shield-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  Database: () => <span data-testid="database-icon" />,
  UserCheck: () => <span data-testid="user-check-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
  ScrollText: () => <span data-testid="scroll-text-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  ExternalLink: () => <span data-testid="external-link-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<PrivacyPolicyPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("PrivacyPolicyPage", () => {
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

    it("renders 'Privacy Policy' main heading", () => {
      renderPage();
      expect(screen.getByTestId("typography-h1")).toHaveTextContent(
        "Privacy Policy"
      );
    });

    it("renders 'Last updated' date line", () => {
      renderPage();
      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Section headings
  // -------------------------------------------------------------------------
  describe("section headings", () => {
    it("renders 'Overview' section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h3");
      const overview = headings.find((el) => el.textContent?.includes("Overview"));
      expect(overview).toBeInTheDocument();
    });

    it("renders 'Information We Collect' section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h2");
      const heading = headings.find((el) =>
        el.textContent?.includes("Information We Collect")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'Account Information' sub-section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h3");
      const heading = headings.find((el) =>
        el.textContent?.includes("Account Information")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'Contact Form Information' sub-section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h3");
      const heading = headings.find((el) =>
        el.textContent?.includes("Contact Form Information")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'Session Information' sub-section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h3");
      const heading = headings.find((el) =>
        el.textContent?.includes("Session Information")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'Campaign Content' sub-section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h3");
      const heading = headings.find((el) =>
        el.textContent?.includes("Campaign Content")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'How We Use Your Information' section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h2");
      const heading = headings.find((el) =>
        el.textContent?.includes("How We Use Your Information")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'Data Storage and Security' section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h2");
      const heading = headings.find((el) =>
        el.textContent?.includes("Data Storage and Security")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'How We Protect Your Data' sub-section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h3");
      const heading = headings.find((el) =>
        el.textContent?.includes("How We Protect Your Data")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'Data Retention' section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h2");
      const heading = headings.find((el) =>
        el.textContent?.includes("Data Retention")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'Your Rights' section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h2");
      const heading = headings.find((el) =>
        el.textContent?.includes("Your Rights")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'Changes to This Policy' section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h2");
      const heading = headings.find((el) =>
        el.textContent?.includes("Changes to This Policy")
      );
      expect(heading).toBeInTheDocument();
    });

    it("renders 'Contact Us' section", () => {
      renderPage();
      const headings = screen.getAllByTestId("typography-h2");
      const heading = headings.find((el) =>
        el.textContent?.includes("Contact Us")
      );
      expect(heading).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Key content
  // -------------------------------------------------------------------------
  describe("key content", () => {
    it("mentions Firebase as data storage provider", () => {
      renderPage();
      const matches = screen.getAllByText(/Firebase/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it("mentions inactivity timeout", () => {
      renderPage();
      // Comes from INACTIVITY_TIMEOUT_TEXT constant = "24 hours"
      expect(screen.getByText(/24 hours/i)).toBeInTheDocument();
    });

    it("mentions Remember Me duration", () => {
      renderPage();
      // Comes from REMEMBER_ME_TEXT constant = "30 days"
      expect(screen.getByText(/30 days/i)).toBeInTheDocument();
    });

    it("explains that data is encrypted in transit and at rest", () => {
      renderPage();
      expect(
        screen.getByText(/Data encryption in transit and at rest/i)
      ).toBeInTheDocument();
    });

    it("explains that consent is given by using the app", () => {
      renderPage();
      expect(
        screen.getByText(/consent to the data practices described in this policy/i)
      ).toBeInTheDocument();
    });

    it("lists email address as account information collected", () => {
      renderPage();
      expect(
        screen.getByText(/Email address \(for authentication\)/i)
      ).toBeInTheDocument();
    });

    it("lists username as account information collected", () => {
      renderPage();
      expect(
        screen.getByText(/Username \(for display and identification/i)
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Contact Us button
  // -------------------------------------------------------------------------
  describe("contact us button", () => {
    it("renders 'Contact Us' button at the bottom of the page", () => {
      renderPage();
      expect(screen.getByTestId("button-contact-us")).toBeInTheDocument();
    });

    it("navigates to /contact when 'Contact Us' button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-contact-us"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/contact");
    });
  });

  // -------------------------------------------------------------------------
  // Icons
  // -------------------------------------------------------------------------
  describe("icons", () => {
    it("renders ScrollText icon for Overview section", () => {
      renderPage();
      expect(screen.getByTestId("scroll-text-icon")).toBeInTheDocument();
    });

    it("renders UserCheck icon for Account Information section", () => {
      renderPage();
      expect(screen.getByTestId("user-check-icon")).toBeInTheDocument();
    });

    it("renders Clock icon for Session Information section", () => {
      renderPage();
      expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
    });

    it("renders Database icon for Campaign Content section", () => {
      renderPage();
      expect(screen.getByTestId("database-icon")).toBeInTheDocument();
    });

    it("renders Lock icon for Data Security section", () => {
      renderPage();
      expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
    });
  });
});
