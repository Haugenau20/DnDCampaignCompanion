// src/pages/rumors/__tests__/RumorEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RumorEditPage from "../RumorEditPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
let mockRumorId: string | undefined = "rumor-1";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ rumorId: mockRumorId }),
  // RumorEditPage uses useNavigation from hooks which internally uses useLocation
  useLocation: () => ({ pathname: "/rumors/rumor-1", search: "" }),
}));

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

// RumorEditPage imports useNavigation from '../../hooks/useNavigation'
// which internally calls useNavigationContext from NavigationContext
jest.mock("../../../context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

jest.mock("../../../hooks/useNavigation", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
  default: () => ({ navigateToPage: mockNavigateToPage }),
}));

interface RumorContextMock {
  rumors: any[];
  isLoading: boolean;
  error: string | null;
}

let mockRumorContext: RumorContextMock = {
  rumors: [
    { id: "rumor-1", title: "The Golden Dragon Awakens" },
    { id: "rumor-2", title: "Missing Merchants" },
  ],
  isLoading: false,
  error: null,
};

jest.mock("../../../context/RumorContext", () => ({
  useRumors: () => mockRumorContext,
}));

jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: { uid: "user-1" } }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/features/rumors/RumorForm", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="rumor-form">
      <span data-testid="rumor-form-rumor-id">{props.rumor?.id}</span>
      <span data-testid="rumor-form-rumor-title">{props.rumor?.title}</span>
      <span data-testid="rumor-form-title">{props.title}</span>
      <button data-testid="rumor-form-success" onClick={props.onSuccess}>
        success
      </button>
      <button data-testid="rumor-form-cancel" onClick={props.onCancel}>
        cancel
      </button>
    </div>
  ),
}));

jest.mock("../../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, color, variant }: any) => (
    <div
      data-testid={
        color
          ? `typography-${color}`
          : variant
          ? `typography-${variant}`
          : "typography"
      }
    >
      {children}
    </div>
  ),
}));

jest.mock("../../../components/core/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("../../../components/core/Card", () => {
  const Card = ({ children }: any) => <div data-testid="card">{children}</div>;
  Card.Content = ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  );
  return { __esModule: true, default: Card };
});

jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
  Loader2: () => <span data-testid="loader" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<RumorEditPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("RumorEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRumorId = "rumor-1";
    mockRumorContext = {
      rumors: [
        { id: "rumor-1", title: "The Golden Dragon Awakens" },
        { id: "rumor-2", title: "Missing Merchants" },
      ],
      isLoading: false,
      error: null,
    };
  });

  // -------------------------------------------------------------------------
  // Rendering — rumor found
  // -------------------------------------------------------------------------
  describe("when rumor is found and context is ready", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders heading with the rumor title", () => {
      renderPage();
      expect(screen.getByTestId("typography-h1")).toHaveTextContent(
        "Edit The Golden Dragon Awakens"
      );
    });

    it("renders RumorForm", () => {
      renderPage();
      expect(screen.getByTestId("rumor-form")).toBeInTheDocument();
    });

    it("passes the correct rumor to RumorForm", () => {
      renderPage();
      expect(screen.getByTestId("rumor-form-rumor-id")).toHaveTextContent(
        "rumor-1"
      );
      expect(screen.getByTestId("rumor-form-rumor-title")).toHaveTextContent(
        "The Golden Dragon Awakens"
      );
    });

    it("passes 'Edit Rumor' as the form title", () => {
      renderPage();
      expect(screen.getByTestId("rumor-form-title")).toHaveTextContent(
        "Edit Rumor"
      );
    });

    it("shows 'Back to Rumors' button", () => {
      renderPage();
      expect(screen.getByText("Back to Rumors")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rumor not found
  // -------------------------------------------------------------------------
  describe("when rumor is not found by URL param", () => {
    beforeEach(() => {
      mockRumorId = "nonexistent-rumor";
    });

    it("shows 'Rumor not found' error", () => {
      renderPage();
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Rumor not found"
      );
    });

    it("does NOT render RumorForm with a rumor", () => {
      renderPage();
      // When no rumor is found, the edit form branch is skipped, Card shows instead
      expect(screen.queryByTestId("rumor-form")).not.toBeInTheDocument();
    });

    it("renders fallback heading 'Edit Rumor'", () => {
      renderPage();
      expect(screen.getByTestId("typography-h1")).toHaveTextContent(
        "Edit Rumor"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    beforeEach(() => {
      mockRumorContext = {
        ...mockRumorContext,
        isLoading: true,
        rumors: [],
      };
    });

    it("renders loading indicator", () => {
      renderPage();
      expect(screen.getByText("Loading rumor data...")).toBeInTheDocument();
    });

    it("does NOT render RumorForm during loading", () => {
      renderPage();
      expect(screen.queryByTestId("rumor-form")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    beforeEach(() => {
      mockRumorContext = {
        ...mockRumorContext,
        isLoading: false,
        error: "Firebase error",
        rumors: [],
      };
    });

    it("renders error message", () => {
      renderPage();
      expect(
        screen.getByText(
          "Error loading rumor data. Please try again later."
        )
      ).toBeInTheDocument();
    });

    it("does NOT render RumorForm on error", () => {
      renderPage();
      expect(screen.queryByTestId("rumor-form")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("navigates to /rumors on back button click", () => {
      renderPage();
      fireEvent.click(screen.getByText("Back to Rumors"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors");
    });

    it("navigates to /rumors on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("rumor-form-success"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors");
    });

    it("navigates to /rumors on form cancel", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("rumor-form-cancel"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors");
    });
  });
});
