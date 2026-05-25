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

jest.mock("../../../context/NavigationContext", () => ({
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

jest.mock("../../../context/QuestContext", () => ({
  useQuests: () => mockQuestContext,
}));

jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: { uid: "user-1" } }),
  useGroups: () => ({ activeGroupId: "group-1" }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/features/quests/QuestEditForm", () => ({
  __esModule: true,
  default: (props: any) => (
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

jest.mock("../../../components/core/Typography", () => ({
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

jest.mock("../../../components/core/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("../../../components/core/Card", () => {
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
});
