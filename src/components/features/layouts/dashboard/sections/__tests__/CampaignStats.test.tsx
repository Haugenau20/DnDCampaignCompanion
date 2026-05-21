// src/components/features/layouts/dashboard/sections/__tests__/CampaignStats.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CampaignStats from "../CampaignStats";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useNavigation
const mockNavigateToPage = jest.fn();

jest.mock("../../../../../../context/NavigationContext", () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    state: { currentPath: "/" },
    goBack: jest.fn(),
    updateQueryParams: jest.fn(),
    getCurrentQueryParams: jest.fn(() => ({})),
    clearHistory: jest.fn(),
    createPath: jest.fn(),
  }),
}));

// Mock core Typography
jest.mock("../../../../../core/Typography", () => ({
  __esModule: true,
  default: ({ children, variant, color, className }: any) => {
    const Tag =
      variant === "h3"
        ? "h3"
        : variant === "h4"
        ? "h4"
        : "span";
    return (
      <Tag data-testid={`typography-${variant || "body"}`} data-color={color} className={className}>
        {children}
      </Tag>
    );
  },
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

// Mock lucide-react icons so they render identifiably
jest.mock("lucide-react", () => ({
  Users: () => <svg data-testid="icon-users" />,
  Map: () => <svg data-testid="icon-map" />,
  Scroll: () => <svg data-testid="icon-scroll" />,
  BookOpen: () => <svg data-testid="icon-bookopen" />,
  MessageSquare: () => <svg data-testid="icon-messagesquare" />,
  List: () => <svg data-testid="icon-list" />,
}));

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const makeNPC = (id: string) => ({ id } as any);
const makeLocation = (id: string) => ({ id } as any);
const makeChapter = (id: string) => ({ id } as any);
const makeRumor = (id: string) => ({ id } as any);
const makeQuest = (id: string, status: "active" | "completed" | "failed" = "active") =>
  ({ id, status } as any);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CampaignStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    it("renders without crashing when loading=true", () => {
      const { container } = render(<CampaignStats loading={true} />);
      expect(container).toBeInTheDocument();
    });

    it("shows the 'Campaign Stats' heading while loading", () => {
      render(<CampaignStats loading={true} />);
      expect(screen.getByText("Campaign Stats")).toBeInTheDocument();
    });

    it("renders 7 loading skeleton cards (6 stat + 1 progress)", () => {
      render(<CampaignStats loading={true} />);
      // 7 animated cards (6 stats + 1 full-width progress card)
      const cards = screen.getAllByTestId("card");
      expect(cards).toHaveLength(7);
    });

    it("does not render clickable stat counts when loading", () => {
      render(
        <CampaignStats
          loading={true}
          npcs={[makeNPC("n1"), makeNPC("n2")]}
        />
      );
      // The count "2" should not appear as a stat value
      expect(screen.queryByText("2")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Default props / empty state
  // -------------------------------------------------------------------------
  describe("default props (all arrays empty)", () => {
    it("renders without crashing with no props", () => {
      const { container } = render(<CampaignStats />);
      expect(container).toBeInTheDocument();
    });

    it("shows the 'Campaign Stats' heading", () => {
      render(<CampaignStats />);
      expect(screen.getByText("Campaign Stats")).toBeInTheDocument();
    });

    it("displays 0 for NPCs", () => {
      render(<CampaignStats npcs={[]} />);
      // Counts are displayed but we need to find the one associated with NPCs
      const npcCard = screen.getByText("NPCs").closest("[data-testid='card']");
      expect(npcCard).toBeInTheDocument();
      // The h4 in the NPC card should show 0
      const h4 = npcCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("0");
    });

    it("displays 0 for Locations", () => {
      render(<CampaignStats locations={[]} />);
      const locCard = screen
        .getByText("Locations")
        .closest("[data-testid='card']");
      const h4 = locCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("0");
    });

    it("displays 0 for Story Chapters", () => {
      render(<CampaignStats chapters={[]} />);
      const chCard = screen
        .getByText("Story Chapters")
        .closest("[data-testid='card']");
      const h4 = chCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("0");
    });

    it("displays 0 for Rumors", () => {
      render(<CampaignStats rumors={[]} />);
      const rumCard = screen
        .getByText("Rumors")
        .closest("[data-testid='card']");
      const h4 = rumCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("0");
    });

    it("displays 0 for Active Quests", () => {
      render(<CampaignStats quests={[]} />);
      const aqCard = screen
        .getByText("Active Quests")
        .closest("[data-testid='card']");
      const h4 = aqCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("0");
    });

    it("displays 0 for Total Quests", () => {
      render(<CampaignStats quests={[]} />);
      const tqCard = screen
        .getByText("Total Quests")
        .closest("[data-testid='card']");
      const h4 = tqCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("0");
    });
  });

  // -------------------------------------------------------------------------
  // Count display
  // -------------------------------------------------------------------------
  describe("stat counts reflect prop values", () => {
    it("shows correct NPC count", () => {
      render(<CampaignStats npcs={[makeNPC("a"), makeNPC("b"), makeNPC("c")]} />);
      const npcCard = screen.getByText("NPCs").closest("[data-testid='card']");
      const h4 = npcCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("3");
    });

    it("shows correct Location count", () => {
      render(
        <CampaignStats locations={[makeLocation("l1"), makeLocation("l2")]} />
      );
      const locCard = screen
        .getByText("Locations")
        .closest("[data-testid='card']");
      const h4 = locCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("2");
    });

    it("shows correct Chapter count", () => {
      render(
        <CampaignStats
          chapters={[makeChapter("ch1"), makeChapter("ch2"), makeChapter("ch3")]}
        />
      );
      const chCard = screen
        .getByText("Story Chapters")
        .closest("[data-testid='card']");
      const h4 = chCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("3");
    });

    it("shows correct Rumor count", () => {
      render(<CampaignStats rumors={[makeRumor("r1")]} />);
      const rumCard = screen
        .getByText("Rumors")
        .closest("[data-testid='card']");
      const h4 = rumCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("1");
    });
  });

  // -------------------------------------------------------------------------
  // Quest stats calculation
  // -------------------------------------------------------------------------
  describe("quest stat calculations", () => {
    it("counts only active quests for Active Quests stat", () => {
      const quests = [
        makeQuest("q1", "active"),
        makeQuest("q2", "active"),
        makeQuest("q3", "completed"),
        makeQuest("q4", "failed"),
      ];
      render(<CampaignStats quests={quests} />);
      const aqCard = screen
        .getByText("Active Quests")
        .closest("[data-testid='card']");
      const h4 = aqCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("2");
    });

    it("shows the total number of quests (all statuses)", () => {
      const quests = [
        makeQuest("q1", "active"),
        makeQuest("q2", "completed"),
        makeQuest("q3", "failed"),
      ];
      render(<CampaignStats quests={quests} />);
      const tqCard = screen
        .getByText("Total Quests")
        .closest("[data-testid='card']");
      const h4 = tqCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("3");
    });

    it("handles all completed quests — active count is 0", () => {
      const quests = [makeQuest("q1", "completed"), makeQuest("q2", "completed")];
      render(<CampaignStats quests={quests} />);
      const aqCard = screen
        .getByText("Active Quests")
        .closest("[data-testid='card']");
      const h4 = aqCard?.querySelector("[data-testid='typography-h4']");
      expect(h4?.textContent).toBe("0");
    });
  });

  // -------------------------------------------------------------------------
  // Quest completion progress bar
  // -------------------------------------------------------------------------
  describe("quest completion progress bar", () => {
    it("renders the 'Quest Completion' heading", () => {
      render(<CampaignStats />);
      expect(screen.getByText("Quest Completion")).toBeInTheDocument();
    });

    it("renders the progress bar container", () => {
      const { container } = render(<CampaignStats />);
      const progressContainer = container.querySelector(".progress-container");
      expect(progressContainer).toBeInTheDocument();
    });

    it("shows 0% width when no quests exist", () => {
      const { container } = render(<CampaignStats quests={[]} />);
      const progressBar = container.querySelector(".progress-bar") as HTMLElement;
      expect(progressBar?.style.width).toBe("0%");
    });

    it("shows 100% width when all quests are completed", () => {
      const quests = [
        makeQuest("q1", "completed"),
        makeQuest("q2", "completed"),
      ];
      const { container } = render(<CampaignStats quests={quests} />);
      const progressBar = container.querySelector(".progress-bar") as HTMLElement;
      expect(progressBar?.style.width).toBe("100%");
    });

    it("shows 50% width when half the quests are completed", () => {
      const quests = [
        makeQuest("q1", "active"),
        makeQuest("q2", "completed"),
      ];
      const { container } = render(<CampaignStats quests={quests} />);
      const progressBar = container.querySelector(".progress-bar") as HTMLElement;
      expect(progressBar?.style.width).toBe("50%");
    });

    it("shows 0% width when no quests are completed (but some exist)", () => {
      const quests = [makeQuest("q1", "active"), makeQuest("q2", "active")];
      const { container } = render(<CampaignStats quests={quests} />);
      const progressBar = container.querySelector(".progress-bar") as HTMLElement;
      expect(progressBar?.style.width).toBe("0%");
    });

    it("avoids division by zero when quests array is empty", () => {
      // Should render 0% without throwing
      const { container } = render(<CampaignStats quests={[]} />);
      const progressBar = container.querySelector(".progress-bar") as HTMLElement;
      expect(progressBar?.style.width).toBe("0%");
    });
  });

  // -------------------------------------------------------------------------
  // Navigation on card clicks
  // -------------------------------------------------------------------------
  describe("navigation on stat card click", () => {
    it("navigates to /npcs when the NPCs card is clicked", async () => {
      const user = userEvent.setup();
      render(<CampaignStats />);
      const npcCard = screen.getByText("NPCs").closest("[data-testid='card']");
      await user.click(npcCard!);
      expect(mockNavigateToPage).toHaveBeenCalledWith("/npcs");
    });

    it("navigates to /locations when the Locations card is clicked", async () => {
      const user = userEvent.setup();
      render(<CampaignStats />);
      const locCard = screen
        .getByText("Locations")
        .closest("[data-testid='card']");
      await user.click(locCard!);
      expect(mockNavigateToPage).toHaveBeenCalledWith("/locations");
    });

    it("navigates to /story/chapters when the Story Chapters card is clicked", async () => {
      const user = userEvent.setup();
      render(<CampaignStats />);
      const chCard = screen
        .getByText("Story Chapters")
        .closest("[data-testid='card']");
      await user.click(chCard!);
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/chapters");
    });

    it("navigates to /rumors when the Rumors card is clicked", async () => {
      const user = userEvent.setup();
      render(<CampaignStats />);
      const rumCard = screen
        .getByText("Rumors")
        .closest("[data-testid='card']");
      await user.click(rumCard!);
      expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors");
    });

    it("navigates to /quests when the Active Quests card is clicked", async () => {
      const user = userEvent.setup();
      render(<CampaignStats />);
      const aqCard = screen
        .getByText("Active Quests")
        .closest("[data-testid='card']");
      await user.click(aqCard!);
      expect(mockNavigateToPage).toHaveBeenCalledWith("/quests");
    });

    it("navigates to /quests when the Total Quests card is clicked", async () => {
      const user = userEvent.setup();
      render(<CampaignStats />);
      const tqCard = screen
        .getByText("Total Quests")
        .closest("[data-testid='card']");
      await user.click(tqCard!);
      expect(mockNavigateToPage).toHaveBeenCalledWith("/quests");
    });

    it("navigates to /quests when the Quest Completion card is clicked", async () => {
      const user = userEvent.setup();
      render(<CampaignStats />);
      const qcCard = screen
        .getByText("Quest Completion")
        .closest("[data-testid='card']");
      await user.click(qcCard!);
      expect(mockNavigateToPage).toHaveBeenCalledWith("/quests");
    });
  });

  // -------------------------------------------------------------------------
  // Icons rendering
  // -------------------------------------------------------------------------
  describe("icon rendering", () => {
    it("renders the Users icon for NPCs", () => {
      render(<CampaignStats />);
      expect(screen.getByTestId("icon-users")).toBeInTheDocument();
    });

    it("renders the Map icon for Locations", () => {
      render(<CampaignStats />);
      expect(screen.getByTestId("icon-map")).toBeInTheDocument();
    });

    it("renders the BookOpen icon for Story Chapters", () => {
      render(<CampaignStats />);
      expect(screen.getByTestId("icon-bookopen")).toBeInTheDocument();
    });

    it("renders the MessageSquare icon for Rumors", () => {
      render(<CampaignStats />);
      expect(screen.getByTestId("icon-messagesquare")).toBeInTheDocument();
    });

    it("renders the Scroll icon for Active Quests", () => {
      render(<CampaignStats />);
      expect(screen.getByTestId("icon-scroll")).toBeInTheDocument();
    });

    it("renders the List icon for Total Quests", () => {
      render(<CampaignStats />);
      expect(screen.getByTestId("icon-list")).toBeInTheDocument();
    });
  });
});
