// src/pages/quests/__tests__/QuestsPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import QuestsPage from "../QuestsPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ pathname: "/quests", search: "", hash: "" }),
}));

// ---------------------------------------------------------------------------
// Context mocks
// ---------------------------------------------------------------------------
let mockUser: any = { uid: "user-1" };
let mockActiveGroupId: string | null = "group-1";
let mockActiveCampaignId: string | null = "campaign-1";

jest.mock("../../../context/firebase", () => ({
  useAuth: () => ({ user: mockUser }),
  useGroups: () => ({ activeGroupId: mockActiveGroupId }),
  useCampaigns: () => ({ activeCampaignId: mockActiveCampaignId }),
}));

interface QuestContextMock {
  quests: any[];
  loading: boolean;
  error: string | null;
  hasRequiredContext: boolean;
}

let mockQuestContext: QuestContextMock = {
  quests: [],
  loading: false,
  error: null,
  hasRequiredContext: true,
};

jest.mock("../../../context/QuestContext", () => ({
  useQuests: () => mockQuestContext,
}));

const mockNavigateToPage = jest.fn();
const mockGetCurrentQueryParams = jest.fn(() => ({ highlight: undefined }));

jest.mock("../../../hooks/useNavigation", () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    getCurrentQueryParams: mockGetCurrentQueryParams,
    state: {},
  }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
jest.mock("../../../components/features/quests/QuestCard", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid={`quest-card-${props.quest?.id}`}>
      <span data-testid={`quest-card-title-${props.quest?.id}`}>
        {props.quest?.title}
      </span>
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
  const Card = ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  );
  Card.Content = ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  );
  return { __esModule: true, default: Card };
});

jest.mock("../../../components/core/Input", () => ({
  __esModule: true,
  default: ({ placeholder, value, onChange }: any) => (
    <input
      data-testid="search-input"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
}));

jest.mock("lucide-react", () => ({
  Scroll: () => <span data-testid="scroll-icon" />,
  CheckCircle2: () => <span data-testid="check-circle-icon" />,
  XCircle: () => <span data-testid="x-circle-icon" />,
  Filter: () => <span data-testid="filter-icon" />,
  Search: () => <span data-testid="search-icon" />,
  MapPin: () => <span data-testid="map-pin-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
}));

// ---------------------------------------------------------------------------
// Sample quest data
// ---------------------------------------------------------------------------
const sampleQuests = [
  {
    id: "q1",
    title: "Find the Dragon",
    description: "A quest about dragons",
    status: "active",
    location: "Dungeon",
    objectives: [{ description: "Slay the dragon" }],
    relatedNPCIds: [],
  },
  {
    id: "q2",
    title: "Slay the Lich",
    description: "A necromantic affair",
    status: "completed",
    location: "Crypt",
    objectives: [{ description: "Find the phylactery" }],
    relatedNPCIds: [],
  },
  {
    id: "q3",
    title: "Rescue the Princess",
    description: "Classic adventure",
    status: "failed",
    location: "Dungeon",
    objectives: [{ description: "Enter the tower" }],
    relatedNPCIds: [],
  },
  {
    id: "q4",
    title: "Collect Herbs",
    description: "A mundane errand",
    status: "active",
    location: "Forest",
    objectives: [{ description: "Gather 10 herbs" }],
    relatedNPCIds: ["Herbalist"],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<QuestsPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("QuestsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockQuestContext = {
      quests: [...sampleQuests],
      loading: false,
      error: null,
      hasRequiredContext: true,
    };
    mockGetCurrentQueryParams.mockReturnValue({ highlight: undefined });
  });

  // -------------------------------------------------------------------------
  // Context guard — no group
  // -------------------------------------------------------------------------
  describe("when no group is selected", () => {
    beforeEach(() => {
      mockActiveGroupId = null;
    });

    it("renders 'No Group Selected' message", () => {
      renderPage();
      expect(screen.getByText("No Group Selected")).toBeInTheDocument();
    });

    it("does NOT render QuestCard entries", () => {
      renderPage();
      expect(screen.queryByTestId("quest-card-q1")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Context guard — no campaign
  // -------------------------------------------------------------------------
  describe("when no campaign is selected", () => {
    beforeEach(() => {
      mockActiveCampaignId = null;
    });

    it("renders 'No Campaign Selected' message", () => {
      renderPage();
      expect(screen.getByText("No Campaign Selected")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    beforeEach(() => {
      mockQuestContext = { ...mockQuestContext, loading: true, quests: [] };
    });

    it("renders loading indicator", () => {
      renderPage();
      expect(screen.getByText("Loading quests...")).toBeInTheDocument();
    });

    it("does NOT render quest cards", () => {
      renderPage();
      expect(screen.queryByTestId("quest-card-q1")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    beforeEach(() => {
      mockQuestContext = {
        ...mockQuestContext,
        error: "Firebase error",
        quests: [],
      };
    });

    it("renders error message", () => {
      renderPage();
      expect(
        screen.getByText("Error Loading Quests. Sign in to view content.")
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loaded state
  // -------------------------------------------------------------------------
  describe("loaded state", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders the page heading 'Campaign Quests'", () => {
      renderPage();
      expect(screen.getByTestId("typography-h1")).toHaveTextContent(
        "Campaign Quests"
      );
    });

    it("renders a QuestCard for each quest", () => {
      renderPage();
      expect(screen.getByTestId("quest-card-q1")).toBeInTheDocument();
      expect(screen.getByTestId("quest-card-q2")).toBeInTheDocument();
      expect(screen.getByTestId("quest-card-q3")).toBeInTheDocument();
      expect(screen.getByTestId("quest-card-q4")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------
  describe("statistics", () => {
    it("counts active quests correctly", () => {
      renderPage();
      const h2s = screen.getAllByTestId("typography-h2");
      // active=2, completed=1, failed=1
      expect(h2s[0]).toHaveTextContent("2"); // active
      expect(h2s[1]).toHaveTextContent("1"); // completed
      expect(h2s[2]).toHaveTextContent("1"); // failed
    });
  });

  // -------------------------------------------------------------------------
  // Create Quest button
  // -------------------------------------------------------------------------
  describe("Create Quest button", () => {
    it("shows 'Create Quest' button when user is authenticated", () => {
      renderPage();
      expect(screen.getByText("Create Quest")).toBeInTheDocument();
    });

    it("navigates to /quests/create on click", () => {
      renderPage();
      fireEvent.click(screen.getByText("Create Quest"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/quests/create");
    });

    it("does NOT render Create Quest button when no user", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByText("Create Quest")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Search filter
  // -------------------------------------------------------------------------
  describe("search filter", () => {
    it("renders a search input", () => {
      renderPage();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("filters quests by title", () => {
      renderPage();
      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "dragon" },
      });
      expect(screen.getByTestId("quest-card-q1")).toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q2")).not.toBeInTheDocument();
    });

    it("filters quests by description", () => {
      renderPage();
      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "necromantic" },
      });
      expect(screen.getByTestId("quest-card-q2")).toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q1")).not.toBeInTheDocument();
    });

    it("filters quests by objective description", () => {
      renderPage();
      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "phylactery" },
      });
      expect(screen.getByTestId("quest-card-q2")).toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q1")).not.toBeInTheDocument();
    });

    it("shows empty state when no quests match the search", () => {
      renderPage();
      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "zzzyyyxxx" },
      });
      expect(screen.getByText("No Quests Found")).toBeInTheDocument();
      expect(
        screen.getByText("No quests match your search criteria")
      ).toBeInTheDocument();
    });

    it("shows all quests when search is cleared", () => {
      renderPage();
      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "dragon" },
      });
      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "" },
      });
      expect(screen.getByTestId("quest-card-q1")).toBeInTheDocument();
      expect(screen.getByTestId("quest-card-q2")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Status filter
  // -------------------------------------------------------------------------
  describe("status filter", () => {
    it("renders status filter select", () => {
      renderPage();
      // The status filter is a native <select>
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(1);
    });

    it("shows all quests when filter is 'all'", () => {
      renderPage();
      expect(screen.getByTestId("quest-card-q1")).toBeInTheDocument();
      expect(screen.getByTestId("quest-card-q2")).toBeInTheDocument();
      expect(screen.getByTestId("quest-card-q3")).toBeInTheDocument();
    });

    it("shows only active quests when filtering by 'active'", () => {
      renderPage();
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[0], { target: { value: "active" } });
      expect(screen.getByTestId("quest-card-q1")).toBeInTheDocument();
      expect(screen.getByTestId("quest-card-q4")).toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q2")).not.toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q3")).not.toBeInTheDocument();
    });

    it("shows only completed quests when filtering by 'completed'", () => {
      renderPage();
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[0], { target: { value: "completed" } });
      expect(screen.getByTestId("quest-card-q2")).toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q3")).not.toBeInTheDocument();
    });

    it("shows only failed quests when filtering by 'failed'", () => {
      renderPage();
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[0], { target: { value: "failed" } });
      expect(screen.getByTestId("quest-card-q3")).toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q2")).not.toBeInTheDocument();
    });

    it("shows empty state message for status with no results", () => {
      mockQuestContext = {
        ...mockQuestContext,
        quests: [{ ...sampleQuests[0] }], // only active quest
      };
      renderPage();
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[0], { target: { value: "completed" } });
      expect(screen.getByText("No Quests Found")).toBeInTheDocument();
      expect(screen.getByText("No completed quests found")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Location filter
  // -------------------------------------------------------------------------
  describe("location filter", () => {
    it("renders location filter when quests have locations", () => {
      renderPage();
      const selects = screen.getAllByRole("combobox");
      // There should be status filter + location filter
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it("does NOT render location filter when quests have no locations", () => {
      mockQuestContext = {
        ...mockQuestContext,
        quests: [
          {
            id: "q1",
            title: "No Location",
            description: "d",
            status: "active",
            location: null,
            objectives: [],
            relatedNPCIds: [],
          },
        ],
      };
      renderPage();
      const selects = screen.getAllByRole("combobox");
      // Only the status filter, no location filter
      expect(selects.length).toBe(1);
    });

    it("filters quests by location", () => {
      renderPage();
      const selects = screen.getAllByRole("combobox");
      const locationSelect = selects[1]; // 2nd select is location
      fireEvent.change(locationSelect, { target: { value: "Dungeon" } });
      expect(screen.getByTestId("quest-card-q1")).toBeInTheDocument();
      expect(screen.getByTestId("quest-card-q3")).toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q2")).not.toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q4")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Combined filters
  // -------------------------------------------------------------------------
  describe("combined status + location filter", () => {
    it("applies both status and location filters simultaneously", () => {
      renderPage();
      const selects = screen.getAllByRole("combobox");
      // Filter to active only
      fireEvent.change(selects[0], { target: { value: "active" } });
      // Then filter to Dungeon only
      fireEvent.change(selects[1], { target: { value: "Dungeon" } });
      // Only q1 is active + Dungeon; q4 is active + Forest; q3 is failed + Dungeon
      expect(screen.getByTestId("quest-card-q1")).toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q4")).not.toBeInTheDocument();
      expect(screen.queryByTestId("quest-card-q3")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe("empty state", () => {
    it("shows 'No Quests Found' when quest list is empty", () => {
      mockQuestContext = { ...mockQuestContext, quests: [] };
      renderPage();
      expect(screen.getByText("No Quests Found")).toBeInTheDocument();
    });

    it("shows generic empty message when no quests and no filter", () => {
      mockQuestContext = { ...mockQuestContext, quests: [] };
      renderPage();
      expect(
        screen.getByText("There are no quests to display")
      ).toBeInTheDocument();
    });
  });
});
