// src/pages/story/__tests__/ChapterCreatePage.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChapterCreatePage from "../ChapterCreatePage";

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

interface StoryContextMock {
  isLoading: boolean;
  chapters: any[];
}

let mockStoryContext: StoryContextMock = {
  isLoading: false,
  chapters: [],
};

jest.mock("features/storytelling", () => ({
  useStory: () => ({
    ...mockStoryContext,
    getChapterById: jest.fn(),
    deleteChapter: jest.fn(),
  }),
  ChapterForm: (props: any) => (
    <div data-testid="chapter-form">
      <span data-testid="chapter-form-mode">{props.mode}</span>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
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
      <ChapterCreatePage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ChapterCreatePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
    mockStoryContext = {
      isLoading: false,
      chapters: [],
    };
  });

  // -------------------------------------------------------------------------
  // Gated states
  // -------------------------------------------------------------------------
  describe("gated states", () => {
    it("renders the page title while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Create New Chapter" })
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
    // ChapterCreatePage.tsx's file header.
    it("does NOT redirect a signed-out visitor away from the page", () => {
      mockUser = null;
      renderPage();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering — user authenticated, not loading
  // -------------------------------------------------------------------------
  describe("rendering when user is authenticated and loaded", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders breadcrumb with Home, Story, Session Chapters, Create Chapter labels", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent("Home");
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent(
        "Story"
      );
      expect(screen.getByTestId("breadcrumb-item-2")).toHaveTextContent(
        "Session Chapters"
      );
      expect(screen.getByTestId("breadcrumb-item-3")).toHaveTextContent(
        "Create Chapter"
      );
    });

    it("renders the page heading as the h1", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Create New Chapter" })
      ).toBeInTheDocument();
    });

    it("renders ChapterForm in create mode", () => {
      renderPage();
      expect(screen.getByTestId("chapter-form")).toBeInTheDocument();
      expect(screen.getByTestId("chapter-form-mode")).toHaveTextContent(
        "create"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    beforeEach(() => {
      mockStoryContext = { ...mockStoryContext, isLoading: true };
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
});
