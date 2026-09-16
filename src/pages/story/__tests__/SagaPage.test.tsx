// src/pages/story/__tests__/SagaPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SagaPage from "../SagaPage";

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

interface SagaDataMock {
  saga: { title: string; content: string; lastUpdated?: string } | null;
  loading: boolean;
  error: string | null;
}

let mockSagaData: SagaDataMock = {
  saga: null,
  loading: false,
  error: null,
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
// Typography is mapped to its real semantic tag (h1/h2/h3/h4, else `p`) so
// that `getByRole("heading", ...)` works against both this page's own title
// (via PageShell) and the shared gated panel's headings (via GatedPageState),
// while still exposing the same `data-testid` scheme the existing assertions
// below rely on.
jest.mock("../../../core/components/Typography", () => {
  const TAGS: Record<string, string> = { h1: "h1", h2: "h2", h3: "h3", h4: "h4" };
  return {
    __esModule: true,
    default: ({ children, color, variant, className }: any) => {
      const Tag = (TAGS[variant] || "p") as any;
      return (
        <Tag
          data-testid={
            color
              ? `typography-${color}`
              : variant
              ? `typography-${variant}`
              : "typography-default"
          }
          className={className}
        >
          {children}
        </Tag>
      );
    },
  };
});

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

jest.mock("lucide-react", () => ({
  Edit: () => <span data-testid="edit-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
}));

jest.mock("../components/StoryViewTabs", () => ({
  __esModule: true,
  default: () => <div data-testid="story-view-tabs" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(
    <MemoryRouter>
      <SagaPage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SagaPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
    mockSagaData = {
      saga: null,
      loading: false,
      error: null,
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
        screen.getByRole("heading", { level: 1, name: "The Campaign Saga" })
      ).toBeInTheDocument();
    });

    it("asks a signed-out visitor to sign in, and never to select a group", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { name: /sign in to read your campaign's story/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/select a group/i)).not.toBeInTheDocument();
    });

    // Rewritten: this used to assert the view tabs were hidden alongside the
    // Edit Saga action while signed out. That was wrong -- StoryViewTabs is
    // pure navigation between story views, not a control that acts on data,
    // and the gated-states spec says navigation stays visible in every state
    // because it is how someone arrives at these pages in the first place.
    it("hides the Edit Saga action while signed out, but keeps the view tabs visible", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("button-edit-saga")).not.toBeInTheDocument();
      expect(screen.getByTestId("story-view-tabs")).toBeInTheDocument();
    });

    it("shows a skeleton and no message while context is still resolving", () => {
      mockIsResolving = true;
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
      expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    });

    // Rewritten: the pre-gate suite asserted this page's own
    // "Please select a group and campaign..." copy, driven by
    // `hasRequiredContext` (dropped from this page -- see the note above the
    // component). `usePageGate` now derives the state and `GatedContent`
    // renders the shared pick-campaign panel.
    it("shows the shared pick-campaign panel, not the old copy, when context is missing", async () => {
      mockActiveCampaignId = null;
      renderPage();
      expect(
        screen.queryByText(/please select a group and campaign/i)
      ).not.toBeInTheDocument();
      expect(
        await screen.findByRole("heading", { name: /which campaign/i })
      ).toBeInTheDocument();
      expect(screen.queryByTestId("book-viewer")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    // Rewritten: `loading` now folds into the shared "resolving" state via
    // `usePageGate`; the page's own Loader2/Card is gone.
    it("shows a skeleton, not the page's own loading card, while loading is true", () => {
      mockSagaData = { ...mockSagaData, loading: true };
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
      expect(screen.queryByText(/Loading saga/i)).not.toBeInTheDocument();
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

    it("renders the saga's own title as the page heading", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Epic of the Ages" })
      ).toBeInTheDocument();
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
  // Story view tabs
  // -------------------------------------------------------------------------
  describe("story view tabs", () => {
    it("renders StoryViewTabs in the header", () => {
      renderPage();
      expect(screen.getByTestId("story-view-tabs")).toBeInTheDocument();
    });
  });
});
