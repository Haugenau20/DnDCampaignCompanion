// src/pages/story/__tests__/SagaPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SagaPage from "../SagaPage";

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("../../../context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

let mockUser: { uid: string } | null = { uid: "user-1" };

jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
}));

interface SagaDataMock {
  saga: { title: string; content: string; lastUpdated?: string } | null;
  loading: boolean;
  error: string | null;
  hasRequiredContext: boolean;
}

let mockSagaData: SagaDataMock = {
  saga: null,
  loading: false,
  error: null,
  hasRequiredContext: true,
};

jest.mock("features/storytelling", () => ({
  useSagaData: () => mockSagaData,
  BookViewer: (props: any) => (
    <div
      data-testid="book-viewer"
      data-title={props.title}
      data-content={props.content}
      data-has-next={String(props.hasNextChapter)}
      data-has-prev={String(props.hasPreviousChapter)}
    />
  ),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, color, variant, className }: any) => (
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

jest.mock("../../../components/layout/Breadcrumb", () => ({
  __esModule: true,
  default: (props: any) => (
    <nav data-testid="breadcrumb">
      {props.items.map((item: any, i: number) => (
        <span key={i} data-testid={`breadcrumb-item-${i}`}>
          {item.label}
        </span>
      ))}
    </nav>
  ),
}));

jest.mock("../../../components/core/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button
      data-testid={`button-${String(children).trim().replace(/\s+/g, "-").toLowerCase()}`}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

jest.mock("../../../components/core/Card", () => {
  const Card = ({ children }: any) => (
    <div data-testid="card">{children}</div>
  );
  Card.Content = ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  );
  return { __esModule: true, default: Card };
});

jest.mock("lucide-react", () => ({
  Book: () => <span data-testid="book-icon" />,
  Edit: () => <span data-testid="edit-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<SagaPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SagaPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockSagaData = {
      saga: null,
      loading: false,
      error: null,
      hasRequiredContext: true,
    };
  });

  // -------------------------------------------------------------------------
  // Context missing
  // -------------------------------------------------------------------------
  describe("missing required context", () => {
    it("renders context missing message when hasRequiredContext is false", () => {
      mockSagaData = { ...mockSagaData, hasRequiredContext: false };
      renderPage();
      expect(screen.getByText(/Please select a group and campaign/i)).toBeInTheDocument();
    });

    it("does NOT render BookViewer when context is missing", () => {
      mockSagaData = { ...mockSagaData, hasRequiredContext: false };
      renderPage();
      expect(screen.queryByTestId("book-viewer")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    it("shows loading message when loading is true", () => {
      mockSagaData = { ...mockSagaData, loading: true };
      renderPage();
      expect(screen.getByText(/Loading saga\.\.\./i)).toBeInTheDocument();
    });

    it("does NOT render BookViewer while loading", () => {
      mockSagaData = { ...mockSagaData, loading: true };
      renderPage();
      expect(screen.queryByTestId("book-viewer")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    it("shows error message when error is set", () => {
      mockSagaData = { ...mockSagaData, error: "Failed to load saga" };
      renderPage();
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Failed to load saga"
      );
    });

    it("does NOT render BookViewer when there is an error", () => {
      mockSagaData = { ...mockSagaData, error: "Server error" };
      renderPage();
      expect(screen.queryByTestId("book-viewer")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Main rendering — no saga exists
  // -------------------------------------------------------------------------
  describe("rendering with no existing saga", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders breadcrumb with Home, Story, Campaign Saga", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent("Home");
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent("Story");
      expect(screen.getByTestId("breadcrumb-item-2")).toHaveTextContent(
        "Campaign Saga"
      );
    });

    it("renders BookViewer with default title when no saga exists", () => {
      renderPage();
      expect(screen.getByTestId("book-viewer")).toHaveAttribute(
        "data-title",
        "The Campaign Saga"
      );
    });

    it("renders BookViewer with placeholder content when no saga exists", () => {
      renderPage();
      const content = screen.getByTestId("book-viewer").getAttribute("data-content") || "";
      expect(content).toContain("Your campaign saga has not been written yet");
    });

    it("includes SAGA_DEFAULT_OPENING in placeholder content", () => {
      renderPage();
      const content = screen.getByTestId("book-viewer").getAttribute("data-content") || "";
      expect(content).toContain(
        "In a realm where magic weaves through the fabric of reality"
      );
    });

    it("includes writing tips in placeholder content", () => {
      renderPage();
      const content = screen.getByTestId("book-viewer").getAttribute("data-content") || "";
      expect(content).toContain("Focus on the overarching narrative");
    });

    it("BookViewer has hasNextChapter=false for saga (one continuous story)", () => {
      renderPage();
      expect(screen.getByTestId("book-viewer")).toHaveAttribute(
        "data-has-next",
        "false"
      );
    });

    it("BookViewer has hasPreviousChapter=false for saga", () => {
      renderPage();
      expect(screen.getByTestId("book-viewer")).toHaveAttribute(
        "data-has-prev",
        "false"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Main rendering — saga exists
  // -------------------------------------------------------------------------
  describe("rendering with existing saga", () => {
    beforeEach(() => {
      mockSagaData = {
        ...mockSagaData,
        saga: {
          title: "Epic of the Ages",
          content: "Our heroes ventured forth...",
          lastUpdated: "2024-03-15T10:00:00.000Z",
        },
      };
    });

    it("renders BookViewer with saga title", () => {
      renderPage();
      expect(screen.getByTestId("book-viewer")).toHaveAttribute(
        "data-title",
        "Epic of the Ages"
      );
    });

    it("renders BookViewer with saga content", () => {
      renderPage();
      expect(screen.getByTestId("book-viewer")).toHaveAttribute(
        "data-content",
        "Our heroes ventured forth..."
      );
    });

    it("shows last updated date when saga has lastUpdated", () => {
      renderPage();
      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated user controls
  // -------------------------------------------------------------------------
  describe("authenticated user controls", () => {
    it("renders 'Edit Saga' button when user is signed in", () => {
      renderPage();
      expect(screen.getByTestId("button-edit-saga")).toBeInTheDocument();
    });

    it("does NOT render 'Edit Saga' button when user is not signed in", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("button-edit-saga")).not.toBeInTheDocument();
    });

    it("navigates to /story/saga/edit when 'Edit Saga' is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-edit-saga"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/saga/edit");
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("renders 'Back to Selection' button", () => {
      renderPage();
      expect(
        screen.getByTestId("button-back-to-selection")
      ).toBeInTheDocument();
    });

    it("navigates to /story when 'Back to Selection' is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-back-to-selection"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story");
    });
  });
});
