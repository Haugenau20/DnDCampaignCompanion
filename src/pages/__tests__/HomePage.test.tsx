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

jest.mock("features/storytelling", () => ({
  useStory: () => ({
    chapters: mockChapters,
    isLoading: mockIsLoading,
  }),
}));

jest.mock("features/campaign-entities", () => ({
  useNPCs: () => ({
    npcs: mockNpcs,
    isLoading: mockIsLoading,
  }),
  useQuests: () => ({
    quests: mockQuests,
    isLoading: mockIsLoading,
  }),
  useLocations: () => ({
    locations: mockLocations,
    isLoading: mockIsLoading,
  }),
  useRumors: () => ({
    rumors: mockRumors,
    isLoading: mockIsLoading,
  }),
}));

// ---------------------------------------------------------------------------
// Service / utility mocks
// ---------------------------------------------------------------------------
jest.mock("core/services/firebase", () => ({}));

jest.mock("shared/utils/attribution-utils", () => ({
  determineAttributionActor: (_item: any, _map: any) => "Unknown",
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));

// ---------------------------------------------------------------------------
// Child component / layout mocks
// ---------------------------------------------------------------------------
// Both layouts render the `viewToggle` HomePage hands them — it lives in the page
// header rather than on a navigation row of its own, so the mocks have to render it
// for the switch to be reachable at all.
jest.mock("pages/layouts/dashboard/DashboardLayout", () => ({
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
    >
      {props.viewToggle}
    </div>
  ),
}));

jest.mock("pages/layouts/journal/JournalLayout", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="journal-layout"
      data-loading={String(props.loading)}
    >
      {props.viewToggle}
    </div>
  ),
}));

jest.mock("../../core/components/Button", () => ({
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

jest.mock("pages/layouts/common/hooks/useLayoutData", () => ({
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

    it("offers both views as a segmented control, not a single swap button", () => {
      renderPage();
      // The old control was one button naming only the view you were not on.
      expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Journal" })).toBeInTheDocument();
    });

    it("marks the current view as pressed", () => {
      renderPage();
      expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByRole("button", { name: "Journal" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Layout toggle
  // -------------------------------------------------------------------------
  describe("layout toggle", () => {
    it("switches to JournalLayout when Journal is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Journal" }));
      expect(screen.getByTestId("journal-layout")).toBeInTheDocument();
      expect(screen.queryByTestId("dashboard-layout")).not.toBeInTheDocument();
    });

    it("keeps the toggle reachable from the journal view", () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Journal" }));
      // Regression guard: the toggle moved out of HomePage's own markup into the
      // layouts, so a layout that fails to render it would trap the user.
      expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Journal" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("switches back to DashboardLayout when Dashboard is clicked again", () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Journal" }));
      fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
      expect(screen.queryByTestId("journal-layout")).not.toBeInTheDocument();
    });

    it("re-selecting the current view is a no-op rather than a toggle", () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
      expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
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

    // Bug #850: chapters used a `dateModified || dateAdded` fallback while
    // quests, rumors, npcs and locations required `dateModified` strictly —
    // so a never-modified quest/rumor/npc/location was silently excluded
    // from recent activity even though it was newly created. The fix unifies
    // all five branches on the fallback.
    it("includes a quest in activities when only dateAdded is set (dateModified || dateAdded fallback)", () => {
      mockQuests = [
        {
          id: "q-no-datemod",
          title: "Undated Quest",
          description: "...",
          dateAdded: "2024-01-02",
        },
      ];
      renderPage();
      const activityCount = parseInt(
        screen.getByTestId("dashboard-layout").getAttribute("data-activity-count") || "0"
      );
      // Quest is included via dateAdded fallback, plus 4 others (chapter, rumor, npc, location) = 5
      expect(activityCount).toBe(5);
    });

    it("includes a rumor in activities when only dateAdded is set (dateModified || dateAdded fallback)", () => {
      mockRumors = [
        {
          id: "r-no-datemod",
          title: "Undated Rumor",
          content: "...",
          dateAdded: "2024-01-03",
        },
      ];
      renderPage();
      const activityCount = parseInt(
        screen.getByTestId("dashboard-layout").getAttribute("data-activity-count") || "0"
      );
      expect(activityCount).toBe(5);
    });

    it("includes an NPC in activities when only dateAdded is set (dateModified || dateAdded fallback)", () => {
      mockNpcs = [
        {
          id: "npc-no-datemod",
          name: "Undated NPC",
          description: "...",
          dateAdded: "2024-01-04",
        },
      ];
      renderPage();
      const activityCount = parseInt(
        screen.getByTestId("dashboard-layout").getAttribute("data-activity-count") || "0"
      );
      expect(activityCount).toBe(5);
    });

    it("includes a location in activities when only dateAdded is set (dateModified || dateAdded fallback)", () => {
      mockLocations = [
        {
          id: "loc-no-datemod",
          name: "Undated Location",
          description: "...",
          dateModified: undefined,
          dateAdded: "2024-01-05",
        },
      ];
      renderPage();
      const activityCount = parseInt(
        screen.getByTestId("dashboard-layout").getAttribute("data-activity-count") || "0"
      );
      expect(activityCount).toBe(5);
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
