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

jest.mock("shared/context/NavigationContext", () => ({
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
jest.mock("core/components/Typography", () => ({
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

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const makeNPC = (id: string) => ({ id } as any);
const makeLocation = (id: string) => ({ id } as any);
const makeChapter = (id: string) => ({ id } as any);
const makeRumor = (id: string) => ({ id } as any);
const makeQuest = (id: string, status: "active" | "completed" | "failed" = "active") =>
  ({ id, status } as any);

/** The strip renders each count as a button, so find it via its label. */
const statButton = (label: string) => screen.getByText(label).closest("button")!;

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
      const { container } = render(<CampaignStats loading />);
      expect(container).toBeInTheDocument();
    });

    it("renders the strip container while loading", () => {
      render(<CampaignStats loading />);
      expect(screen.getByTestId("campaign-stats-strip")).toBeInTheDocument();
    });

    it("does not render clickable stat counts when loading", () => {
      render(<CampaignStats loading />);
      expect(screen.queryByText("Chapters")).not.toBeInTheDocument();
      expect(screen.queryAllByRole("button")).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Structure — one strip, not six cards
  // -------------------------------------------------------------------------
  describe("structure", () => {
    it("renders the four counts plus the quest fraction as five controls", () => {
      render(<CampaignStats />);
      // Previously six equal cards plus a seventh full-width progress card.
      expect(screen.getAllByRole("button")).toHaveLength(5);
    });

    it("keeps an accessible name for the region without a visible heading", () => {
      render(<CampaignStats />);
      const heading = screen.getByText("Campaign Stats");
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass("sr-only");
    });

    it("labels the counts by entity, dropping the redundant quest counters", () => {
      render(<CampaignStats />);
      expect(screen.getByText("Chapters")).toBeInTheDocument();
      expect(screen.getByText("NPCs")).toBeInTheDocument();
      expect(screen.getByText("Locations")).toBeInTheDocument();
      expect(screen.getByText("Rumors")).toBeInTheDocument();
      // "Active Quests" and "Total Quests" were a breakdown of each other, now
      // stated once as a fraction.
      expect(screen.queryByText("Active Quests")).not.toBeInTheDocument();
      expect(screen.queryByText("Total Quests")).not.toBeInTheDocument();
      expect(screen.queryByText("Quest Completion")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Counts
  // -------------------------------------------------------------------------
  describe("stat counts reflect prop values", () => {
    it("defaults every count to 0 with no props", () => {
      render(<CampaignStats />);
      for (const label of ["Chapters", "NPCs", "Locations", "Rumors"]) {
        expect(statButton(label)).toHaveTextContent("0");
      }
    });

    it("shows the correct counts", () => {
      render(
        <CampaignStats
          npcs={[makeNPC("n1"), makeNPC("n2")]}
          locations={[makeLocation("l1")]}
          chapters={[makeChapter("c1"), makeChapter("c2"), makeChapter("c3")]}
          rumors={[makeRumor("r1")]}
        />
      );
      expect(statButton("Chapters")).toHaveTextContent("3");
      expect(statButton("NPCs")).toHaveTextContent("2");
      expect(statButton("Locations")).toHaveTextContent("1");
      expect(statButton("Rumors")).toHaveTextContent("1");
    });

    it("dims a zero count instead of hiding it", () => {
      render(<CampaignStats chapters={[makeChapter("c1")]} />);
      // An empty campaign is information; it just should not compete visually.
      const rumorsValue = statButton("Rumors").querySelector("h4");
      expect(rumorsValue).toHaveTextContent("0");
      expect(rumorsValue?.className).toContain("opacity-40");

      const chaptersValue = statButton("Chapters").querySelector("h4");
      expect(chaptersValue?.className).not.toContain("opacity-40");
    });
  });

  // -------------------------------------------------------------------------
  // Quest fraction — the bar now states its own number
  // -------------------------------------------------------------------------
  describe("quest fraction", () => {
    it("spells out the completed-of-total fraction", () => {
      render(
        <CampaignStats
          quests={[
            makeQuest("q1", "completed"),
            makeQuest("q2", "active"),
            makeQuest("q3", "active"),
          ]}
        />
      );
      // The progress bar previously carried no number at all.
      expect(screen.getByText("of 3 quests complete")).toBeInTheDocument();
      expect(screen.getByText("2 active")).toBeInTheDocument();
    });

    it("uses the singular for a single quest", () => {
      render(<CampaignStats quests={[makeQuest("q1", "active")]} />);
      expect(screen.getByText("of 1 quest complete")).toBeInTheDocument();
    });

    it("exposes completion as a progressbar with a percentage", () => {
      render(
        <CampaignStats
          quests={[makeQuest("q1", "completed"), makeQuest("q2", "active")]}
        />
      );
      const bar = screen.getByRole("progressbar", { name: "Quest completion" });
      expect(bar).toHaveAttribute("aria-valuenow", "50");
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
    });

    it("reports 0% with no quests rather than dividing by zero", () => {
      render(<CampaignStats quests={[]} />);
      expect(
        screen.getByRole("progressbar", { name: "Quest completion" })
      ).toHaveAttribute("aria-valuenow", "0");
      expect(screen.getByText("of 0 quests complete")).toBeInTheDocument();
    });

    it("names the unfinished remainder when nothing is active", () => {
      // 'failed' is a third QuestStatus, so active + completed need not equal total.
      render(
        <CampaignStats
          quests={[makeQuest("q1", "completed"), makeQuest("q2", "failed")]}
        />
      );
      expect(screen.getByText("1 unfinished")).toBeInTheDocument();
    });

    it("counts only completed quests as complete", () => {
      render(
        <CampaignStats
          quests={[
            makeQuest("q1", "active"),
            makeQuest("q2", "failed"),
            makeQuest("q3", "completed"),
          ]}
        />
      );
      expect(
        screen.getByRole("progressbar", { name: "Quest completion" })
      ).toHaveAttribute("aria-valuenow", "33");
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it.each([
      ["Chapters", "/story/chapters"],
      ["NPCs", "/npcs"],
      ["Locations", "/locations"],
      ["Rumors", "/rumors"],
    ])("clicking %s navigates to %s", async (label, path) => {
      render(<CampaignStats />);
      await userEvent.click(statButton(label));
      expect(mockNavigateToPage).toHaveBeenCalledWith(path);
    });

    it("clicking the quest fraction navigates to /quests", async () => {
      render(<CampaignStats quests={[makeQuest("q1")]} />);
      await userEvent.click(screen.getByText("of 1 quest complete").closest("button")!);
      expect(mockNavigateToPage).toHaveBeenCalledWith("/quests");
    });

    it("counts are reachable as buttons, not click-handled divs", () => {
      render(<CampaignStats />);
      // The stats used to be non-interactive Cards with onClick, so they were not
      // keyboard reachable.
      expect(statButton("NPCs").tagName).toBe("BUTTON");
    });
  });
});
