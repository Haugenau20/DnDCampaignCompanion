// src/components/features/layouts/dashboard/sections/__tests__/ActivityFeed.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityFeed from "../ActivityFeed";
import { Activity } from "../../../../../../pages/HomePage";

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

// Mock LoadingState
jest.mock(
  "../../../../layouts/common/components/LoadingState",
  () => ({
    __esModule: true,
    default: ({ type, count, height }: any) => (
      <div
        data-testid="loading-state"
        data-type={type}
        data-count={count}
        data-height={height}
      />
    ),
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
jest.mock("../../../../../core/Typography", () => ({
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

// Mock core Card
jest.mock("../../../../../core/Card", () => {
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
    it("renders the LoadingState component when loading=true", () => {
      render(<ActivityFeed activities={[]} loading={true} />);
      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    });

    it("passes type=card to LoadingState", () => {
      render(<ActivityFeed activities={[]} loading={true} />);
      expect(screen.getByTestId("loading-state")).toHaveAttribute(
        "data-type",
        "card"
      );
    });

    it("passes count=4 to LoadingState", () => {
      render(<ActivityFeed activities={[]} loading={true} />);
      expect(screen.getByTestId("loading-state")).toHaveAttribute(
        "data-count",
        "4"
      );
    });

    it("passes height=h-20 to LoadingState", () => {
      render(<ActivityFeed activities={[]} loading={true} />);
      expect(screen.getByTestId("loading-state")).toHaveAttribute(
        "data-height",
        "h-20"
      );
    });

    it("shows the 'Recent Activity' heading while loading", () => {
      render(<ActivityFeed activities={[]} loading={true} />);
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    it("does not render activity cards when loading", () => {
      render(<ActivityFeed activities={[makeActivity()]} loading={true} />);
      expect(screen.queryByTestId("card")).not.toBeInTheDocument();
    });

    it("does not render the filter select when loading", () => {
      render(<ActivityFeed activities={[]} loading={true} />);
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loaded — empty activities
  // -------------------------------------------------------------------------
  describe("empty state (loaded, no activities)", () => {
    beforeEach(() => {
      setupHook({ activities: [] });
    });

    it("renders the 'Recent Activity' heading", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    it("renders the filter select", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
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
  // Filter select options
  // -------------------------------------------------------------------------
  describe("filter select", () => {
    beforeEach(() => {
      setupHook({ activities: [] });
    });

    it("renders 'All' option", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(screen.getByRole("option", { name: "All" })).toBeInTheDocument();
    });

    it("renders 'Story' option (chapter filter)", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(screen.getByRole("option", { name: "Story" })).toBeInTheDocument();
    });

    it("renders 'NPCs' option", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(screen.getByRole("option", { name: "NPCs" })).toBeInTheDocument();
    });

    it("renders 'Quests' option", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(
        screen.getByRole("option", { name: "Quests" })
      ).toBeInTheDocument();
    });

    it("renders 'Locations' option", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(
        screen.getByRole("option", { name: "Locations" })
      ).toBeInTheDocument();
    });

    it("renders 'Rumors' option", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      expect(
        screen.getByRole("option", { name: "Rumors" })
      ).toBeInTheDocument();
    });

    it("defaults the select to 'all'", () => {
      render(<ActivityFeed activities={[]} loading={false} />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("all");
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

    it("updates filter state when user changes select value", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "npc");

      // The hook should have been called again with 'npc' filter
      expect(mockUseActivityDisplay).toHaveBeenCalledWith(
        expect.objectContaining({ filter: "npc" })
      );
    });

    it("resets filter to null when user selects 'all'", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      const select = screen.getByRole("combobox");
      // First go to npc
      await user.selectOptions(select, "npc");
      // Then back to all
      await user.selectOptions(select, "all");

      // The last call to the hook should have null filter
      const calls = mockUseActivityDisplay.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.filter).toBeNull();
    });

    it("shows filter-specific message in EmptyState when filter is active", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "npc");

      // EmptyState message should now be filter-specific
      // mockGetTypeLabel returns "Label:npc" but the component calls getTypeLabel from hook
      expect(screen.getByTestId("empty-message")).toHaveTextContent(
        /No.*activity found/i
      );
    });

    it("shows 'Show All Activity' action button when filter is active and activities empty", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "quest");

      expect(screen.getByTestId("empty-action")).toHaveTextContent(
        "Show All Activity"
      );
    });

    it("clicking 'Show All Activity' resets filter to null", async () => {
      const user = userEvent.setup();
      setupHook({ activities: [] });
      render(<ActivityFeed activities={[]} loading={false} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "quest");

      const clearBtn = screen.getByTestId("empty-action");
      await user.click(clearBtn);

      const calls = mockUseActivityDisplay.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.filter).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Activities list rendering
  // -------------------------------------------------------------------------
  describe("activities list", () => {
    it("renders a Card for each activity", () => {
      const activities = [
        makeActivity({ id: "a1", type: "npc", title: "Gandalf" }),
        makeActivity({ id: "a2", type: "quest", title: "Find the Ring" }),
      ];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      const cards = screen.getAllByTestId("card");
      // Two activity cards (EmptyState also uses a Card if empty, but here we have activities)
      expect(cards.length).toBeGreaterThanOrEqual(2);
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

    it("renders the actor name when provided", () => {
      const activities = [
        makeActivity({ actor: "PlayerAlpha" }),
      ];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      expect(screen.getByText(/PlayerAlpha/)).toBeInTheDocument();
    });

    it("does not render actor line when actor is empty string", () => {
      const activities = [
        makeActivity({ actor: "" }),
      ];
      setupHook({ activities });
      render(<ActivityFeed activities={activities} loading={false} />);

      // The "By:" prefix should not appear when actor is falsy
      expect(screen.queryByText(/^By:/)).not.toBeInTheDocument();
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
  });

  // -------------------------------------------------------------------------
  // Click handling
  // -------------------------------------------------------------------------
  describe("activity click handling", () => {
    it("calls handleActivityClick when an activity card is clicked", async () => {
      const user = userEvent.setup();
      const activity = makeActivity({ id: "act-click" });
      setupHook({ activities: [activity] });
      render(<ActivityFeed activities={[activity]} loading={false} />);

      const cards = screen.getAllByTestId("card");
      // The first card is the activity card (no empty state)
      await user.click(cards[0]);

      expect(mockHandleActivityClick).toHaveBeenCalledWith(activity);
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
