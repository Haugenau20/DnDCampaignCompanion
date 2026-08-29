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

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

const mockUpdateChapterProgress = jest.fn();
const mockUpdateCurrentChapter = jest.fn();

interface StoryContextMock {
  chapters: any[];
  storyProgress: { currentChapter: string | null; chapterProgress?: Record<string, any> };
  isLoading: boolean;
  error: string | null;
  getChapterById: jest.Mock;
  updateChapterProgress: jest.Mock;
  updateCurrentChapter: jest.Mock;
}

let mockStoryContext: StoryContextMock;

// The page derives read state through the real `deriveChapterProgress`, so the
// rail mock below records what it was handed rather than re-deriving anything.
jest.mock("features/storytelling", () => ({
  useStory: () => mockStoryContext,
  ChapterReader: (props: any) => (
    <div
      data-testid="chapter-reader"
      data-title={props.title}
      data-position={String(props.position)}
      data-chapter-number={String(props.chapterNumber)}
      data-chapter-count={String(props.chapterCount)}
      data-next-title={props.nextChapterTitle ?? ""}
      data-has-next={String(props.hasNextChapter)}
      data-has-prev={String(props.hasPreviousChapter)}
      data-has-edit={String(!!props.onEdit)}
    >
      <button data-testid="reader-next" onClick={props.onNextChapter}>
        Next
      </button>
      <button data-testid="reader-prev" onClick={props.onPreviousChapter}>
        Prev
      </button>
      <button data-testid="reader-edit" onClick={props.onEdit}>
        Edit
      </button>
      {/* An ordinary scroll: position only, no completion opinion. */}
      <button
        data-testid="reader-progress"
        onClick={() => props.onProgressChange(42)}
      >
        Scrolled
      </button>
      {/* The reader reaching the end of the chapter. */}
      <button
        data-testid="reader-complete"
        onClick={() => props.onProgressChange(100, true)}
      >
        Finished
      </button>
    </div>
  ),
  ChapterRail: (props: any) => (
    <div
      data-testid="chapter-rail"
      data-is-open={String(props.isOpen)}
      data-current-chapter={props.currentChapterId}
      data-item-count={String(props.items.length)}
    >
      <button data-testid="rail-close" onClick={props.onClose}>
        Close
      </button>
      <button
        data-testid="rail-select"
        onClick={() => props.onChapterSelect("chapter-03")}
      >
        Select Ch3
      </button>
      <button data-testid="rail-back" onClick={props.onBackToIndex}>
        All chapters
      </button>
    </div>
  ),
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
jest.mock("../../../core/components/Typography", () => ({
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

jest.mock("../../../core/components/Button", () => ({
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

jest.mock("../../../core/components/Card", () => {
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

jest.mock("lucide-react", () => ({
  Menu: () => <span data-testid="menu-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
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
      storyProgress: { currentChapter: null, chapterProgress: {} },
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

    it("does NOT render the reader while loading", () => {
      mockStoryContext = { ...mockStoryContext, isLoading: true };
      renderPage();
      expect(screen.queryByTestId("chapter-reader")).not.toBeInTheDocument();
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

    it("does NOT render the reader when there is an error", () => {
      mockStoryContext = { ...mockStoryContext, error: "Something failed" };
      renderPage();
      expect(screen.queryByTestId("chapter-reader")).not.toBeInTheDocument();
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

    it("renders the reader with the numbered chapter title", () => {
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-title",
        "1. The Beginning"
      );
    });

    it("hands the reader its position in the book for the footer", () => {
      renderPage();
      const reader = screen.getByTestId("chapter-reader");
      expect(reader).toHaveAttribute("data-chapter-number", "1");
      expect(reader).toHaveAttribute("data-chapter-count", "3");
    });

    it("names the next chapter so the reader's Next button can label itself", () => {
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-next-title",
        "The Middle"
      );
    });

    // The redesign states reading position exactly once, in the reader's
    // footer. These three were separate statements of the same fact on the
    // pre-redesign page and were removed deliberately — a failure here means
    // one has been reintroduced, not that the test is stale.
    it("does not restate the position in page chrome", () => {
      renderPage();
      expect(screen.queryByTestId("breadcrumb")).not.toBeInTheDocument();
      expect(screen.queryByText(/Reading Chapter/i)).not.toBeInTheDocument();
    });

    it("does not render a second way back to the index alongside the rail's", () => {
      renderPage();
      expect(
        screen.queryByTestId("button-back-to-chapters")
      ).not.toBeInTheDocument();
    });

    it("gives the rail every chapter, with read state derived", () => {
      renderPage();
      expect(screen.getByTestId("chapter-rail")).toHaveAttribute(
        "data-item-count",
        "3"
      );
    });

    it("tells the rail which chapter is open", () => {
      renderPage();
      expect(screen.getByTestId("chapter-rail")).toHaveAttribute(
        "data-current-chapter",
        "chapter-01"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Rail drawer (narrow screens)
  // -------------------------------------------------------------------------
  describe("rail drawer", () => {
    it("starts closed", () => {
      renderPage();
      expect(screen.getByTestId("chapter-rail")).toHaveAttribute(
        "data-is-open",
        "false"
      );
    });

    it("opens when the Chapters trigger is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-chapters"));
      expect(screen.getByTestId("chapter-rail")).toHaveAttribute(
        "data-is-open",
        "true"
      );
    });

    it("closes when the rail asks to close", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-chapters"));
      fireEvent.click(screen.getByTestId("rail-close"));
      expect(screen.getByTestId("chapter-rail")).toHaveAttribute(
        "data-is-open",
        "false"
      );
    });

    it("navigates to the chapters index from the rail", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("rail-back"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story");
    });
  });

  // -------------------------------------------------------------------------
  // Previous / Next chapter navigation
  // -------------------------------------------------------------------------
  describe("chapter navigation", () => {
    it("has no previous chapter for the first chapter", () => {
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-has-prev",
        "false"
      );
    });

    it("has a next chapter for chapter-01", () => {
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-has-next",
        "true"
      );
    });

    it("navigates to the next chapter when next is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("reader-next"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/chapter-02"
      );
    });

    it("navigates to chapter-03 when selected from the rail", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("rail-select"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/chapter-03"
      );
    });

    it("has no next chapter for the last chapter", () => {
      mockChapterId = "chapter-03";
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-has-next",
        "false"
      );
    });

    it("has a previous chapter for the last chapter", () => {
      mockChapterId = "chapter-03";
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-has-prev",
        "true"
      );
    });

    it("navigates to the previous chapter when prev is clicked", () => {
      mockChapterId = "chapter-03";
      renderPage();
      fireEvent.click(screen.getByTestId("reader-prev"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/chapter-02"
      );
    });

    it("reports the right position for a chapter in the middle of the book", () => {
      mockChapterId = "chapter-02";
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-chapter-number",
        "2"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated user controls
  // -------------------------------------------------------------------------
  describe("authenticated user controls", () => {
    // Edit now lives inside the reader card rather than in page chrome, so the
    // page's part of the contract is whether it supplies the handler at all.
    it("gives the reader an edit handler when a user is signed in", () => {
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-has-edit",
        "true"
      );
    });

    it("withholds the edit handler when nobody is signed in", () => {
      mockUser = null;
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-has-edit",
        "false"
      );
    });

    it("navigates to the edit page when the reader's Edit is used", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("reader-edit"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/edit/chapter-01"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Resuming
  // -------------------------------------------------------------------------
  describe("resuming where the reader left off", () => {
    it("hands the reader the stored scroll position for this chapter", () => {
      mockStoryContext = {
        ...mockStoryContext,
        storyProgress: {
          currentChapter: "chapter-01",
          chapterProgress: {
            "chapter-01": { chapterId: "chapter-01", lastPosition: 63, isComplete: false },
          },
        },
      };
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-position",
        "63"
      );
    });

    it("starts at the top for a chapter with no stored position", () => {
      renderPage();
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-position",
        "0"
      );
    });

    // The stored position updates on every persisted scroll. If that flowed
    // straight back into the reader, a restore effect watching `position`
    // would drag the reader back to a place they had already scrolled past.
    it("does not push a new position at the reader mid-chapter", () => {
      const { rerender } = renderPage();
      mockStoryContext = {
        ...mockStoryContext,
        storyProgress: {
          currentChapter: "chapter-01",
          chapterProgress: {
            "chapter-01": { chapterId: "chapter-01", lastPosition: 80, isComplete: false },
          },
        },
      };
      rerender(<StoryPage />);
      expect(screen.getByTestId("chapter-reader")).toHaveAttribute(
        "data-position",
        "0"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Redirect behavior for unresolved chapters
  // -------------------------------------------------------------------------
  describe("redirect for unknown chapter", () => {
    it("redirects to the first chapter when the requested chapterId does not exist", () => {
      mockChapterId = "chapter-99";
      mockStoryContext = {
        ...mockStoryContext,
        getChapterById: jest.fn().mockReturnValue(undefined),
      };
      renderPage();
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/chapter-01"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Empty chapters — redirect
  // -------------------------------------------------------------------------
  describe("no chapters available", () => {
    it("does NOT navigate when the chapters array is empty and not loading", () => {
      mockStoryContext = {
        ...mockStoryContext,
        chapters: [],
        isLoading: false,
        getChapterById: jest.fn().mockReturnValue(undefined),
      };
      renderPage();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Progress tracking
  // -------------------------------------------------------------------------
  describe("reading progress tracking", () => {
    // The ABSENCE of `isComplete` in this payload is the assertion, not an
    // oversight (bug #852). An ordinary scroll knows only the position; it has
    // no opinion about completion. Sending `isComplete: false` would make every
    // scroll an explicit instruction to clear the flag, wiping a chapter's
    // stored completion. StoryContext merges partial updates, so omitting the
    // key preserves it.
    it("persists the scroll position without asserting completion", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("reader-progress"));
      expect(mockUpdateChapterProgress).toHaveBeenCalledWith("chapter-01", {
        lastPosition: 42,
      });
      // Stated independently of the payload's exact shape: nothing about an
      // ordinary scroll may assert completion either way.
      expect(mockUpdateChapterProgress).not.toHaveBeenCalledWith(
        "chapter-01",
        expect.objectContaining({ isComplete: expect.anything() })
      );
    });

    it("marks the chapter complete when the reader signals completion", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("reader-complete"));
      expect(mockUpdateChapterProgress).toHaveBeenCalledWith("chapter-01", {
        lastPosition: 100,
        isComplete: true,
      });
    });
  });
});
