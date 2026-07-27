// src/components/features/layouts/dashboard/__tests__/DashboardLayout.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import DashboardLayout from "../DashboardLayout";

// ---------------------------------------------------------------------------
// Mocks — child sections are mocked so this test focuses on layout/routing only
// ---------------------------------------------------------------------------

jest.mock("../sections/CampaignBanner", () => ({
  __esModule: true,
  default: () => <div data-testid="campaign-banner">CampaignBanner</div>,
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

    it("CampaignStats and ActivityFeed are inside the grid wrapper", () => {
      const { container } = render(<DashboardLayout {...makeProps()} />);
      const grid = container.querySelector(".lg\\:grid");
      const stats = screen.getByTestId("campaign-stats");
      const feed = screen.getByTestId("activity-feed");
      expect(grid?.contains(stats)).toBe(true);
      expect(grid?.contains(feed)).toBe(true);
    });
  });
});
