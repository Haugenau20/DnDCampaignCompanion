// src/pages/quests/__tests__/QuestEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
  hasRequiredContext: boolean;
}

let mockQuestContext: QuestContextMock = {
  quests: [
    { id: "quest-1", title: "Find the Dragon" },
    { id: "quest-2", title: "Slay the Lich" },
  ],
  loading: false,
  error: null,
  refreshQuests: jest.fn(),
  hasRequiredContext: true,
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

// Mutable so a test can represent "auth has not rehydrated yet" (user === null
// while loading is still true), which is a different state from "signed out".
let mockAuthUser: { uid: string } | null = { uid: "user-1" };

jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: mockAuthUser }),
  useGroups: () => ({ activeGroupId: "group-1" }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------

jest.mock("../../../core/components/Typography", () => ({
  __esModule: true,
  default: ({ children, color, variant }: any) => (
    <div
      data-testid={
        color ? `typography-${color}` : variant ? `typography-${variant}` : "typography"
      }
    >
      {children}
    </div>
  ),
}));

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
  Loader2: () => <span data-testid="loader" />,
  AlertCircle: () => <span data-testid="alert-circle" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<QuestEditPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("QuestEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuestId = "quest-1";
    mockAuthUser = { uid: "user-1" };
    mockQuestContext = {
      quests: [
        { id: "quest-1", title: "Find the Dragon" },
        { id: "quest-2", title: "Slay the Lich" },
      ],
      loading: false,
      error: null,
      refreshQuests: jest.fn(),
      hasRequiredContext: true,
    };
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
      expect(screen.getByText("Edit Find the Dragon")).toBeInTheDocument();
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
      expect(screen.getByText("Edit Quest")).toBeInTheDocument();
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

    it("renders loading indicator", () => {
      renderPage();
      expect(screen.getByText("Loading quest data...")).toBeInTheDocument();
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

    it("renders error message", () => {
      renderPage();
      expect(
        screen.getByText("Error loading quest data. Please try again later.")
      ).toBeInTheDocument();
    });

    it("does NOT render QuestEditForm on error", () => {
      renderPage();
      expect(screen.queryByTestId("quest-edit-form")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // No context (no group / no campaign)
  // -------------------------------------------------------------------------
  describe("when hasRequiredContext is false", () => {
    describe("no activeGroupId", () => {
      beforeEach(() => {
        mockQuestContext = {
          ...mockQuestContext,
          hasRequiredContext: false,
        };
      });

      it("renders context selection message", () => {
        renderPage();
        // Either "No Group Selected" or "No Campaign Selected" should appear
        const hasGroupMsg =
          screen.queryByText("No Group Selected") !== null;
        const hasCampaignMsg =
          screen.queryByText("No Campaign Selected") !== null;
        expect(hasGroupMsg || hasCampaignMsg).toBe(true);
      });

      it("does NOT render QuestEditForm", () => {
        renderPage();
        expect(screen.queryByTestId("quest-edit-form")).not.toBeInTheDocument();
      });

      it("renders 'Back to Quests' button in context-guard view", () => {
        renderPage();
        expect(screen.getByText("Back to Quests")).toBeInTheDocument();
      });
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

  // -------------------------------------------------------------------------
  // Bug #1423 — the redirect must distinguish "still rehydrating" from
  // "signed out". `user` is null in both cases; only `loading` tells them
  // apart. Measured in the browser before the fix: a direct load of
  // /quests/edit/<id> while signed in landed on /quests within ~124ms.
  // -------------------------------------------------------------------------
  describe("auth still rehydrating (bug #1423)", () => {
    beforeEach(() => {
      // The state on a fresh page load: Firebase Auth has not called back yet,
      // so there is no user *and* the context still reports itself as loading.
      mockAuthUser = null;
      mockQuestContext.loading = true;
    });

    it("does NOT redirect to /quests while auth is still restoring", () => {
      renderPage();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });

    it("shows the loading indicator instead of redirecting", () => {
      renderPage();
      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });

    it("still redirects once loading finishes and there is genuinely no user", () => {
      mockQuestContext.loading = false;
      renderPage();
      expect(mockNavigateToPage).toHaveBeenCalledWith("/quests");
    });
  });
});
