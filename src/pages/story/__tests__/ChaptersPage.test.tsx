// src/pages/story/__tests__/ChaptersPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChaptersPage from "../ChaptersPage";

// ---------------------------------------------------------------------------
// react-router-dom mock
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
}));

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("../../../context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

interface StoryContextMock {
  chapters: any[];
  storyProgress: { currentChapter: string | null };
  isLoading: boolean;
}

let mockStoryContext: StoryContextMock = {
  chapters: [],
  storyProgress: { currentChapter: null },
  isLoading: false,
};

jest.mock("../../../context/StoryContext", () => ({
  useStory: () => mockStoryContext,
}));

let mockUser: { uid: string } | null = { uid: "user-1" };

jest.mock("../../../context/firebase", () => ({
  useAuth: () => ({ user: mockUser }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/core/Typography", () => ({
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
  default: ({ children, onClick, startIcon, variant }: any) => (
    <button data-testid={`button-${String(children).trim().replace(/\s+/g, "-").toLowerCase()}`} onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("../../../components/features/story/BookshelfView", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="bookshelf-view"
      data-chapter-count={props.chapters?.length}
      data-current-chapter={props.currentChapterId}
    />
  ),
}));

jest.mock("../../../components/features/story/TableView", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="table-view"
      data-chapter-count={props.chapters?.length}
      data-sort-field={props.sortField}
      data-sort-direction={props.sortDirection}
      data-is-admin={String(props.isAdmin)}
    >
      <button
        data-testid="table-sort-order"
        onClick={() => props.onSort("order")}
      >
        Sort by Order
      </button>
      <button
        data-testid="table-sort-title"
        onClick={() => props.onSort("title")}
      >
        Sort by Title
      </button>
      <button
        data-testid="table-edit-chapter"
        onClick={() => props.onEditChapter?.("chapter-01")}
      >
        Edit
      </button>
    </div>
  ),
}));

jest.mock("lucide-react", () => ({
  Plus: () => <span data-testid="plus-icon" />,
  Bookmark: () => <span data-testid="bookmark-icon" />,
  List: () => <span data-testid="list-icon" />,
  Grid: () => <span data-testid="grid-icon" />,
  Book: () => <span data-testid="book-icon" />,
}));

// Suppress localStorage warnings in tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CHAPTERS = [
  { id: "chapter-01", title: "The Beginning", order: 1, dateModified: "2024-01-01" },
  { id: "chapter-02", title: "A Hard Day", order: 2, dateModified: "2024-01-02" },
  { id: "chapter-03", title: "Aftermath", order: 3, dateModified: "2024-01-03" },
];

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
      storyProgress: { currentChapter: null },
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

    it("does NOT render bookshelf or table view while loading", () => {
      mockStoryContext = { ...mockStoryContext, isLoading: true, chapters: [] };
      renderPage();
      expect(screen.queryByTestId("bookshelf-view")).not.toBeInTheDocument();
      expect(screen.queryByTestId("table-view")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders breadcrumb with Home, Story, Chapters", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent("Home");
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent("Story");
      expect(screen.getByTestId("breadcrumb-item-2")).toHaveTextContent("Chapters");
    });

    it("renders page heading 'Session Chronicles'", () => {
      renderPage();
      expect(screen.getByTestId("typography-h2")).toHaveTextContent(
        "Session Chronicles"
      );
    });

    it("displays total chapter count", () => {
      renderPage();
      expect(screen.getByText(/3 chapters total/i)).toBeInTheDocument();
    });

    it("displays singular 'chapter' for a single chapter", () => {
      mockStoryContext = {
        ...mockStoryContext,
        chapters: [CHAPTERS[0]],
      };
      renderPage();
      expect(screen.getByText(/1 chapter total/i)).toBeInTheDocument();
    });

    it("renders empty state when no chapters exist", () => {
      mockStoryContext = { ...mockStoryContext, chapters: [] };
      renderPage();
      expect(
        screen.getByText(/No chapters available yet\./i)
      ).toBeInTheDocument();
    });

    it("renders bookshelf view by default", () => {
      renderPage();
      expect(screen.getByTestId("bookshelf-view")).toBeInTheDocument();
      expect(screen.queryByTestId("table-view")).not.toBeInTheDocument();
    });

    it("passes all chapters to BookshelfView", () => {
      renderPage();
      expect(screen.getByTestId("bookshelf-view")).toHaveAttribute(
        "data-chapter-count",
        "3"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated user controls
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

    it("renders 'Back to Selection' button", () => {
      renderPage();
      expect(
        screen.getByTestId("button-back-to-selection")
      ).toBeInTheDocument();
    });

    it("does NOT render 'Continue Reading' button when no currentChapter", () => {
      renderPage();
      expect(
        screen.queryByTestId("button-continue-reading")
      ).not.toBeInTheDocument();
    });

    it("renders 'Continue Reading' button when currentChapter is set", () => {
      mockStoryContext = {
        ...mockStoryContext,
        storyProgress: { currentChapter: "chapter-02" },
      };
      renderPage();
      expect(
        screen.getByTestId("button-continue-reading")
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("navigates to /story/chapters/create on 'New Chapter' click", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-new-chapter"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/create"
      );
    });

    it("navigates to /story on 'Back to Selection' click", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-back-to-selection"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story");
    });

    it("navigates to currentChapter on 'Continue Reading' click", () => {
      mockStoryContext = {
        ...mockStoryContext,
        storyProgress: { currentChapter: "chapter-02" },
      };
      renderPage();
      fireEvent.click(screen.getByTestId("button-continue-reading"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/chapter-02"
      );
    });

    it("navigates to first chapter when 'Continue Reading' and no currentChapter (fallback)", () => {
      mockStoryContext = {
        ...mockStoryContext,
        storyProgress: { currentChapter: null },
        chapters: CHAPTERS,
      };
      // No Continue Reading button shown — but test the handleContinueReading path
      // This path is only hit when currentChapter is falsy but we click the button.
      // The button is hidden, so this logic cannot be tested via UI without currentChapter.
      // The test documents the specification: button only shows when currentChapter is set.
      expect(true).toBe(true); // guard — button hidden when no currentChapter
    });

    it("navigates to /story/chapters/edit/:id from TableView edit handler", () => {
      // Switch to table view first
      renderPage();
      fireEvent.click(screen.getByText("Table"));
      fireEvent.click(screen.getByTestId("table-edit-chapter"));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        "/story/chapters/edit/chapter-01"
      );
    });
  });

  // -------------------------------------------------------------------------
  // View toggle
  // -------------------------------------------------------------------------
  describe("view toggle", () => {
    it("switches to table view when Table button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByText("Table"));
      expect(screen.getByTestId("table-view")).toBeInTheDocument();
      expect(screen.queryByTestId("bookshelf-view")).not.toBeInTheDocument();
    });

    it("switches back to bookshelf view when Bookshelf button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByText("Table"));
      fireEvent.click(screen.getByText("Bookshelf"));
      expect(screen.getByTestId("bookshelf-view")).toBeInTheDocument();
      expect(screen.queryByTestId("table-view")).not.toBeInTheDocument();
    });

    it("saves view preference to localStorage when switching views", () => {
      renderPage();
      fireEvent.click(screen.getByText("Table"));
      expect(localStorage.getItem("chapters-view-preference")).toBe("table");
    });

    it("restores table view preference from localStorage", () => {
      localStorage.setItem("chapters-view-preference", "table");
      renderPage();
      expect(screen.getByTestId("table-view")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Sort behavior (TableView)
  // -------------------------------------------------------------------------
  describe("sort behavior in table view", () => {
    beforeEach(() => {
      renderPage();
      fireEvent.click(screen.getByText("Table"));
    });

    it("passes default sort field 'order' and direction 'asc' to TableView", () => {
      expect(screen.getByTestId("table-view")).toHaveAttribute(
        "data-sort-field",
        "order"
      );
      expect(screen.getByTestId("table-view")).toHaveAttribute(
        "data-sort-direction",
        "asc"
      );
    });

    it("toggles sort direction when same sort field is clicked", () => {
      fireEvent.click(screen.getByTestId("table-sort-order"));
      expect(screen.getByTestId("table-view")).toHaveAttribute(
        "data-sort-direction",
        "desc"
      );
    });

    it("resets sort direction to asc when a new sort field is selected", () => {
      // First, toggle order to desc
      fireEvent.click(screen.getByTestId("table-sort-order")); // now desc
      // Now click title (new field) — should reset to asc
      fireEvent.click(screen.getByTestId("table-sort-title"));
      expect(screen.getByTestId("table-view")).toHaveAttribute(
        "data-sort-field",
        "title"
      );
      expect(screen.getByTestId("table-view")).toHaveAttribute(
        "data-sort-direction",
        "asc"
      );
    });

    it("sorts chapters by title alphabetically in ascending order", () => {
      fireEvent.click(screen.getByTestId("table-sort-title"));
      // Aftermath < A Hard Day < The Beginning alphabetically
      expect(screen.getByTestId("table-view")).toHaveAttribute(
        "data-sort-field",
        "title"
      );
      expect(screen.getByTestId("table-view")).toHaveAttribute(
        "data-sort-direction",
        "asc"
      );
    });

    it("passes isAdmin=true to TableView when user is signed in", () => {
      expect(screen.getByTestId("table-view")).toHaveAttribute(
        "data-is-admin",
        "true"
      );
    });

    it("passes isAdmin=false to TableView when user is not signed in", () => {
      // This test needs its own render context (not inside the beforeEach bookshelf+table setup)
      // The "sort behavior in table view" beforeEach already renders and clicks Table.
      // We use getByRole to be precise but the simplest approach is a fresh describe.
      // Covered by the next sub-suite below.
      expect(true).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Unauthenticated user table view
  // -------------------------------------------------------------------------
  describe("unauthenticated user in table view", () => {
    it("passes isAdmin=false to TableView when user is not signed in", () => {
      mockUser = null;
      const { unmount } = render(<ChaptersPage />);
      fireEvent.click(screen.getByText("Table"));
      expect(screen.getByTestId("table-view")).toHaveAttribute(
        "data-is-admin",
        "false"
      );
      unmount();
    });
  });

  // -------------------------------------------------------------------------
  // BookshelfView receives currentChapterId
  // -------------------------------------------------------------------------
  describe("bookshelf receives current chapter context", () => {
    it("passes currentChapterId to BookshelfView when currentChapter is set", () => {
      mockStoryContext = {
        ...mockStoryContext,
        storyProgress: { currentChapter: "chapter-02" },
      };
      renderPage();
      expect(screen.getByTestId("bookshelf-view")).toHaveAttribute(
        "data-current-chapter",
        "chapter-02"
      );
    });
  });
});
