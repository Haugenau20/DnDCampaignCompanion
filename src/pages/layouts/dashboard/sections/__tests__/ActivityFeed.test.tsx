// src/components/features/layouts/dashboard/sections/__tests__/ActivityFeed.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityFeed from "../ActivityFeed";
import { Activity } from "pages/HomePage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the useActivityDisplay hook — the primary external dependency
const mockHandleActivityClick = jest.fn();
const mockFormatDate = jest.fn((d: Date) => `formatted:${d.toISOString()}`);
const mockGetTypeLabel = jest.fn((type: string) => `Label:${type}`);
const mockUseActivityDisplay = jest.fn();

jest.mock(
  "../../../../layouts/common/hooks/useActivityDisplay",
  () => ({
    useActivityDisplay: (...args: any[]) => mockUseActivityDisplay(...args),
  })
);

// Mock getContentIcon so it returns a simple testable element
jest.mock(
  "../../../../layouts/common/utils/contentTypeUtils",
  () => ({
    getContentIcon: (type: string, size: number) => (
      <svg data-testid={`icon-${type}-${size}`} />
    ),
    getContentTypeLabel: (type: string) => `Label:${type}`,
  })
);

// Mock EmptyState
jest.mock(
  "../../../../layouts/common/components/EmptyState",
  () => ({
    __esModule: true,
    default: ({ title, message, actionLabel, onAction }: any) => (
      <div data-testid="empty-state">
        {title && <span data-testid="empty-title">{title}</span>}
        <span data-testid="empty-message">{message}</span>
        {actionLabel && onAction && (
          <button data-testid="empty-action" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    ),
  })
);

// Mock core Typography
jest.mock("core/components/Typography", () => ({
  __esModule: true,
  default: ({ children, variant, color, className }: any) => (
    <span
      data-testid={`typography-${variant || "default"}`}
      data-color={color}
      className={className}
    >
      {children}
    </span>
  ),
}));

// Mock core Card — still used by the empty state
jest.mock("core/components/Card", () => {
  const Card: any = ({ children, hoverable, onClick, className }: any) => (
    <div
      data-testid="card"
      data-hoverable={hoverable ? "true" : undefined}
      className={className}
      onClick={onClick}
    >
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

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const HEADING = "Since you last played";

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: "act-1",
  type: "npc",
  title: "Gandalf",
  actor: "Player1",
  timestamp: new Date("2024-01-15T10:00:00Z"),
  link: "/npcs?highlight=act-1",
  ...overrides,
});

const setupHook = ({
  activities = [] as Activity[],
} = {}) => {
  mockUseActivityDisplay.mockReturnValue({
    activities,
    formatDate: mockFormatDate,
    handleActivityClick: mockHandleActivityClick,
    getTypeLabel: mockGetTypeLabel,
  });
};

/** Each entry is a single button row, found via its title. */
const activityRow = (title: string) => screen.getByText(title).closest("button")!;

/** The filter pills, by visible label. */
const filterPill = (label: string) => screen.getByRole("button", { name: label });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ActivityFeed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    it("renders a skeleton shaped like the list it stands in for", () => {
      const { container } = render(<ActivityFeed activities={[]} loading={true} />);
      // LoadingState's `type="card"` has no branch — it silently falls through to a
      // spinner and drops count/height — so the skeleton is inlined instead.
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
      expect(container.querySelectorAll(".journal-loading")).toHaveLength(4);
    });

    it("shows the heading while loading", () => {
      render(<ActivityFeed activities={[]} loading={true} />);
      expect(screen.getByText(HEADING)).toBeInTheDocument();
    });

    it("does not render activity rows when loading", () => {
      render(<ActivityFeed activities={[makeActivity()]} loading={true} />);
      expect(screen.queryByText("Gandalf")).not.toBeInTheDocument();
    });

    it("does not render the filters when loading", () => {
      render(<ActivityFeed activities={[]} loading={true} />);
      expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Heading
  // -------------------------------------------------------------------------
  describe("heading", () => {
    it("names the question the feed answers", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      // "Recent Activity" described the mechanism; this describes the need.
      expect(screen.getByText(HEADING)).toBeInTheDocument();
      expect(screen.queryByText("Recent Activity")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loaded — empty activities
  // -------------------------------------------------------------------------
  describe("empty state (loaded, no activities)", () => {
    beforeEach(() => {
      setupHook({ activities: [] });
    });

    it("renders the filters", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(filterPill("All")).toBeInTheDocument();
    });

    it("renders the EmptyState component", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("shows 'No Recent Activity' title in EmptyState", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(screen.getByTestId("empty-title")).toHaveTextContent(
        "No Recent Activity"
      );
    });

    it("shows default message when no filter is active", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(screen.getByTestId("empty-message")).toHaveTextContent(
        "Start creating content to see activity here"
      );
    });

    it("does not show the action button when no filter is active", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(screen.queryByTestId("empty-action")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Filter pills — every option visible, instead of one visible in a <select>
  // -------------------------------------------------------------------------
  describe("filter pills", () => {
    beforeEach(() => {
      setupHook({ activities: [] });
    });

    it.each(["All", "Story", "Quests", "NPCs", "Locations", "Rumors"])(
      "renders the %s filter as a visible control",
      (label) => {
        render(<ActivityFeed activities={[]} loading={false} />);
        expect(filterPill(label)).toBeInTheDocument();
      }
    );

    it("does not use a select, which hid five of six options", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("marks 'All' as the pressed filter by default", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(filterPill("All")).toHaveAttribute("aria-pressed", "true");
      expect(filterPill("NPCs")).toHaveAttribute("aria-pressed", "false");
    });

    it("groups the filters with an accessible name", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(
        screen.getByRole("group", { name: "Filter activity by type" })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Filter interaction — changing filter rebuilds activities via hook
  // -------------------------------------------------------------------------
  describe("filter interaction", () => {
    it("passes initial null filter to useActivityDisplay", () => {
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(mockUseActivityDisplay).toHaveBeenCalledWith(
        expect.objectContaining({ filter: null })
      );
    });

    it("updates filter state when a pill is clicked", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      await user.click(filterPill("NPCs"));

      expect(mockUseActivityDisplay).toHaveBeenCalledWith(
        expect.objectContaining({ filter: "npc" })
      );
    });

    it("marks the chosen pill as pressed", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      await user.click(filterPill("Quests"));

      expect(filterPill("Quests")).toHaveAttribute("aria-pressed", "true");
      expect(filterPill("All")).toHaveAttribute("aria-pressed", "false");
    });

    it("resets filter to null when 'All' is clicked", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      await user.click(filterPill("NPCs"));
      await user.click(filterPill("All"));

      const calls = mockUseActivityDisplay.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.filter).toBeNull();
    });

    it("shows filter-specific message in EmptyState when filter is active", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      await user.click(filterPill("NPCs"));

      expect(screen.getByTestId("empty-message")).toHaveTextContent(
        /No.*activity found/i
      );
    });

    it("shows 'Show All Activity' action when filter is active and activities empty", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      await user.click(filterPill("Quests"));

      expect(screen.getByTestId("empty-action")).toHaveTextContent(
        "Show All Activity"
      );
    });

    it("clicking 'Show All Activity' resets filter to null", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      await user.click(filterPill("Quests"));
      await user.click(screen.getByTestId("empty-action"));

      const calls = mockUseActivityDisplay.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.filter).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Activities list rendering
  // -------------------------------------------------------------------------
  describe("activities list", () => {
    it("renders one row per activity", () => {
      const activities = [
        makeActivity({ id: "a1", type: "npc", title: "Gandalf" }),
        makeActivity({ id: "a2", type: "quest", title: "Find the Ring" }),
      ];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      expect(activityRow("Gandalf")).toBeInTheDocument();
      expect(activityRow("Find the Ring")).toBeInTheDocument();
    });

    it("renders rows as one list rather than a card per entry", () => {
      const activities = [makeActivity({ id: "a1" })];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      // Entries were individual Cards; they are now rows in a single bordered list.
      expect(screen.queryByTestId("card")).not.toBeInTheDocument();
    });

    it("renders the activity title for each item", () => {
      const activities = [
        makeActivity({ id: "a1", title: "The Chosen One" }),
        makeActivity({ id: "a2", title: "Dark Tower" }),
      ];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      expect(screen.getByText("The Chosen One")).toBeInTheDocument();
      expect(screen.getByText("Dark Tower")).toBeInTheDocument();
    });

    it("renders the actor name without a 'By:' prefix", () => {
      const activities = [makeActivity({ actor: "PlayerAlpha" })];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      expect(screen.getByText("PlayerAlpha")).toBeInTheDocument();
      expect(screen.queryByText(/^By:/)).not.toBeInTheDocument();
    });

    it("does not render an actor line when actor is empty string", () => {
      const activities = [makeActivity({ actor: "" })];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      expect(screen.queryByText("Player1")).not.toBeInTheDocument();
    });

    it("calls formatDate with the activity timestamp", () => {
      const ts = new Date("2024-06-01T12:00:00Z");
      const activities = [makeActivity({ timestamp: ts })];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      expect(mockFormatDate).toHaveBeenCalledWith(ts);
    });

    it("renders the formatted date returned by formatDate", () => {
      const ts = new Date("2024-06-01T12:00:00Z");
      mockFormatDate.mockReturnValue("Jun 1, 2024");
      const activities = [makeActivity({ timestamp: ts })];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      expect(screen.getByText("Jun 1, 2024")).toBeInTheDocument();
    });

    it("calls getTypeLabel for each activity type", () => {
      const activities = [makeActivity({ type: "npc" })];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      expect(mockGetTypeLabel).toHaveBeenCalledWith("npc");
    });

    it("names the action per entity type", () => {
      const activities = [
        makeActivity({ id: "a1", type: "chapter", title: "Chapter One" }),
        makeActivity({ id: "a2", type: "location", title: "Neverwinter" }),
      ];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      expect(activityRow("Chapter One")).toHaveTextContent("Read");
      expect(activityRow("Neverwinter")).toHaveTextContent("Open");
    });
  });

  // -------------------------------------------------------------------------
  // Click handling
  // -------------------------------------------------------------------------
  describe("activity click handling", () => {
    it("calls handleActivityClick when an activity row is clicked", async () => {
      const user = userEvent.setup();
      const activity = makeActivity({ id: "act-click", title: "Clickable" });
      setupHook({ activities: [activity] });
      render(<ActivityFeed activities={[activity]} loading={false} />);

      await user.click(activityRow("Clickable"));

      expect(mockHandleActivityClick).toHaveBeenCalledWith(activity);
    });

    it("makes each row a real button, so it is keyboard reachable", () => {
      const activity = makeActivity({ title: "Reachable" });
      setupHook({ activities: [activity] });
      render(<ActivityFeed activities={[activity]} loading={false} />);

      // Rows were Cards with onClick and no key handler.
      expect(activityRow("Reachable").tagName).toBe("BUTTON");
    });

    it("passes limit=4 to useActivityDisplay", () => {
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      expect(mockUseActivityDisplay).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 4 })
      );
    });

    it("passes journalStyle=false to useActivityDisplay", () => {
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      expect(mockUseActivityDisplay).toHaveBeenCalledWith(
        expect.objectContaining({ journalStyle: false })
      );
    });
  });
});
