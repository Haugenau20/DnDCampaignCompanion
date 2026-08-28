// src/pages/story/__tests__/ChaptersPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChaptersPage from "../ChaptersPage";

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

interface StoryContextMock {
  chapters: any[];
  storyProgress: { currentChapter: string; chapterProgress: Record<string, any> };
  isLoading: boolean;
}

const NO_PROGRESS = { currentChapter: "", chapterProgress: {} };

let mockStoryContext: StoryContextMock = {
  chapters: [],
  storyProgress: NO_PROGRESS,
  isLoading: false,
};

// `features/storytelling`'s barrel is mocked here — but the utils import
// (`features/storytelling/chapters/utils/chapter-progress`) is deliberately
// left real, since ChaptersPage's filtering/derivation behaviour is exactly
// what these tests exercise, and that module already has its own test suite
// backing its contract.
//
// `ChapterList` doesn't exist yet (a parallel change is adding it); this stub
// stands in so ChaptersPage's own tests aren't blocked on that landing.
jest.mock("features/storytelling", () => ({
  useStory: () => mockStoryContext,
  BookshelfView: (props: any) => (
    <div
      data-testid="bookshelf-view"
      data-count={props.items?.length}
      data-is-admin={String(props.isAdmin)}
    >
      {props.items?.map((item: any) => (
        <div key={item.chapter.id}>
          <span data-testid={`shelf-title-${item.chapter.id}`}>{item.chapter.title}</span>
          <button
            data-testid={`shelf-select-${item.chapter.id}`}
            onClick={() => props.onChapterSelect(item.chapter.id)}
          >
            select
          </button>
          <button
            data-testid={`shelf-edit-${item.chapter.id}`}
            onClick={() => props.onEditChapter(item.chapter.id)}
          >
            edit
          </button>
        </div>
      ))}
    </div>
  ),
  ChapterList: (props: any) => (
    <div
      data-testid="chapter-list"
      data-count={props.items?.length}
      data-is-admin={String(props.isAdmin)}
    >
      {props.items?.map((item: any) => (
        <div key={item.chapter.id}>
          <span data-testid={`list-title-${item.chapter.id}`}>{item.chapter.title}</span>
          <button
            data-testid={`list-select-${item.chapter.id}`}
            onClick={() => props.onChapterSelect(item.chapter.id)}
          >
            select
          </button>
          <button
            data-testid={`list-edit-${item.chapter.id}`}
            onClick={() => props.onEditChapter(item.chapter.id)}
          >
            edit
          </button>
        </div>
      ))}
    </div>
  ),
}));

let mockUser: { uid: string } | null = { uid: "user-1" };

jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("core/components/Typography", () => ({
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

jest.mock("shared/components/Breadcrumb", () => ({
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

jest.mock("core/components/Button", () => ({
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

jest.mock("../components/StoryViewTabs", () => ({
  __esModule: true,
  default: () => <div data-testid="story-view-tabs" />,
}));

jest.mock("lucide-react", () => ({
  Plus: () => <span data-testid="plus-icon" />,
  List: () => <span data-testid="list-icon" />,
  Grid: () => <span data-testid="grid-icon" />,
}));

// Suppress localStorage warnings in tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CHAPTERS = [
  { id: "chapter-01", title: "The Beginning", order: 1, content: "", summary: "Where it all started" },
  { id: "chapter-02", title: "A Hard Day", order: 2, content: "", summary: "Trouble brews in the north" },
  { id: "chapter-03", title: "Aftermath", order: 3, content: "", summary: "Picking up the pieces" },
];

// chapter-01 read, chapter-02 current/reading at 62%, chapter-03 unread.
const PROGRESS_STARTED = {
  currentChapter: "chapter-02",
  chapterProgress: {
    "chapter-01": { chapterId: "chapter-01", lastPosition: 100, isComplete: true, lastRead: new Date() },
    "chapter-02": { chapterId: "chapter-02", lastPosition: 62, isComplete: false, lastRead: new Date() },
  },
};

function renderPage() {
  return render(<ChaptersPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ChaptersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockUser = { uid: "user-1" };
    mockStoryContext = {
      chapters: CHAPTERS,
      storyProgress: NO_PROGRESS,
      isLoading: false,
    };
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    it("shows loading message while chapters are loading", () => {
      mockStoryContext = { ...mockStoryContext, isLoading: true, chapters: [] };
      renderPage();
      expect(screen.getByTestId("typography-default")).toHaveTextContent(
        "Loading chapters..."
      );
    });

    it("does NOT render bookshelf or list view while loading", () => {
      mockStoryContext = { ...mockStoryContext, isLoading: true, chapters: [] };
      renderPage();
      expect(screen.queryByTestId("bookshelf-view")).not.toBeInTheDocument();
      expect(screen.queryByTestId("chapter-list")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders breadcrumb with Home, Story, Chapters", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent("Home");
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent("Story");
      expect(screen.getByTestId("breadcrumb-item-2")).toHaveTextContent("Chapters");
    });

    it("renders page heading 'Session Chronicles'", () => {
      renderPage();
      expect(screen.getByTestId("typography-h2")).toHaveTextContent("Session Chronicles");
    });

    it("renders StoryViewTabs in the header", () => {
      renderPage();
      expect(screen.getByTestId("story-view-tabs")).toBeInTheDocument();
    });

    it("renders empty state when no chapters exist at all", () => {
      mockStoryContext = { ...mockStoryContext, chapters: [] };
      renderPage();
      expect(screen.getByText(/No chapters available yet\./i)).toBeInTheDocument();
    });

    it("does not render the search/filter row when there are no chapters", () => {
      mockStoryContext = { ...mockStoryContext, chapters: [] };
      renderPage();
      expect(screen.queryByPlaceholderText(/Search chapter titles/i)).not.toBeInTheDocument();
    });

    it("renders the shelf view by default", () => {
      renderPage();
      expect(screen.getByTestId("bookshelf-view")).toBeInTheDocument();
      expect(screen.queryByTestId("chapter-list")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // ResumeBar wiring
  // -------------------------------------------------------------------------
  describe("resume bar wiring", () => {
    it("shows 'Start reading' when nothing has been read", () => {
      renderPage();
      expect(screen.getByTestId("typography-h4")).toHaveTextContent("Start reading");
    });

    it("shows the current chapter when progress exists", () => {
      mockStoryContext = { ...mockStoryContext, storyProgress: PROGRESS_STARTED };
      renderPage();
      expect(screen.getByText(/Chapter 2: A Hard Day/)).toBeInTheDocument();
    });

    it("navigates to the resume chapter when Resume is clicked", () => {
      mockStoryContext = { ...mockStoryContext, storyProgress: PROGRESS_STARTED };
      renderPage();
      fireEvent.click(screen.getByText("Resume"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/chapters/chapter-02");
    });
  });

  // -------------------------------------------------------------------------
  // User controls
  // -------------------------------------------------------------------------
  describe("user controls", () => {
    it("renders 'New Chapter' button when user is signed in", () => {
      renderPage();
      expect(screen.getByTestId("button-new-chapter")).toBeInTheDocument();
    });

    it("does NOT render 'New Chapter' button when user is not signed in", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("button-new-chapter")).not.toBeInTheDocument();
    });

    it("navigates to /story/chapters/create on 'New Chapter' click", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-new-chapter"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/chapters/create");
    });
  });

  // -------------------------------------------------------------------------
  // View toggle
  // -------------------------------------------------------------------------
  describe("view toggle", () => {
    it("switches to list view when List is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByText("List"));
      expect(screen.getByTestId("chapter-list")).toBeInTheDocument();
      expect(screen.queryByTestId("bookshelf-view")).not.toBeInTheDocument();
    });

    it("switches back to shelf view when Shelf is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByText("List"));
      fireEvent.click(screen.getByText("Shelf"));
      expect(screen.getByTestId("bookshelf-view")).toBeInTheDocument();
      expect(screen.queryByTestId("chapter-list")).not.toBeInTheDocument();
    });

    it("saves view preference to localStorage when switching views", () => {
      renderPage();
      fireEvent.click(screen.getByText("List"));
      expect(localStorage.getItem("chapters-view-preference")).toBe("list");
    });

    it("restores list view preference from localStorage", () => {
      localStorage.setItem("chapters-view-preference", "list");
      renderPage();
      expect(screen.getByTestId("chapter-list")).toBeInTheDocument();
    });

    it("treats a legacy 'table' preference as 'list'", () => {
      localStorage.setItem("chapters-view-preference", "table");
      renderPage();
      expect(screen.getByTestId("chapter-list")).toBeInTheDocument();
    });

    it("treats a legacy 'bookshelf' preference as 'shelf'", () => {
      localStorage.setItem("chapters-view-preference", "bookshelf");
      renderPage();
      expect(screen.getByTestId("bookshelf-view")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Search + unread filter
  // -------------------------------------------------------------------------
  describe("search and filter", () => {
    it("shows All/Unread pills with live counts", () => {
      mockStoryContext = { ...mockStoryContext, storyProgress: PROGRESS_STARTED };
      renderPage();
      expect(screen.getByText("All 3")).toBeInTheDocument();
      // chapter-01 is read; chapter-02 and chapter-03 are not => 2 unread
      expect(screen.getByText("Unread 2")).toBeInTheDocument();
    });

    it("filters to unread chapters when the Unread pill is clicked", () => {
      mockStoryContext = { ...mockStoryContext, storyProgress: PROGRESS_STARTED };
      renderPage();
      fireEvent.click(screen.getByText("Unread 2"));
      expect(screen.queryByTestId("shelf-title-chapter-01")).not.toBeInTheDocument();
      expect(screen.getByTestId("shelf-title-chapter-02")).toBeInTheDocument();
      expect(screen.getByTestId("shelf-title-chapter-03")).toBeInTheDocument();
    });

    it("returns to all chapters when the All pill is clicked again", () => {
      mockStoryContext = { ...mockStoryContext, storyProgress: PROGRESS_STARTED };
      renderPage();
      fireEvent.click(screen.getByText("Unread 2"));
      fireEvent.click(screen.getByText("All 3"));
      expect(screen.getByTestId("shelf-title-chapter-01")).toBeInTheDocument();
    });

    it("persists the active filter to localStorage", () => {
      renderPage();
      fireEvent.click(screen.getByText(/Unread/));
      expect(localStorage.getItem("chapters-filter-preference")).toBe("unread");
    });

    it("restores the unread filter from localStorage", () => {
      localStorage.setItem("chapters-filter-preference", "unread");
      mockStoryContext = { ...mockStoryContext, storyProgress: PROGRESS_STARTED };
      renderPage();
      expect(screen.queryByTestId("shelf-title-chapter-01")).not.toBeInTheDocument();
    });

    it("filters by search query across title and summary", () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText(/Search chapter titles/i), {
        target: { value: "hard day" },
      });
      expect(screen.getByTestId("shelf-title-chapter-02")).toBeInTheDocument();
      expect(screen.queryByTestId("shelf-title-chapter-01")).not.toBeInTheDocument();
      expect(screen.queryByTestId("shelf-title-chapter-03")).not.toBeInTheDocument();
    });

    it("updates pill counts live as the search query changes", () => {
      mockStoryContext = { ...mockStoryContext, storyProgress: PROGRESS_STARTED };
      renderPage();
      fireEvent.change(screen.getByPlaceholderText(/Search chapter titles/i), {
        target: { value: "aftermath" },
      });
      expect(screen.getByText("All 1")).toBeInTheDocument();
      expect(screen.getByText("Unread 1")).toBeInTheDocument();
    });

    it("shows a no-results message when the search matches nothing", () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText(/Search chapter titles/i), {
        target: { value: "nonexistent chapter title" },
      });
      expect(screen.getByText(/No chapters match your search\./i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation from child views
  // -------------------------------------------------------------------------
  describe("navigation from child views", () => {
    it("navigates to a chapter on select from the shelf view", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("shelf-select-chapter-01"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/chapters/chapter-01");
    });

    it("navigates to the edit route on edit from the shelf view", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("shelf-edit-chapter-01"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/chapters/edit/chapter-01");
    });

    it("passes isAdmin=true to child views when signed in", () => {
      renderPage();
      expect(screen.getByTestId("bookshelf-view")).toHaveAttribute("data-is-admin", "true");
    });

    it("passes isAdmin=false to child views when signed out", () => {
      mockUser = null;
      renderPage();
      expect(screen.getByTestId("bookshelf-view")).toHaveAttribute("data-is-admin", "false");
    });

    it("passes the full item count to BookshelfView", () => {
      renderPage();
      expect(screen.getByTestId("bookshelf-view")).toHaveAttribute("data-count", "3");
    });
  });
});
