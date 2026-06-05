// src/pages/story/__tests__/StoryPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StoryPage from "../StoryPage";

// ---------------------------------------------------------------------------
// react-router-dom mock
// ---------------------------------------------------------------------------
let mockChapterId: string | undefined = "chapter-01";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ chapterId: mockChapterId }),
}));

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("../../../context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

const mockUpdateChapterProgress = jest.fn();
const mockUpdateCurrentChapter = jest.fn();
const mockGetChapterById = jest.fn();

interface StoryContextMock {
  chapters: any[];
  storyProgress: { currentChapter: string | null };
  isLoading: boolean;
  error: string | null;
  getChapterById: jest.Mock;
  updateChapterProgress: jest.Mock;
  updateCurrentChapter: jest.Mock;
}

let mockStoryContext: StoryContextMock = {
  chapters: [
    { id: "chapter-01", title: "The Beginning", order: 1, content: "Once upon a time..." },
    { id: "chapter-02", title: "The Middle", order: 2, content: "Things got harder..." },
    { id: "chapter-03", title: "The End", order: 3, content: "And they rested." },
  ],
  storyProgress: { currentChapter: null },
  isLoading: false,
  error: null,
  getChapterById: mockGetChapterById,
  updateChapterProgress: mockUpdateChapterProgress,
  updateCurrentChapter: mockUpdateCurrentChapter,
};

jest.mock("../../../context/StoryContext", () => ({
  useStory: () => mockStoryContext,
}));

let mockUser: { uid: string; displayName: string } | null = {
  uid: "user-1",
  displayName: "TestUser",
};

jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
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
  const Card = ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  );
  Card.Content = ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  );
  return { __esModule: true, default: Card };
});

jest.mock("../../../components/features/story/BookViewer", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="book-viewer"
      data-title={props.title}
      data-has-next={String(props.hasNextChapter)}
      data-has-prev={String(props.hasPreviousChapter)}
    >
      <button
        data-testid="book-viewer-next"
        onClick={props.onNextChapter}
      >
        Next
      </button>
      <button
        data-testid="book-viewer-prev"
        onClick={props.onPreviousChapter}
      >
        Prev
      </button>
      <button
        data-testid="book-viewer-page-change"
        onClick={() => props.onPageChange(2)}
      >
        Page Change
      </button>
    </div>
  ),
}));

jest.mock("../../../components/features/story/SlidingChapters", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="sliding-chapters"
      data-is-open={String(props.isOpen)}
      data-current-chapter={props.currentChapterId}
    >
      <button
        data-testid="sliding-chapters-close"
        onClick={props.onClose}
      >
        Close
      </button>
      <button
        data-testid="sliding-chapters-select"
        onClick={() => props.onChapterSelect("chapter-03")}
      >
        Select Ch3
      </button>
    </div>
  ),
}));

jest.mock("lucide-react", () => ({
  Book: () => <span data-testid="book-icon" />,
  Menu: () => <span data-testid="menu-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Edit: () => <span data-testid="edit-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function resolveChapterById(id: string) {
  return mockStoryContext.chapters.find((c: any) => c.id === id);
}

function renderPage() {
  return render(<StoryPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("StoryPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChapterId = "chapter-01";
    mockUser = { uid: "user-1", displayName: "TestUser" };
    mockStoryContext = {
      chapters: [
        { id: "chapter-01", title: "The Beginning", order: 1, content: "Once upon a time..." },
        { id: "chapter-02", title: "The Middle", order: 2, content: "Things got harder..." },
        { id: "chapter-03", title: "The End", order: 3, content: "And they rested." },
      ],
      storyProgress: { currentChapter: null },
      isLoading: false,
      error: null,
      getChapterById: jest.fn().mockImplementation(resolveChapterById),
      updateChapterProgress: mockUpdateChapterProgress,
      updateCurrentChapter: mockUpdateCurrentChapter,
    };
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    it("shows loading card when isLoading is true", () => {
      mockStoryContext = { ...mockStoryContext, isLoading: true };
      renderPage();
      expect(screen.getByText(/Loading chapter\.\.\./i)).toBeInTheDocument();
    });

    it("does NOT render BookViewer while loading", () => {
      mockStoryContext = { ...mockStoryContext, isLoading: true };
      renderPage();
      expect(screen.queryByTestId("book-viewer")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    it("shows error message when error is set", () => {
      mockStoryContext = { ...mockStoryContext, error: "Network error occurred" };
      renderPage();
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Network error occurred"
      );
    });

    it("does NOT render BookViewer when there is an error", () => {
      mockStoryContext = { ...mockStoryContext, error: "Something failed" };
      renderPage();
      expect(screen.queryByTestId("book-viewer")).not.toBeInTheDocument();
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

    it("renders breadcrumb with Home, Story, Session Chapters, and chapter title", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent("Home");
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent("Story");
      expect(screen.getByTestId("breadcrumb-item-2")).toHaveTextContent(
        "Session Chapters"
      );
      // Last breadcrumb shows chapter order and title
      expect(screen.getByTestId("breadcrumb-item-3")).toHaveTextContent(
        "1. The Beginning"
      );
    });

    it("renders BookViewer with chapter title", () => {
      renderPage();
      expect(screen.getByTestId("book-viewer")).toHaveAttribute(
        "data-title",
        "1. The Beginning"
      );
    });

    it("shows chapter counter text with correct count", () => {
      renderPage();
      expect(screen.getByText(/Reading Chapter 1 of 3/i)).toBeInTheDocument();
    });

    it("renders SlidingChapters closed by default", () => {
      renderPage();
      expect(screen.getByTestId("sliding-chapters")).toHaveAttribute(
        "data-is-open",
        "false"
      );
    });

    it("opens SlidingChapters when Chapters button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-chapters"));
      expect(screen.getByTestId("sliding-chapters")).toHaveAttribute(
        "data-is-open",
        "true"
      );
    });

    it("closes SlidingChapters when onClose is called", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-chapters"));
      fireEvent.click(screen.getByTestId("sliding-chapters-close"));
      expect(screen.getByTestId("sliding-chapters")).toHaveAttribute(
        "data-is-open",
        "false"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Previous / Next chapter navigation
  // -------------------------------------------------------------------------
  describe("chapter navigation", () => {
    it("BookViewer has no previous chapter for the first chapter", () => {
      renderPage();
      expect(screen.getByTestId("book-viewer")).toHaveAttribute(
        "data-has-prev",
        "false"
      );
    });

    it("BookViewer has next chapter for chapter-01 (not last)", () => {
      renderPage();
      expect(screen.getByTestId("book-viewer")).toHaveAttribute(
        "data-has-next",
        "true"
      );
    });

    it("navigates to next chapter when next is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("book-viewer-next"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/chapter-02"
      );
    });

    it("navigates to chapter-03 when selected from SlidingChapters", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("sliding-chapters-select"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/chapter-03"
      );
    });

    it("has no next chapter for the last chapter", () => {
      mockChapterId = "chapter-03";
      mockStoryContext = {
        ...mockStoryContext,
        getChapterById: jest.fn().mockImplementation(resolveChapterById),
      };
      renderPage();
      expect(screen.getByTestId("book-viewer")).toHaveAttribute(
        "data-has-next",
        "false"
      );
    });

    it("has previous chapter for last chapter", () => {
      mockChapterId = "chapter-03";
      mockStoryContext = {
        ...mockStoryContext,
        getChapterById: jest.fn().mockImplementation(resolveChapterById),
      };
      renderPage();
      expect(screen.getByTestId("book-viewer")).toHaveAttribute(
        "data-has-prev",
        "true"
      );
    });

    it("navigates to previous chapter when prev is clicked", () => {
      mockChapterId = "chapter-03";
      mockStoryContext = {
        ...mockStoryContext,
        getChapterById: jest.fn().mockImplementation(resolveChapterById),
      };
      renderPage();
      fireEvent.click(screen.getByTestId("book-viewer-prev"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/chapter-02"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated user controls
  // -------------------------------------------------------------------------
  describe("authenticated user controls", () => {
    it("renders Edit button when user is signed in", () => {
      renderPage();
      expect(screen.getByTestId("button-edit")).toBeInTheDocument();
    });

    it("does NOT render Edit button when user is not signed in", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("button-edit")).not.toBeInTheDocument();
    });

    it("navigates to edit page when Edit button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-edit"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/edit/chapter-01"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Back to selection
  // -------------------------------------------------------------------------
  describe("back to selection", () => {
    it("renders 'Back to Selection' button", () => {
      renderPage();
      expect(
        screen.getByTestId("button-back-to-selection")
      ).toBeInTheDocument();
    });

    it("navigates to /story/chapters when Back to Selection is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-back-to-selection"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/chapters");
    });
  });

  // -------------------------------------------------------------------------
  // Redirect behavior for unresolved chapters
  // -------------------------------------------------------------------------
  describe("redirect for unknown chapter", () => {
    it("redirects to first chapter when requested chapterId does not exist", () => {
      mockChapterId = "chapter-99";
      mockStoryContext = {
        ...mockStoryContext,
        getChapterById: jest.fn().mockReturnValue(undefined),
      };
      renderPage();
      // useEffect fires to navigate to first chapter
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/chapter-01"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Empty chapters — redirect
  // -------------------------------------------------------------------------
  describe("no chapters available", () => {
    it("does NOT navigate when chapters array is empty and not loading", () => {
      mockStoryContext = {
        ...mockStoryContext,
        chapters: [],
        isLoading: false,
        getChapterById: jest.fn().mockReturnValue(undefined),
      };
      renderPage();
      // No first chapter to navigate to
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Page change / progress tracking
  // -------------------------------------------------------------------------
  describe("reading progress tracking", () => {
    it("calls updateChapterProgress when BookViewer fires onPageChange", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("book-viewer-page-change"));
      expect(mockUpdateChapterProgress).toHaveBeenCalledWith("chapter-01", {
        lastPosition: 2,
        isComplete: false,
      });
    });
  });
});
