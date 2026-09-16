// src/pages/npcs/__tests__/NPCsEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NPCsEditPage from "../NPCsEditPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
let mockNpcId: string | undefined = "npc-1";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ npcId: mockNpcId }),
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

const mockNPCsList = [
  { id: "npc-1", name: "Gandalf" },
  { id: "npc-2", name: "Saruman" },
];
let mockNPCDataReturn: { npcs: any[]; loading: boolean } = {
  npcs: mockNPCsList,
  loading: false,
};

jest.mock("features/campaign-entities", () => ({
  useNPCData: () => mockNPCDataReturn,
  NPCEditForm: (props: any) => (
    <div data-testid="npc-edit-form">
      <span data-testid="edit-form-npc-id">{props.npc?.id}</span>
      <span data-testid="edit-form-npc-name">{props.npc?.name}</span>
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
  Card.Content = ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
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
      <NPCsEditPage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NPCsEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNpcId = "npc-1";
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
    mockNPCDataReturn = { npcs: mockNPCsList, loading: false };
  });

  // -------------------------------------------------------------------------
  // Gated states
  // -------------------------------------------------------------------------
  describe("gated states", () => {
    it("renders the page title while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Gandalf" })
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

    it("hides NPCEditForm while signed out", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("npc-edit-form")).not.toBeInTheDocument();
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
      expect(screen.queryByTestId("npc-edit-form")).not.toBeInTheDocument();
    });

    // This page never had a `!user` redirect effect of its own, so there is
    // nothing to delete here -- included for parity with the other five
    // suites in this task, and to lock in the new behaviour going forward.
    it("does NOT redirect a signed-out visitor away from the page", () => {
      mockUser = null;
      renderPage();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering — NPC found
  // -------------------------------------------------------------------------
  describe("when NPC is found", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders the heading with the NPC name", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Gandalf" })
      ).toBeInTheDocument();
    });

    it("renders NPCEditForm", () => {
      renderPage();
      expect(screen.getByTestId("npc-edit-form")).toBeInTheDocument();
    });

    it("passes the correct NPC to NPCEditForm", () => {
      renderPage();
      expect(screen.getByTestId("edit-form-npc-id")).toHaveTextContent("npc-1");
      expect(screen.getByTestId("edit-form-npc-name")).toHaveTextContent(
        "Gandalf"
      );
    });

    it("shows 'Back to NPCs' button", () => {
      renderPage();
      expect(screen.getByText("Back to NPCs")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering — NPC not found
  // -------------------------------------------------------------------------
  describe("when NPC is not found", () => {
    beforeEach(() => {
      mockNpcId = "nonexistent-npc";
    });

    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("shows 'NPC not found' error message", () => {
      renderPage();
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "NPC not found"
      );
    });

    it("does NOT render NPCEditForm", () => {
      renderPage();
      expect(screen.queryByTestId("npc-edit-form")).not.toBeInTheDocument();
    });

    it("renders fallback heading 'Edit NPC' when NPC is not found", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit NPC" })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("navigates to /npcs when back button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByText("Back to NPCs"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs");
    });

    it("navigates to /npcs on form success", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("edit-form-success"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs");
    });

    it("navigates to /npcs on form cancel", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("edit-form-cancel"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs");
    });
  });

  // -------------------------------------------------------------------------
  // Bug #1424 — while auth and the campaign are still restoring, `npcs` is an
  // empty array, so `editingNPC` is undefined and the page used to commit to
  // "NPC not found". Now `loading` folds into the shared gate's "resolving"
  // state instead, so the skeleton shows and the ready branch (which is where
  // "NPC not found" lives) never runs until loading has actually finished.
  // -------------------------------------------------------------------------
  describe("still loading (bug #1424)", () => {
    beforeEach(() => {
      mockNPCDataReturn = { npcs: [], loading: true };
    });

    it("does NOT claim the NPC is missing while data is still loading", () => {
      renderPage();
      expect(screen.queryByText("NPC not found")).not.toBeInTheDocument();
    });

    it("renders a skeleton instead", () => {
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
    });

    it("still reports a genuinely missing NPC once loading has finished", () => {
      mockNPCDataReturn = { npcs: [], loading: false };
      renderPage();
      expect(screen.getByText("NPC not found")).toBeInTheDocument();
    });
  });
});
