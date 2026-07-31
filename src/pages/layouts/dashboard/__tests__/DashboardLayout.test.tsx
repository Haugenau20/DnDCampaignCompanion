// src/components/features/layouts/dashboard/__tests__/DashboardLayout.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import DashboardLayout from "../DashboardLayout";

// ---------------------------------------------------------------------------
// Mocks — child sections are mocked so this test focuses on layout/routing only
// ---------------------------------------------------------------------------

jest.mock("../sections/CampaignBanner", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="campaign-banner" data-chapter-count={props.chapterCount}>
      CampaignBanner
      {props.action}
    </div>
  ),
}));

jest.mock("../sections/OpenQuests", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="open-quests"
      data-quests={props.quests?.length}
      data-loading={String(props.loading)}
    >
      OpenQuests
    </div>
  ),
}));

jest.mock("../sections/RumorPrompt", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="rumor-prompt" data-rumor-count={props.rumorCount}>
      RumorPrompt
    </div>
  ),
}));

jest.mock("../sections/CampaignStats", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="campaign-stats"
      data-npcs={props.npcs?.length}
      data-locations={props.locations?.length}
      data-quests={props.quests?.length}
      data-chapters={props.chapters?.length}
      data-rumors={props.rumors?.length}
      data-loading={String(props.loading)}
    >
      CampaignStats
    </div>
  ),
}));

jest.mock("../sections/ActivityFeed", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="activity-feed"
      data-activities={props.activities?.length}
      data-loading={String(props.loading)}
    >
      ActivityFeed
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Test data builders
// ---------------------------------------------------------------------------

const makeProps = (overrides: Partial<React.ComponentProps<typeof DashboardLayout>> = {}) => ({
  npcs: [],
  locations: [],
  quests: [],
  chapters: [],
  rumors: [],
  activities: [],
  loading: false,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DashboardLayout", () => {
  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<DashboardLayout {...makeProps()} />);
      expect(container).toBeInTheDocument();
    });

    it("renders the CampaignBanner section", () => {
      render(<DashboardLayout {...makeProps()} />);
      expect(screen.getByTestId("campaign-banner")).toBeInTheDocument();
    });

    it("renders the CampaignStats section", () => {
      render(<DashboardLayout {...makeProps()} />);
      expect(screen.getByTestId("campaign-stats")).toBeInTheDocument();
    });

    it("renders the ActivityFeed section", () => {
      render(<DashboardLayout {...makeProps()} />);
      expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
    });

    it("renders all three sections simultaneously", () => {
      render(<DashboardLayout {...makeProps()} />);
      expect(screen.getByTestId("campaign-banner")).toBeInTheDocument();
      expect(screen.getByTestId("campaign-stats")).toBeInTheDocument();
      expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Props forwarding — CampaignStats
  // -------------------------------------------------------------------------
  describe("props forwarding to CampaignStats", () => {
    it("forwards npcs array length to CampaignStats", () => {
      const npcs = [{ id: "1" }, { id: "2" }] as any[];
      render(<DashboardLayout {...makeProps({ npcs })} />);
      expect(screen.getByTestId("campaign-stats")).toHaveAttribute(
        "data-npcs",
        "2"
      );
    });

    it("forwards locations array length to CampaignStats", () => {
      const locations = [{ id: "l1" }] as any[];
      render(<DashboardLayout {...makeProps({ locations })} />);
      expect(screen.getByTestId("campaign-stats")).toHaveAttribute(
        "data-locations",
        "1"
      );
    });

    it("forwards quests array length to CampaignStats", () => {
      const quests = [{ id: "q1" }, { id: "q2" }, { id: "q3" }] as any[];
      render(<DashboardLayout {...makeProps({ quests })} />);
      expect(screen.getByTestId("campaign-stats")).toHaveAttribute(
        "data-quests",
        "3"
      );
    });

    it("forwards chapters array length to CampaignStats", () => {
      const chapters = [{ id: "c1" }] as any[];
      render(<DashboardLayout {...makeProps({ chapters })} />);
      expect(screen.getByTestId("campaign-stats")).toHaveAttribute(
        "data-chapters",
        "1"
      );
    });

    it("forwards rumors array length to CampaignStats", () => {
      const rumors = [{ id: "r1" }, { id: "r2" }] as any[];
      render(<DashboardLayout {...makeProps({ rumors })} />);
      expect(screen.getByTestId("campaign-stats")).toHaveAttribute(
        "data-rumors",
        "2"
      );
    });

    it("forwards loading=true to CampaignStats", () => {
      render(<DashboardLayout {...makeProps({ loading: true })} />);
      expect(screen.getByTestId("campaign-stats")).toHaveAttribute(
        "data-loading",
        "true"
      );
    });

    it("forwards loading=false to CampaignStats", () => {
      render(<DashboardLayout {...makeProps({ loading: false })} />);
      expect(screen.getByTestId("campaign-stats")).toHaveAttribute(
        "data-loading",
        "false"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Props forwarding — ActivityFeed
  // -------------------------------------------------------------------------
  describe("props forwarding to ActivityFeed", () => {
    it("forwards activities array length to ActivityFeed", () => {
      const activities = [
        { id: "a1", type: "npc", title: "Act", actor: "", timestamp: new Date(), link: "/" },
        { id: "a2", type: "quest", title: "Q", actor: "", timestamp: new Date(), link: "/" },
      ] as any[];
      render(<DashboardLayout {...makeProps({ activities })} />);
      expect(screen.getByTestId("activity-feed")).toHaveAttribute(
        "data-activities",
        "2"
      );
    });

    it("forwards loading=true to ActivityFeed", () => {
      render(<DashboardLayout {...makeProps({ loading: true })} />);
      expect(screen.getByTestId("activity-feed")).toHaveAttribute(
        "data-loading",
        "true"
      );
    });

    it("forwards loading=false to ActivityFeed", () => {
      render(<DashboardLayout {...makeProps({ loading: false })} />);
      expect(screen.getByTestId("activity-feed")).toHaveAttribute(
        "data-loading",
        "false"
      );
    });

    it("forwards empty activities array to ActivityFeed", () => {
      render(<DashboardLayout {...makeProps({ activities: [] })} />);
      expect(screen.getByTestId("activity-feed")).toHaveAttribute(
        "data-activities",
        "0"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Layout structure
  // -------------------------------------------------------------------------
  describe("layout structure", () => {
    it("CampaignBanner appears before the grid container", () => {
      const { container } = render(<DashboardLayout {...makeProps()} />);
      const banner = screen.getByTestId("campaign-banner");
      const grid = container.querySelector(".lg\\:grid");
      // banner should be in the DOM before the grid wrapper
      expect(banner).toBeInTheDocument();
      expect(grid).toBeInTheDocument();
      // banner should NOT be inside the grid
      expect(grid?.contains(banner)).toBe(false);
    });

    it("CampaignStats spans the full width, outside the grid", () => {
      const { container } = render(<DashboardLayout {...makeProps()} />);
      const grid = container.querySelector(".lg\\:grid");
      const stats = screen.getByTestId("campaign-stats");
      // The counts are one strip across the top rather than a column of cards
      // occupying two thirds of the content grid.
      expect(stats).toBeInTheDocument();
      expect(grid?.contains(stats)).toBe(false);
    });

    it("ActivityFeed and the aside sections are inside the grid wrapper", () => {
      const { container } = render(<DashboardLayout {...makeProps()} />);
      const grid = container.querySelector(".lg\\:grid");
      expect(grid?.contains(screen.getByTestId("activity-feed"))).toBe(true);
      expect(grid?.contains(screen.getByTestId("open-quests"))).toBe(true);
    });

    it("gives ActivityFeed the wide column", () => {
      const { container } = render(<DashboardLayout {...makeProps()} />);
      // Activity answers "what happened since we last played", so it gets the
      // larger track; it previously sat in the narrow third.
      const grid = container.querySelector(".lg\\:grid");
      expect(grid?.className).toContain("lg:grid-cols-[1.6fr_1fr]");

      const feed = screen.getByTestId("activity-feed");
      const quests = screen.getByTestId("open-quests");
      const children = Array.from(grid?.children ?? []);
      expect(children.findIndex(c => c.contains(feed))).toBe(0);
      expect(children.findIndex(c => c.contains(quests))).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Aside sections
  // -------------------------------------------------------------------------
  describe("aside sections", () => {
    it("forwards quests to OpenQuests", () => {
      render(
        <DashboardLayout {...makeProps({ quests: [{ id: "q1" }, { id: "q2" }] })} />
      );
      expect(screen.getByTestId("open-quests")).toHaveAttribute("data-quests", "2");
    });

    it("forwards the rumor count to RumorPrompt", () => {
      render(<DashboardLayout {...makeProps({ rumors: [{ id: "r1" }] })} />);
      expect(screen.getByTestId("rumor-prompt")).toHaveAttribute(
        "data-rumor-count",
        "1"
      );
    });

    it("does not render RumorPrompt while loading", () => {
      render(<DashboardLayout {...makeProps({ loading: true })} />);
      // A prompt to add the first rumor is misleading before the data arrives.
      expect(screen.queryByTestId("rumor-prompt")).not.toBeInTheDocument();
    });

    it("passes the chapter count to the banner meta line", () => {
      render(
        <DashboardLayout {...makeProps({ chapters: [{ id: "c1" }, { id: "c2" }] })} />
      );
      expect(screen.getByTestId("campaign-banner")).toHaveAttribute(
        "data-chapter-count",
        "2"
      );
    });

    it("renders the view toggle inside the banner", () => {
      render(
        <DashboardLayout
          {...makeProps({ viewToggle: <button type="button">Journal</button> })}
        />
      );
      const banner = screen.getByTestId("campaign-banner");
      expect(banner).toContainElement(screen.getByRole("button", { name: "Journal" }));
    });
  });
});
