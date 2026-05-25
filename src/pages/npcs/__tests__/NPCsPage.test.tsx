// src/pages/npcs/__tests__/NPCsPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NPCsPage from "../NPCsPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks (useNavigation hook uses useLocation internally)
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ pathname: "/npcs", search: "", hash: "" }),
}));

// ---------------------------------------------------------------------------
// Context mocks
// ---------------------------------------------------------------------------
let mockUser: any = { uid: "user-1" };
let mockActiveGroupId: string | null = "group-1";
let mockActiveCampaignId: string | null = "campaign-1";

jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
  useGroups: () => ({ activeGroupId: mockActiveGroupId }),
  useCampaigns: () => ({ activeCampaignId: mockActiveCampaignId }),
}));

interface NPCDataMock {
  npcs: any[];
  loading: boolean;
  error: string | null;
  refreshNPCs: jest.Mock;
}

let mockNPCData: NPCDataMock = {
  npcs: [],
  loading: false,
  error: null,
  refreshNPCs: jest.fn(),
};

jest.mock("../../../hooks/useNPCData", () => ({
  useNPCData: () => mockNPCData,
}));

const mockNavigateToPage = jest.fn();

jest.mock("../../../context/NavigationContext", () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    state: {},
  }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/features/npcs/NPCDirectory", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="npc-directory">
      <span data-testid="npc-directory-count">{props.npcs?.length}</span>
    </div>
  ),
}));

jest.mock("../../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, variant, color }: any) => {
    const testId = variant
      ? `typography-${variant}`
      : color
      ? `typography-${color}`
      : "typography";
    return <div data-testid={testId}>{children}</div>;
  },
}));

jest.mock("../../../components/core/Button", () => ({
  __esModule: true,
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("../../../components/core/Card", () => {
  const Card = ({ children }: any) => <div data-testid="card">{children}</div>;
  Card.Content = ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  );
  return { __esModule: true, default: Card };
});

jest.mock("lucide-react", () => ({
  Plus: () => <span data-testid="plus-icon" />,
  Users: () => <span data-testid="users-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<NPCsPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NPCsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockNPCData = {
      npcs: [],
      loading: false,
      error: null,
      refreshNPCs: jest.fn(),
    };
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    beforeEach(() => {
      mockNPCData = { ...mockNPCData, loading: true };
    });

    it("renders loading indicator text", () => {
      renderPage();
      expect(screen.getByText("Loading NPCs...")).toBeInTheDocument();
    });

    it("does NOT render the NPC directory while loading", () => {
      renderPage();
      expect(screen.queryByTestId("npc-directory")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Context error — missing group
  // -------------------------------------------------------------------------
  describe("when group is not selected", () => {
    beforeEach(() => {
      mockActiveGroupId = null;
    });

    it("renders the missing group message", () => {
      renderPage();
      expect(
        screen.getByText("Please select a group to view NPCs")
      ).toBeInTheDocument();
    });

    it("does NOT render NPC directory", () => {
      renderPage();
      expect(screen.queryByTestId("npc-directory")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Context error — missing campaign
  // -------------------------------------------------------------------------
  describe("when campaign is not selected", () => {
    beforeEach(() => {
      mockActiveCampaignId = null;
    });

    it("renders the missing campaign message", () => {
      renderPage();
      expect(
        screen.getByText("Please select a campaign to view NPCs")
      ).toBeInTheDocument();
    });

    it("does NOT render NPC directory", () => {
      renderPage();
      expect(screen.queryByTestId("npc-directory")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    beforeEach(() => {
      mockNPCData = { ...mockNPCData, error: "Firebase error" };
    });

    it("renders error message", () => {
      renderPage();
      expect(
        screen.getByText("Error Loading NPCs. Sign in to view content.")
      ).toBeInTheDocument();
    });

    it("does NOT render NPC directory", () => {
      renderPage();
      expect(screen.queryByTestId("npc-directory")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loaded state
  // -------------------------------------------------------------------------
  describe("loaded state with NPCs", () => {
    beforeEach(() => {
      mockNPCData = {
        ...mockNPCData,
        npcs: [
          { id: "npc-1", name: "Gandalf", status: "alive" },
          { id: "npc-2", name: "Aragorn", status: "alive" },
          { id: "npc-3", name: "Boromir", status: "deceased" },
          { id: "npc-4", name: "Frodo", status: "missing" },
        ],
      };
    });

    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders the page heading", () => {
      renderPage();
      expect(screen.getByTestId("typography-h1")).toHaveTextContent("NPCs");
    });

    it("renders the NPC directory", () => {
      renderPage();
      expect(screen.getByTestId("npc-directory")).toBeInTheDocument();
    });

    it("passes all NPCs to the directory", () => {
      renderPage();
      expect(screen.getByTestId("npc-directory-count")).toHaveTextContent("4");
    });

    it("renders statistics — total NPC count", () => {
      renderPage();
      // The total count is displayed as an h2 among the stat cards
      // Check that "4" (total) appears somewhere in the stats section
      expect(screen.getAllByTestId("typography-h2")[0]).toHaveTextContent("4");
    });

    it("shows stat labels: Total NPCs, Alive, Missing, Deceased", () => {
      renderPage();
      expect(screen.getByText("Total NPCs")).toBeInTheDocument();
      expect(screen.getByText("Alive")).toBeInTheDocument();
      expect(screen.getByText("Missing")).toBeInTheDocument();
      expect(screen.getByText("Deceased")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Stats calculation
  // -------------------------------------------------------------------------
  describe("stats calculation", () => {
    it("counts alive, missing, and deceased NPCs correctly", () => {
      mockNPCData = {
        ...mockNPCData,
        npcs: [
          { id: "1", name: "A", status: "alive" },
          { id: "2", name: "B", status: "alive" },
          { id: "3", name: "C", status: "deceased" },
          { id: "4", name: "D", status: "missing" },
          { id: "5", name: "E", status: "missing" },
        ],
      };
      renderPage();
      const h2s = screen.getAllByTestId("typography-h2");
      // Order: total=5, alive=2, missing=2, deceased=1
      expect(h2s[0]).toHaveTextContent("5"); // total
      expect(h2s[1]).toHaveTextContent("2"); // alive
      expect(h2s[2]).toHaveTextContent("2"); // missing
      expect(h2s[3]).toHaveTextContent("1"); // deceased
    });

    it("shows zero stats when no NPCs exist", () => {
      mockNPCData = { ...mockNPCData, npcs: [] };
      renderPage();
      const h2s = screen.getAllByTestId("typography-h2");
      h2s.forEach((el) => expect(el).toHaveTextContent("0"));
    });
  });

  // -------------------------------------------------------------------------
  // Create button
  // -------------------------------------------------------------------------
  describe("Create NPC button", () => {
    it("shows 'Add NPC' button when user is authenticated", () => {
      renderPage();
      expect(screen.getByText("Add NPC")).toBeInTheDocument();
    });

    it("navigates to /npcs/create on click", () => {
      renderPage();
      fireEvent.click(screen.getByText("Add NPC"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs/create");
    });

    it("does NOT render 'Add NPC' button when user is not authenticated", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByText("Add NPC")).not.toBeInTheDocument();
    });
  });
});
