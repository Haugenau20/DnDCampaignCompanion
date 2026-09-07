// src/pages/npcs/__tests__/NPCsCreatePage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NPCsCreatePage from "../NPCsCreatePage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
let mockLocationState: Record<string, any> = {};

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState, pathname: "/npcs/create" }),
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
// Context mocks
// ---------------------------------------------------------------------------
const mockNPCs = [{ id: "npc-1", name: "Gandalf" }];

jest.mock("features/campaign-entities", () => ({
  useNPCs: () => ({ npcs: mockNPCs }),
  NPCForm: (props: any) => (
    <div data-testid="npc-form">
      <span data-testid="npc-form-initial-data">
        {JSON.stringify(props.initialData)}
      </span>
      <span data-testid="npc-form-existing-npcs">
        {JSON.stringify(props.existingNPCs)}
      </span>
      <button data-testid="npc-form-success" onClick={props.onSuccess}>
        success
      </button>
      <button data-testid="npc-form-cancel" onClick={props.onCancel}>
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
      <NPCsCreatePage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NPCsCreatePage", () => {
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
        screen.getByRole("heading", { level: 1, name: "Create New NPC" })
      ).toBeInTheDocument();
    });

    it("asks a signed-out visitor to sign in to add an NPC, and never to select a group", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { name: /sign in to add an npc/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/select a group/i)).not.toBeInTheDocument();
    });

    it("hides the NPC form while signed out", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("npc-form")).not.toBeInTheDocument();
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
      expect(screen.queryByTestId("npc-form")).not.toBeInTheDocument();
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

    it("renders breadcrumb with NPCs and Create labels", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent("NPCs");
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent(
        "Create"
      );
    });

    it("renders the page heading as the h1", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Create New NPC" })
      ).toBeInTheDocument();
    });

    it("renders the NPCForm", () => {
      renderPage();
      expect(screen.getByTestId("npc-form")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Back button label
  // -------------------------------------------------------------------------
  describe("back button label", () => {
    it("shows 'Back to NPCs' when there is no noteId in location state", () => {
      mockLocationState = {};
      renderPage();
      expect(screen.getByText("Back to NPCs")).toBeInTheDocument();
    });

    it("shows 'Back to Note' when noteId is present in location state", () => {
      mockLocationState = { noteId: "note-42" };
      renderPage();
      expect(screen.getByText("Back to Note")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Initial data derivation
  // -------------------------------------------------------------------------
  describe("initialData derivation", () => {
    it("passes undefined to NPCForm.initialData when location.state has no initialData", () => {
      mockLocationState = {};
      renderPage();
      const raw = screen.getByTestId("npc-form-initial-data").textContent;
      expect(raw).toBe(""); // JSON.stringify(undefined) === undefined → renders as ""
    });

    it("merges initialData, noteId and entityId into formInitialData", () => {
      mockLocationState = {
        initialData: { name: "Elrond", description: "Elf lord" },
        noteId: "note-7",
        entityId: "entity-3",
      };
      renderPage();
      const raw = screen.getByTestId("npc-form-initial-data").textContent!;
      const parsed = JSON.parse(raw);
      expect(parsed.name).toBe("Elrond");
      expect(parsed.noteId).toBe("note-7");
      expect(parsed.entityId).toBe("entity-3");
    });

    it("passes existing NPCs from context to NPCForm", () => {
      renderPage();
      const raw = screen.getByTestId("npc-form-existing-npcs").textContent!;
      const parsed = JSON.parse(raw);
      expect(parsed).toEqual(mockNPCs);
    });
  });

  // -------------------------------------------------------------------------
  // Navigation handlers
  // -------------------------------------------------------------------------
  describe("onSuccess navigation", () => {
    it("navigates to /npcs on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("npc-form-success"));
      expect(mockNavigate).toHaveBeenCalledWith("/npcs");
    });
  });

  describe("onCancel navigation", () => {
    it("navigates to /npcs on cancel when no noteId", () => {
      mockLocationState = {};
      renderPage();
      fireEvent.click(screen.getByTestId("npc-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/npcs");
    });

    it("navigates to the note page on cancel when noteId is present", () => {
      mockLocationState = { noteId: "note-99" };
      renderPage();
      fireEvent.click(screen.getByTestId("npc-form-cancel"));
      expect(mockNavigate).toHaveBeenCalledWith("/notes/note-99");
    });
  });
});
