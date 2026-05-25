// src/pages/story/__tests__/ChapterEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ChapterEditPage from "../ChapterEditPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
let mockChapterId: string | undefined = "chapter-01";
const mockNavigateComponent = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ chapterId: mockChapterId }),
  Navigate: ({ to }: { to: string }) => {
    mockNavigateComponent(to);
    return <div data-testid="navigate-redirect" data-to={to} />;
  },
}));

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("../../../context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

const mockDeleteChapter = jest.fn();
const mockGetChapterById = jest.fn();

interface StoryContextMock {
  isLoading: boolean;
  chapters: any[];
  deleteChapter: jest.Mock;
  getChapterById: (id: string) => any;
}

let mockStoryContext: StoryContextMock = {
  isLoading: false,
  chapters: [
    { id: "chapter-01", title: "The Beginning", order: 1 },
    { id: "chapter-02", title: "The Middle", order: 2 },
  ],
  deleteChapter: mockDeleteChapter,
  getChapterById: mockGetChapterById,
};

jest.mock("../../../context/StoryContext", () => ({
  useStory: () => mockStoryContext,
}));

jest.mock("../../../context/firebase", () => ({
  useAuth: () => ({ user: { uid: "user-1" } }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/features/story/ChapterForm", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="chapter-form">
      <span data-testid="chapter-form-mode">{props.mode}</span>
      <span data-testid="chapter-form-chapter-id">{props.chapter?.id}</span>
      <span data-testid="chapter-form-chapter-title">
        {props.chapter?.title}
      </span>
      <button
        data-testid="chapter-form-delete-click"
        onClick={props.onDeleteClick}
      >
        delete
      </button>
    </div>
  ),
}));

jest.mock("../../../components/shared/DeleteConfirmationDialog", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="delete-dialog" data-open={String(props.isOpen)}>
      <span data-testid="delete-dialog-item-name">{props.itemName}</span>
      <button data-testid="delete-dialog-confirm" onClick={props.onConfirm}>
        confirm
      </button>
      <button data-testid="delete-dialog-close" onClick={props.onClose}>
        close
      </button>
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

jest.mock("../../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, variant }: any) => (
    <div data-testid={`typography-${variant ?? "default"}`}>{children}</div>
  ),
}));

jest.mock("lucide-react", () => ({
  BookOpen: () => <span data-testid="book-open-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<ChapterEditPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ChapterEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChapterId = "chapter-01";
    mockStoryContext = {
      isLoading: false,
      chapters: [
        { id: "chapter-01", title: "The Beginning", order: 1 },
        { id: "chapter-02", title: "The Middle", order: 2 },
      ],
      deleteChapter: mockDeleteChapter,
      getChapterById: (id: string) =>
        mockStoryContext.chapters.find((c: any) => c.id === id),
    };
    mockDeleteChapter.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Rendering — chapter found
  // -------------------------------------------------------------------------
  describe("when chapter is found", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders breadcrumb with correct labels including chapter title in last item", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent("Home");
      expect(screen.getByTestId("breadcrumb-item-3")).toHaveTextContent(
        "Edit: The Beginning"
      );
    });

    it("renders the 'Edit Chapter' page heading", () => {
      renderPage();
      expect(screen.getByTestId("typography-h2")).toHaveTextContent(
        "Edit Chapter"
      );
    });

    it("renders ChapterForm in edit mode", () => {
      renderPage();
      expect(screen.getByTestId("chapter-form-mode")).toHaveTextContent("edit");
    });

    it("passes the correct chapter to ChapterForm", () => {
      renderPage();
      expect(screen.getByTestId("chapter-form-chapter-id")).toHaveTextContent(
        "chapter-01"
      );
      expect(
        screen.getByTestId("chapter-form-chapter-title")
      ).toHaveTextContent("The Beginning");
    });

    it("renders the BookOpen icon", () => {
      renderPage();
      expect(screen.getByTestId("book-open-icon")).toBeInTheDocument();
    });

    it("renders DeleteConfirmationDialog (closed by default)", () => {
      renderPage();
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute(
        "data-open",
        "false"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Chapter not found
  // -------------------------------------------------------------------------
  describe("when chapter is not found", () => {
    beforeEach(() => {
      mockChapterId = "chapter-99";
    });

    it("shows 'Chapter not found' message", () => {
      renderPage();
      expect(screen.getByTestId("typography-default")).toHaveTextContent(
        "Chapter not found"
      );
    });

    it("does NOT render ChapterForm", () => {
      renderPage();
      expect(screen.queryByTestId("chapter-form")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    beforeEach(() => {
      mockStoryContext = {
        ...mockStoryContext,
        isLoading: true,
        chapters: [],
        getChapterById: () => undefined,
      };
    });

    it("renders loading indicator", () => {
      renderPage();
      expect(screen.getByTestId("typography-default")).toHaveTextContent(
        "Loading..."
      );
    });

    it("does NOT render ChapterForm while loading", () => {
      renderPage();
      expect(screen.queryByTestId("chapter-form")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Delete dialog behavior
  // -------------------------------------------------------------------------
  describe("delete dialog interaction", () => {
    it("opens delete dialog when onDeleteClick is triggered", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("chapter-form-delete-click"));
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute(
        "data-open",
        "true"
      );
    });

    it("closes delete dialog when onClose is called", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("chapter-form-delete-click")); // open
      fireEvent.click(screen.getByTestId("delete-dialog-close")); // close
      expect(screen.getByTestId("delete-dialog")).toHaveAttribute(
        "data-open",
        "false"
      );
    });

    it("passes correct item name to DeleteConfirmationDialog", () => {
      renderPage();
      expect(screen.getByTestId("delete-dialog-item-name")).toHaveTextContent(
        "Chapter 1: The Beginning"
      );
    });

    it("calls deleteChapter and navigates away on confirm", async () => {
      renderPage();
      fireEvent.click(screen.getByTestId("chapter-form-delete-click")); // open
      await act(async () => {
        fireEvent.click(screen.getByTestId("delete-dialog-confirm"));
      });
      expect(mockDeleteChapter).toHaveBeenCalledWith("chapter-01");
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/chapters");
    });

    it("redirects to /story after deletion (isDeleted=true)", async () => {
      renderPage();
      fireEvent.click(screen.getByTestId("chapter-form-delete-click"));
      await act(async () => {
        fireEvent.click(screen.getByTestId("delete-dialog-confirm"));
      });
      // After deletion, component sets isDeleted=true and renders <Navigate to="/story" />
      expect(screen.getByTestId("navigate-redirect")).toHaveAttribute(
        "data-to",
        "/story"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Breadcrumb — "Edit Chapter" fallback when chapter is still loading
  // When chapter is undefined, the component renders "Chapter not found" before
  // the breadcrumb can be displayed. The generic fallback label "Edit Chapter"
  // is used in the breadcrumb only when the full layout renders but chapter is
  // not yet resolved from a chapters array that contains records
  // (i.e., during the brief window before the useEffect resolves the chapter).
  // The breadcrumb label calculation uses `chapter ? \`Edit: ${chapter.title}\` : 'Edit Chapter'`
  // -------------------------------------------------------------------------
  describe("breadcrumb fallback label calculation", () => {
    it("uses 'Edit: <title>' in breadcrumb when chapter is found", () => {
      renderPage(); // mockChapterId = "chapter-01"
      expect(screen.getByTestId("breadcrumb-item-3")).toHaveTextContent(
        "Edit: The Beginning"
      );
    });
  });
});
