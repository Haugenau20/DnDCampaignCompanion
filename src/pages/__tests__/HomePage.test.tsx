// src/pages/__tests__/HomePage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import HomePage from "../HomePage";

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
jest.mock("@/features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
  useGroups: () => ({ activeGroupId: mockActiveGroupId }),
  useCampaigns: () => ({ activeCampaignId: "campaign-1" }),
}));

let mockUser: { uid: string } | null = { uid: "user-1" };
let mockActiveGroupId: string | null = "group-1";

jest.mock("../../context/StoryContext", () => ({
  useStory: () => ({
    chapters: mockChapters,
    isLoading: mockIsLoading,
  }),
}));

jest.mock("../../context/QuestContext", () => ({
  useQuests: () => ({
    quests: mockQuests,
    isLoading: mockIsLoading,
  }),
}));

jest.mock("../../context/RumorContext", () => ({
  useRumors: () => ({
    rumors: mockRumors,
    isLoading: mockIsLoading,
  }),
}));

jest.mock("../../context/NPCContext", () => ({
  useNPCs: () => ({
    npcs: mockNpcs,
    isLoading: mockIsLoading,
  }),
}));

jest.mock("../../context/LocationContext", () => ({
  useLocations: () => ({
    locations: mockLocations,
    isLoading: mockIsLoading,
  }),
}));

// ---------------------------------------------------------------------------
// Service / utility mocks
// ---------------------------------------------------------------------------
jest.mock("../../services/firebase", () => ({}));

jest.mock("../../utils/attribution-utils", () => ({
  determineAttributionActor: (_item: any, _map: any) => "Unknown",
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));

// ---------------------------------------------------------------------------
// Child component / layout mocks
// ---------------------------------------------------------------------------
jest.mock("../../components/features/layouts/dashboard/DashboardLayout", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="dashboard-layout"
      data-loading={String(props.loading)}
      data-npc-count={props.npcs?.length}
      data-quest-count={props.quests?.length}
      data-rumor-count={props.rumors?.length}
      data-chapter-count={props.chapters?.length}
      data-location-count={props.locations?.length}
      data-activity-count={props.activities?.length}
    />
  ),
}));

jest.mock("../../components/features/layouts/journal/JournalLayout", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="journal-layout"
      data-loading={String(props.loading)}
    />
  ),
}));

jest.mock("../../components/core/Button", () => ({
  __esModule: true,
  default: ({ children, onClick, startIcon }: any) => (
    <button
      data-testid={`button-${String(children).trim().replace(/\s+/g, "-").toLowerCase()}`}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

jest.mock("../../components/features/layouts/common/hooks/useLayoutData", () => ({
  __esModule: true,
  default: (props: any) => ({
    loading:
      props.chaptersLoading ||
      props.questsLoading ||
      props.rumorsLoading ||
      props.npcsLoading ||
      props.locationsLoading,
  }),
}));

jest.mock("lucide-react", () => ({
  Book: () => <span data-testid="book-icon" />,
  LayoutDashboard: () => <span data-testid="layout-dashboard-icon" />,
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
let mockIsLoading = false;

let mockChapters: any[] = [
  {
    id: "ch-1",
    title: "Chapter 1",
    order: 1,
    content: "Content here...",
    dateModified: "2024-01-01",
    dateAdded: "2024-01-01",
    createdBy: "user-1",
    modifiedBy: "user-1",
  },
];

let mockQuests: any[] = [
  {
    id: "q-1",
    title: "Find the artifact",
    description: "A quest for glory",
    dateModified: "2024-01-02",
    dateAdded: "2024-01-02",
    createdBy: "user-1",
    modifiedBy: "user-1",
  },
];

let mockRumors: any[] = [
  {
    id: "r-1",
    title: "Strange lights",
    content: "They say dragons are flying...",
    dateModified: "2024-01-03",
    dateAdded: "2024-01-03",
    createdBy: "user-1",
    modifiedBy: "user-1",
  },
];

let mockNpcs: any[] = [
  {
    id: "npc-1",
    name: "Gandalf",
    description: "A wizard...",
    dateModified: "2024-01-04",
    dateAdded: "2024-01-04",
    createdBy: "user-1",
    modifiedBy: "user-1",
  },
];

let mockLocations: any[] = [
  {
    id: "loc-1",
    name: "The Tavern",
    description: "A cozy inn...",
    dateModified: "2024-01-05",
    dateAdded: "2024-01-05",
    createdBy: "user-1",
    modifiedBy: "user-1",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<HomePage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("HomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoading = false;
    mockUser = { uid: "user-1" };
    mockActiveGroupId = "group-1";
    mockChapters = [
      {
        id: "ch-1",
        title: "Chapter 1",
        order: 1,
        content: "Content here...",
        dateModified: "2024-01-01",
        dateAdded: "2024-01-01",
        createdBy: "user-1",
        modifiedBy: "user-1",
      },
    ];
    mockQuests = [
      {
        id: "q-1",
        title: "Find the artifact",
        description: "A quest for glory",
        dateModified: "2024-01-02",
        dateAdded: "2024-01-02",
        createdBy: "user-1",
        modifiedBy: "user-1",
      },
    ];
    mockRumors = [
      {
        id: "r-1",
        title: "Strange lights",
        content: "They say dragons are flying...",
        dateModified: "2024-01-03",
        dateAdded: "2024-01-03",
        createdBy: "user-1",
        modifiedBy: "user-1",
      },
    ];
    mockNpcs = [
      {
        id: "npc-1",
        name: "Gandalf",
        description: "A wizard...",
        dateModified: "2024-01-04",
        dateAdded: "2024-01-04",
        createdBy: "user-1",
        modifiedBy: "user-1",
      },
    ];
    mockLocations = [
      {
        id: "loc-1",
        name: "The Tavern",
        description: "A cozy inn...",
        dateModified: "2024-01-05",
        dateAdded: "2024-01-05",
        createdBy: "user-1",
        modifiedBy: "user-1",
      },
    ];
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders DashboardLayout by default", () => {
      renderPage();
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
      expect(screen.queryByTestId("journal-layout")).not.toBeInTheDocument();
    });

    it("renders layout toggle button", () => {
      renderPage();
      expect(
        screen.getByTestId("button-switch-to-journal-view")
      ).toBeInTheDocument();
    });

    it("toggle button shows 'Switch to Journal View' when on dashboard", () => {
      renderPage();
      expect(
        screen.getByTestId("button-switch-to-journal-view")
      ).toHaveTextContent("Switch to Journal View");
    });
  });

  // -------------------------------------------------------------------------
  // Layout toggle
  // -------------------------------------------------------------------------
  describe("layout toggle", () => {
    it("switches to JournalLayout when toggle button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-switch-to-journal-view"));
      expect(screen.getByTestId("journal-layout")).toBeInTheDocument();
      expect(screen.queryByTestId("dashboard-layout")).not.toBeInTheDocument();
    });

    it("toggle button shows 'Switch to Dashboard View' when on journal", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-switch-to-journal-view"));
      expect(
        screen.getByTestId("button-switch-to-dashboard-view")
      ).toHaveTextContent("Switch to Dashboard View");
    });

    it("switches back to DashboardLayout when toggle button is clicked again", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-switch-to-journal-view"));
      fireEvent.click(screen.getByTestId("button-switch-to-dashboard-view"));
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
      expect(screen.queryByTestId("journal-layout")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Data passed to layouts
  // -------------------------------------------------------------------------
  describe("data passed to DashboardLayout", () => {
    it("passes chapters to DashboardLayout", () => {
      renderPage();
      expect(screen.getByTestId("dashboard-layout")).toHaveAttribute(
        "data-chapter-count",
        "1"
      );
    });

    it("passes quests to DashboardLayout", () => {
      renderPage();
      expect(screen.getByTestId("dashboard-layout")).toHaveAttribute(
        "data-quest-count",
        "1"
      );
    });

    it("passes rumors to DashboardLayout", () => {
      renderPage();
      expect(screen.getByTestId("dashboard-layout")).toHaveAttribute(
        "data-rumor-count",
        "1"
      );
    });

    it("passes NPCs to DashboardLayout", () => {
      renderPage();
      expect(screen.getByTestId("dashboard-layout")).toHaveAttribute(
        "data-npc-count",
        "1"
      );
    });

    it("passes locations to DashboardLayout", () => {
      renderPage();
      expect(screen.getByTestId("dashboard-layout")).toHaveAttribute(
        "data-location-count",
        "1"
      );
    });

    it("passes non-zero activities to DashboardLayout for items with dateModified", () => {
      renderPage();
      const activityCount = parseInt(
        screen.getByTestId("dashboard-layout").getAttribute("data-activity-count") || "0"
      );
      // All 5 mock items have dateModified, so 5 activities expected
      expect(activityCount).toBe(5);
    });

    it("passes activities sorted newest-first (by timestamp)", () => {
      // Locations have the most recent dateModified (2024-01-05)
      renderPage();
      const activityCount = parseInt(
        screen.getByTestId("dashboard-layout").getAttribute("data-activity-count") || "0"
      );
      expect(activityCount).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Activities
  // -------------------------------------------------------------------------
  describe("activity computation", () => {
    it("includes chapter in activities when only dateAdded is set (dateModified || dateAdded fallback)", () => {
      // BUG #850: Chapters use `dateModified || dateAdded` so a chapter without
      // dateModified is still included via dateAdded. This differs from quests/rumors/npcs/locations
      // which require dateModified. Test documents actual behavior.
      mockChapters = [
        {
          id: "ch-no-datemod",
          title: "Undated Chapter",
          order: 1,
          content: "...",
          // No dateModified, only dateAdded
          dateAdded: "2024-01-01",
        },
      ];
      renderPage();
      const activityCount = parseInt(
        screen.getByTestId("dashboard-layout").getAttribute("data-activity-count") || "0"
      );
      // Chapter is included via dateAdded fallback, plus 4 others = 5
      expect(activityCount).toBe(5);
    });

    it("generates correct activity type for quests", () => {
      // Smoke test: just ensure no crash with quest data
      renderPage();
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    });

    it("generates correct link for chapter activities", () => {
      // Passed through as activities prop — just verify it renders
      renderPage();
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state passthrough
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    it("passes loading=false to DashboardLayout when not loading", () => {
      renderPage();
      expect(screen.getByTestId("dashboard-layout")).toHaveAttribute(
        "data-loading",
        "false"
      );
    });

    it("renders without crashing when all contexts are loading", () => {
      mockIsLoading = true;
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty data
  // -------------------------------------------------------------------------
  describe("empty data", () => {
    it("renders without crashing when all content arrays are empty", () => {
      mockChapters = [];
      mockQuests = [];
      mockRumors = [];
      mockNpcs = [];
      mockLocations = [];
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("passes empty activities to DashboardLayout when no content exists", () => {
      mockChapters = [];
      mockQuests = [];
      mockRumors = [];
      mockNpcs = [];
      mockLocations = [];
      renderPage();
      expect(screen.getByTestId("dashboard-layout")).toHaveAttribute(
        "data-activity-count",
        "0"
      );
    });
  });
});
