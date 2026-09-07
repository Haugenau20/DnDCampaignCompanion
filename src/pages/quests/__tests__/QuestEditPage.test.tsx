// src/pages/quests/__tests__/QuestEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuestEditPage from "../QuestEditPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
let mockQuestId: string | undefined = "quest-1";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ questId: mockQuestId }),
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

interface QuestContextMock {
  quests: any[];
  loading: boolean;
  error: string | null;
  refreshQuests: jest.Mock;
}

let mockQuestContext: QuestContextMock = {
  quests: [
    { id: "quest-1", title: "Find the Dragon" },
    { id: "quest-2", title: "Slay the Lich" },
  ],
  loading: false,
  error: null,
  refreshQuests: jest.fn(),
};

jest.mock("features/campaign-entities", () => ({
  useQuests: () => mockQuestContext,
  QuestEditForm: (props: any) => (
    <div data-testid="quest-edit-form">
      <span data-testid="edit-form-quest-id">{props.quest?.id}</span>
      <span data-testid="edit-form-quest-title">{props.quest?.title}</span>
      <button data-testid="edit-form-success" onClick={props.onSuccess}>
        success
      </button>
      <button data-testid="edit-form-cancel" onClick={props.onCancel}>
        cancel
      </button>
    </div>
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

jest.mock("../../../core/components/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("../../../core/components/Card", () => {
  const Card = ({ children }: any) => <div data-testid="card">{children}</div>;
  Card.Content = ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  );
  return { __esModule: true, default: Card };
});

jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
  Lock: () => <span data-testid="lock-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(
    <MemoryRouter>
      <QuestEditPage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("QuestEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuestId = "quest-1";
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
    mockQuestContext = {
      quests: [
        { id: "quest-1", title: "Find the Dragon" },
        { id: "quest-2", title: "Slay the Lich" },
      ],
      loading: false,
      error: null,
      refreshQuests: jest.fn(),
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
        screen.getByRole("heading", { level: 1, name: "Edit Find the Dragon" })
      ).toBeInTheDocument();
    });

    it("asks a signed-out visitor to sign in to add a quest, and never to select a group", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { name: /sign in to add a quest/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/select a group/i)).not.toBeInTheDocument();
    });

    it("hides QuestEditForm while signed out", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("quest-edit-form")).not.toBeInTheDocument();
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
      expect(screen.queryByTestId("quest-edit-form")).not.toBeInTheDocument();
    });

    // Rewritten: bug #1423's redirect effect (`!loading && !user` ->
    // navigateToPage('/quests')) is gone. A signed-out visitor now sees the
    // write-mode gated panel in place instead of being bounced to /quests
    // before the page could say why -- see QuestEditPage.tsx's file header.
    it("does NOT redirect a signed-out visitor away from the page", () => {
      mockUser = null;
      renderPage();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering — quest found, all context ready
  // -------------------------------------------------------------------------
  describe("when quest is found and context is ready", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders heading with the quest title", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Find the Dragon" })
      ).toBeInTheDocument();
    });

    it("renders QuestEditForm", () => {
      renderPage();
      expect(screen.getByTestId("quest-edit-form")).toBeInTheDocument();
    });

    it("passes the correct quest to QuestEditForm", () => {
      renderPage();
      expect(screen.getByTestId("edit-form-quest-id")).toHaveTextContent(
        "quest-1"
      );
      expect(screen.getByTestId("edit-form-quest-title")).toHaveTextContent(
        "Find the Dragon"
      );
    });

    it("shows 'Back to Quests' button", () => {
      renderPage();
      expect(screen.getByText("Back to Quests")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Quest not found
  // -------------------------------------------------------------------------
  describe("when quest is not found by URL param", () => {
    beforeEach(() => {
      mockQuestId = "nonexistent-quest";
    });

    it("shows 'Quest not found' error", () => {
      renderPage();
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Quest not found"
      );
    });

    it("does NOT render QuestEditForm", () => {
      renderPage();
      expect(screen.queryByTestId("quest-edit-form")).not.toBeInTheDocument();
    });

    it("renders fallback heading 'Edit Quest'", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Quest" })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    beforeEach(() => {
      mockQuestContext = {
        ...mockQuestContext,
        loading: true,
        quests: [],
      };
    });

    // Rewritten: `loading` now folds into the shared "resolving" state via
    // `usePageGate`; the page's own bare "Loading quest data..." text and
    // spinner card are gone.
    it("shows a skeleton, not the page's own loading text", () => {
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
      expect(
        screen.queryByText("Loading quest data...")
      ).not.toBeInTheDocument();
    });

    it("does NOT render QuestEditForm during loading", () => {
      renderPage();
      expect(screen.queryByTestId("quest-edit-form")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    beforeEach(() => {
      mockQuestContext = {
        ...mockQuestContext,
        loading: false,
        error: "Firebase error",
        quests: [],
      };
    });

    // Rewritten: the page's own inline "Error loading quest data. Please try
    // again later." card is gone. `GatedContent` now owns the error panel and
    // names the noun and the real error message instead.
    it("shows the shared error panel, not the old inline copy", () => {
      renderPage();
      expect(
        screen.queryByText("Error loading quest data. Please try again later.")
      ).not.toBeInTheDocument();
      expect(screen.getByText(/couldn't load quests/i)).toBeInTheDocument();
      expect(screen.getByText("Firebase error")).toBeInTheDocument();
    });

    it("does NOT render QuestEditForm on error", () => {
      renderPage();
      expect(screen.queryByTestId("quest-edit-form")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("navigates to /quests on back button click", () => {
      renderPage();
      fireEvent.click(screen.getByText("Back to Quests"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/quests");
    });

    it("navigates to /quests on form success and calls refreshQuests", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("edit-form-success"));
      expect(mockQuestContext.refreshQuests).toHaveBeenCalled();
      expect(mockNavigateToPage).toHaveBeenCalledWith("/quests");
    });

    it("navigates to /quests on form cancel", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("edit-form-cancel"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/quests");
    });
  });
});
