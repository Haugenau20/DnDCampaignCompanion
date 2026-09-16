// src/pages/story/__tests__/ChapterEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
// Page-suite gate mock (shared across Tasks 8-13 -- see page-suite-mock.md)
// ---------------------------------------------------------------------------
let mockUser: { uid: string } | null = { uid: "user-1" };
let mockIsResolving = false;
let mockActiveGroupId: string | null = "group-1";
let mockActiveCampaignId: string | null = "campaign-1";
let mockGroups: Array<{ id: string; name: string }> = [
  { id: "group-1", name: "The Fellowship" },
];

const mockSetActiveGroup = jest.fn().mockResolvedValue(undefined);
const mockSetActiveCampaign = jest.fn().mockResolvedValue(undefined);

jest.mock("features/user-management", () => ({
  useAuth: () => ({ user: mockUser, loading: mockIsResolving }),
  useGroups: () => ({
    activeGroupId: mockActiveGroupId,
    groups: mockGroups,
    setActiveGroup: mockSetActiveGroup,
  }),
  useCampaigns: () => ({
    activeCampaignId: mockActiveCampaignId,
    activeCampaign: mockActiveCampaignId
      ? { id: mockActiveCampaignId, name: "Phandelver" }
      : null,
    setActiveCampaign: mockSetActiveCampaign,
  }),
  SignInForm: () => <div data-testid="sign-in-form" />,
  JoinGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

// useSelectableCampaigns fetches through this in the pick-campaign state.
jest.mock("core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: {
      getCampaigns: jest
        .fn()
        .mockResolvedValue([{ id: "campaign-2", name: "Icespire Peak" }]),
    },
  },
}));

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("shared/context/NavigationContext", () => ({
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

jest.mock("features/storytelling", () => ({
  useStory: () => mockStoryContext,
  ChapterForm: (props: any) => (
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

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("shared/components/DeleteConfirmationDialog", () => ({
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

// Typography is mapped to its real semantic tag (h1/h2/h3/h4, else `p`) so
// that `getByRole("heading", ...)` works against both this page's own title
// (via PageShell) and the shared gated panel's headings (via GatedPageState),
// while still exposing the same `data-testid` scheme the existing assertions
// below rely on.
jest.mock("../../../core/components/Typography", () => {
  const TAGS: Record<string, string> = { h1: "h1", h2: "h2", h3: "h3", h4: "h4" };
  return {
    __esModule: true,
    default: ({ children, color, variant }: any) => {
      const Tag = (TAGS[variant] || "p") as any;
      return (
        <Tag
          data-testid={
            color ? `typography-${color}` : `typography-${variant ?? "default"}`
          }
        >
          {children}
        </Tag>
      );
    },
  };
});

jest.mock("lucide-react", () => ({
  Lock: () => <span data-testid="lock-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(
    <MemoryRouter>
      <ChapterEditPage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ChapterEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChapterId = "chapter-01";
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
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
  // Gated states
  // -------------------------------------------------------------------------
  describe("gated states", () => {
    it("renders the page title while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Chapter" })
      ).toBeInTheDocument();
    });

    // Write route: the heading names writing a chapter and never suggests
    // picking a group.
    it("asks a signed-out visitor to sign in to write a chapter, and never to select a group", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { name: /sign in to write a chapter/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/select a group/i)).not.toBeInTheDocument();
    });

    it("hides the chapter form while signed out", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("chapter-form")).not.toBeInTheDocument();
    });

    it("shows a skeleton and no message while context is still resolving", () => {
      mockIsResolving = true;
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
      expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    });

    it("shows the shared pick-campaign panel when context is missing", async () => {
      mockActiveCampaignId = null;
      renderPage();
      expect(
        await screen.findByRole("heading", { name: /which campaign/i })
      ).toBeInTheDocument();
      expect(screen.queryByTestId("chapter-form")).not.toBeInTheDocument();
    });

    // Rewritten: the pre-gate page redirected a signed-out visitor straight
    // back to /story via a `!user` effect, so they never saw why. The
    // write-mode panel now shows in place instead -- see
    // ChapterEditPage.tsx's file header.
    it("does NOT redirect a signed-out visitor away from the page", () => {
      mockUser = null;
      renderPage();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
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

    it("renders the 'Edit Chapter' page heading as the h1", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Chapter" })
      ).toBeInTheDocument();
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

    it("still renders the page title", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Chapter" })
      ).toBeInTheDocument();
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

    // Rewritten: `isLoading` now folds into the shared "resolving" state via
    // `usePageGate`; the page's own bare "Loading..." text is gone.
    it("shows a skeleton, not the page's own loading text", () => {
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
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
