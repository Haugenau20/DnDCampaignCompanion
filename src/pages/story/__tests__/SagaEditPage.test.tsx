// src/pages/story/__tests__/SagaEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SagaEditPage from "../SagaEditPage";

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("../../../context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

let mockUser: { uid: string; displayName: string } | null = {
  uid: "user-1",
  displayName: "TestUser",
};

jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockSaveSaga = jest.fn();

interface SagaDataMock {
  saga: { title: string; content: string; lastUpdated?: string } | null;
  loading: boolean;
  error: string | null;
  hasRequiredContext: boolean;
  saveSaga: jest.Mock;
}

let mockSagaData: SagaDataMock = {
  saga: null,
  loading: false,
  error: null,
  hasRequiredContext: true,
  saveSaga: mockSaveSaga,
};

let mockChapters: any[] = [
  { id: "ch-1", title: "Chapter 1", order: 1, content: "Content 1" },
];

jest.mock("features/storytelling", () => ({
  useSagaData: () => mockSagaData,
  useStory: () => ({ chapters: mockChapters }),
}));

// ---------------------------------------------------------------------------
// Utility mock
// ---------------------------------------------------------------------------
const mockExportChaptersAsText = jest.fn();
jest.mock("../../../utils/export-utils", () => ({
  exportChaptersAsText: (chapters: any[]) => mockExportChaptersAsText(chapters),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, color, variant }: any) => (
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
  default: ({ children, onClick, type, isLoading }: any) => (
    <button
      data-testid={`button-${String(children).trim().replace(/\s+/g, "-").toLowerCase()}`}
      onClick={onClick}
      type={type || "button"}
      disabled={!!isLoading}
      data-loading={String(!!isLoading)}
    >
      {children}
    </button>
  ),
}));

jest.mock("../../../components/core/Card", () => {
  const Card = ({ children }: any) => (
    <div data-testid="card">{children}</div>
  );
  Card.Content = ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  );
  Card.Footer = ({ children, className }: any) => (
    <div data-testid="card-footer" className={className}>
      {children}
    </div>
  );
  return { __esModule: true, default: Card };
});

// Input mock: renders a real <input> or <textarea> so we can change values
jest.mock("../../../components/core/Input", () => ({
  __esModule: true,
  default: ({ label, value, onChange, isTextArea, required, fullWidth }: any) => {
    if (isTextArea) {
      return (
        <div data-testid={`input-wrapper-${label?.replace(/\s+/g, "-").toLowerCase()}`}>
          <label>{label}</label>
          <textarea
            data-testid={`textarea-${label?.replace(/\s+/g, "-").toLowerCase()}`}
            value={value}
            onChange={onChange}
            required={required}
          />
        </div>
      );
    }
    return (
      <div data-testid={`input-wrapper-${label?.replace(/\s+/g, "-").toLowerCase()}`}>
        <label>{label}</label>
        <input
          data-testid={`input-${label?.replace(/\s+/g, "-").toLowerCase()}`}
          value={value}
          onChange={onChange}
          required={required}
        />
      </div>
    );
  },
}));

// Mock Dialog to render children inline (ref: bug #150)
jest.mock("../../../components/core/Dialog", () => ({
  __esModule: true,
  default: ({ open, onClose, title, children }: any) =>
    open ? (
      <div data-testid="dialog" role="dialog">
        <h2 data-testid="dialog-title">{title}</h2>
        {children}
        <button data-testid="dialog-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

jest.mock("lucide-react", () => ({
  Book: () => <span data-testid="book-icon" />,
  Save: () => <span data-testid="save-icon" />,
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
  FileDown: () => <span data-testid="file-down-icon" />,
  HelpCircle: () => <span data-testid="help-circle-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<SagaEditPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SagaEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1", displayName: "TestUser" };
    mockChapters = [
      { id: "ch-1", title: "Chapter 1", order: 1, content: "Content 1" },
    ];
    mockSagaData = {
      saga: null,
      loading: false,
      error: null,
      hasRequiredContext: true,
      saveSaga: mockSaveSaga,
    };
    mockSaveSaga.mockResolvedValue(true);
  });

  // -------------------------------------------------------------------------
  // Context missing
  // -------------------------------------------------------------------------
  describe("missing required context", () => {
    it("shows context missing message when hasRequiredContext is false", () => {
      mockSagaData = { ...mockSagaData, hasRequiredContext: false };
      renderPage();
      expect(
        screen.getByText(/Please select a group and campaign to edit the saga/i)
      ).toBeInTheDocument();
    });

    it("does NOT render the edit form inputs when context is missing", () => {
      mockSagaData = { ...mockSagaData, hasRequiredContext: false };
      renderPage();
      expect(screen.queryByTestId("input-saga-title")).not.toBeInTheDocument();
      expect(screen.queryByTestId("textarea-saga-content")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    it("shows loading message while loading", () => {
      mockSagaData = { ...mockSagaData, loading: true };
      renderPage();
      expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
    });

    it("does NOT render form while loading", () => {
      mockSagaData = { ...mockSagaData, loading: true };
      renderPage();
      expect(screen.queryByTestId("input-saga-title")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    it("shows error message when error is set", () => {
      mockSagaData = { ...mockSagaData, error: "Database error" };
      renderPage();
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Database error"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Unauthenticated — redirect
  // -------------------------------------------------------------------------
  describe("unauthenticated user", () => {
    it("returns null (renders nothing) when user is null after loading", () => {
      mockUser = null;
      const { container } = renderPage();
      // The component should render null and call navigateToPage for redirect
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/saga");
    });
  });

  // -------------------------------------------------------------------------
  // Main rendering
  // -------------------------------------------------------------------------
  describe("main rendering", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders page heading 'Edit Campaign Saga'", () => {
      renderPage();
      expect(screen.getByTestId("typography-h2")).toHaveTextContent(
        "Edit Campaign Saga"
      );
    });

    it("renders breadcrumb with correct items", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent("Home");
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent("Story");
      expect(screen.getByTestId("breadcrumb-item-2")).toHaveTextContent(
        "Campaign Saga"
      );
      expect(screen.getByTestId("breadcrumb-item-3")).toHaveTextContent(
        "Edit Saga"
      );
    });

    it("renders title input field", () => {
      renderPage();
      expect(screen.getByTestId("input-saga-title")).toBeInTheDocument();
    });

    it("renders content textarea", () => {
      renderPage();
      expect(
        screen.getByTestId("textarea-saga-content")
      ).toBeInTheDocument();
    });

    it("title input is pre-filled with 'The Campaign Saga' by default", () => {
      renderPage();
      expect(screen.getByTestId("input-saga-title")).toHaveValue(
        "The Campaign Saga"
      );
    });

    it("content textarea is pre-filled with default opening text when no saga", () => {
      renderPage();
      expect(
        screen.getByTestId("textarea-saga-content")
      ).toHaveValue(
        "In a realm where magic weaves through the fabric of reality and ancient powers stir from long slumber, a group of unlikely heroes finds their fates intertwined by destiny's unseen hand."
      );
    });

    it("renders 'Save Saga' submit button", () => {
      renderPage();
      expect(screen.getByTestId("button-save-saga")).toBeInTheDocument();
    });

    it("renders 'Cancel' button", () => {
      renderPage();
      expect(screen.getByTestId("button-cancel")).toBeInTheDocument();
    });

    it("renders 'Export Chapter Content' button", () => {
      renderPage();
      expect(
        screen.getByTestId("button-export-chapter-content")
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Form state — pre-fill from existing saga
  // -------------------------------------------------------------------------
  describe("form pre-fill from existing saga", () => {
    it("pre-fills title from existing saga", () => {
      mockSagaData = {
        ...mockSagaData,
        saga: {
          title: "Legend of Faerun",
          content: "The adventurers arose...",
        },
      };
      renderPage();
      expect(screen.getByTestId("input-saga-title")).toHaveValue(
        "Legend of Faerun"
      );
    });

    it("pre-fills content from existing saga", () => {
      mockSagaData = {
        ...mockSagaData,
        saga: {
          title: "Legend of Faerun",
          content: "The adventurers arose...",
        },
      };
      renderPage();
      expect(screen.getByTestId("textarea-saga-content")).toHaveValue(
        "The adventurers arose..."
      );
    });
  });

  // -------------------------------------------------------------------------
  // Form interactions
  // -------------------------------------------------------------------------
  describe("form interactions", () => {
    it("updates title when user types in title input", () => {
      renderPage();
      fireEvent.change(screen.getByTestId("input-saga-title"), {
        target: { value: "My New Title" },
      });
      expect(screen.getByTestId("input-saga-title")).toHaveValue(
        "My New Title"
      );
    });

    it("updates content when user types in content textarea", () => {
      renderPage();
      fireEvent.change(screen.getByTestId("textarea-saga-content"), {
        target: { value: "My new saga content here." },
      });
      expect(screen.getByTestId("textarea-saga-content")).toHaveValue(
        "My new saga content here."
      );
    });
  });

  // -------------------------------------------------------------------------
  // Form submission — success
  // -------------------------------------------------------------------------
  describe("form submission — success", () => {
    it("calls saveSaga with correct data on form submit", async () => {
      renderPage();
      fireEvent.change(screen.getByTestId("input-saga-title"), {
        target: { value: "Updated Saga" },
      });
      fireEvent.change(screen.getByTestId("textarea-saga-content"), {
        target: { value: "Updated content here." },
      });
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(mockSaveSaga).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Saga",
          content: "Updated content here.",
          version: "1.0",
          createdBy: "user-1",
        })
      );
    });

    it("shows success message after successful save", async () => {
      renderPage();
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(screen.getByTestId("typography-success")).toHaveTextContent(
        "Saga updated successfully"
      );
    });

    it("navigates to /story/saga after successful save (after delay)", async () => {
      jest.useFakeTimers();
      renderPage();
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/saga");
      jest.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Form submission — validation
  // -------------------------------------------------------------------------
  describe("form submission — validation", () => {
    it("shows validation error when title is empty", async () => {
      renderPage();
      // Clear the title
      fireEvent.change(screen.getByTestId("input-saga-title"), {
        target: { value: "   " },
      });
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Title is required"
      );
    });

    it("shows validation error when content is empty", async () => {
      renderPage();
      // Clear the content
      fireEvent.change(screen.getByTestId("textarea-saga-content"), {
        target: { value: "   " },
      });
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Content is required"
      );
    });

    it("does NOT call saveSaga when title is empty", async () => {
      renderPage();
      fireEvent.change(screen.getByTestId("input-saga-title"), {
        target: { value: "" },
      });
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(mockSaveSaga).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Form submission — saveSaga failure
  // -------------------------------------------------------------------------
  describe("form submission — saveSaga failure", () => {
    it("shows error message when saveSaga returns false", async () => {
      mockSaveSaga.mockResolvedValue(false);
      renderPage();
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Failed to save saga"
      );
    });

    it("does NOT navigate when saveSaga fails", async () => {
      mockSaveSaga.mockResolvedValue(false);
      renderPage();
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Cancel navigation
  // -------------------------------------------------------------------------
  describe("cancel navigation", () => {
    it("navigates to /story/saga when Cancel is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-cancel"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/saga");
    });
  });

  // -------------------------------------------------------------------------
  // Export chapter content
  // -------------------------------------------------------------------------
  describe("export chapter content", () => {
    it("calls exportChaptersAsText when Export button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-export-chapter-content"));
      expect(mockExportChaptersAsText).toHaveBeenCalledWith(mockChapters);
    });

    it("shows error when no chapters available to export", () => {
      mockChapters = [];
      renderPage();
      fireEvent.click(screen.getByTestId("button-export-chapter-content"));
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "No chapters available to export"
      );
    });

    it("does NOT call exportChaptersAsText when no chapters available", () => {
      mockChapters = [];
      renderPage();
      fireEvent.click(screen.getByTestId("button-export-chapter-content"));
      expect(mockExportChaptersAsText).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Export info dialog
  // -------------------------------------------------------------------------
  describe("export info dialog", () => {
    it("opens export info dialog when help icon is clicked", () => {
      renderPage();
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId("help-circle-icon").closest("button")!);
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("shows dialog title 'About Chapter Export'", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("help-circle-icon").closest("button")!);
      expect(screen.getByTestId("dialog-title")).toHaveTextContent(
        "About Chapter Export"
      );
    });

    it("closes dialog when dialog close button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("help-circle-icon").closest("button")!);
      fireEvent.click(screen.getByTestId("dialog-close"));
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });
});
