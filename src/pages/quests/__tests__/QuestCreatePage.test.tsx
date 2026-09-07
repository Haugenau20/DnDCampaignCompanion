// src/pages/quests/__tests__/QuestCreatePage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuestCreatePage from "../QuestCreatePage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
let mockLocationState: Record<string, any> = {};

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: mockLocationState,
    pathname: "/quests/create",
  }),
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
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("features/campaign-entities", () => ({
  QuestCreateForm: (props: any) => (
    <div data-testid="quest-create-form">
      <span data-testid="quest-form-initial-data">
        {JSON.stringify(props.initialData)}
      </span>
      <button data-testid="quest-form-success" onClick={props.onSuccess}>
        success
      </button>
      <button data-testid="quest-form-cancel" onClick={props.onCancel}>
        cancel
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

jest.mock("../../../core/components/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

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
      <QuestCreatePage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("QuestCreatePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationState = {};
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
  });

  // -------------------------------------------------------------------------
  // Gated states
  // -------------------------------------------------------------------------
  describe("gated states", () => {
    it("renders the page title while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Create New Quest" })
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

    it("hides the quest form while signed out", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("quest-create-form")).not.toBeInTheDocument();
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
      expect(screen.queryByTestId("quest-create-form")).not.toBeInTheDocument();
    });

    it("does NOT redirect a signed-out visitor away from the page", () => {
      mockUser = null;
      renderPage();
      expect(mockNavigate).not.toHaveBeenCalled();
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

    it("renders breadcrumb with Quests and Create labels", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent(
        "Quests"
      );
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent(
        "Create"
      );
    });

    it("renders the page heading as the h1", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Create New Quest" })
      ).toBeInTheDocument();
    });

    it("renders the QuestCreateForm", () => {
      renderPage();
      expect(screen.getByTestId("quest-create-form")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Back button label
  // -------------------------------------------------------------------------
  describe("back button label", () => {
    it("shows 'Back to Quests' when no noteId in state", () => {
      mockLocationState = {};
      renderPage();
      expect(screen.getByText("Back to Quests")).toBeInTheDocument();
    });

    it("shows 'Back to Note' when noteId is in state", () => {
      mockLocationState = { noteId: "note-10" };
      renderPage();
      expect(screen.getByText("Back to Note")).toBeInTheDocument();
    });

    // The back button is navigation, not a data action, so it stays visible
    // even while the gate is not ready.
    it("still shows the back button while signed out", () => {
      mockUser = null;
      renderPage();
      expect(screen.getByText("Back to Quests")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // initialData derivation
  // -------------------------------------------------------------------------
  describe("initialData derivation", () => {
    it("passes undefined when no initialData in state", () => {
      mockLocationState = {};
      renderPage();
      const raw = screen.getByTestId("quest-form-initial-data").textContent;
      expect(raw).toBe("");
    });

    it("merges initialData, noteId, entityId into formInitialData", () => {
      mockLocationState = {
        initialData: { title: "Rescue the Princess", description: "..." },
        noteId: "note-5",
        entityId: "entity-9",
      };
      renderPage();
      const raw = screen.getByTestId("quest-form-initial-data").textContent!;
      const parsed = JSON.parse(raw);
      expect(parsed.title).toBe("Rescue the Princess");
      expect(parsed.noteId).toBe("note-5");
      expect(parsed.entityId).toBe("entity-9");
    });
  });

  // -------------------------------------------------------------------------
  // Navigation handlers
  // -------------------------------------------------------------------------
  describe("onSuccess navigation", () => {
    it("navigates to /quests on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("quest-form-success"));
      expect(mockNavigate).toHaveBeenCalledWith("/quests");
    });
  });

  describe("onCancel navigation", () => {
    it("navigates to /quests on cancel when no noteId", () => {
      mockLocationState = {};
      renderPage();
      fireEvent.click(screen.getByTestId("quest-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/quests");
    });

    it("navigates to note page on cancel when noteId is present", () => {
      mockLocationState = { noteId: "note-77" };
      renderPage();
      fireEvent.click(screen.getByTestId("quest-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/notes/note-77");
    });
  });
});
