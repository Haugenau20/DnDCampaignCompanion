// src/components/features/layouts/dashboard/sections/__tests__/CampaignBanner.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import CampaignBanner from "../CampaignBanner";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the useCampaignInfo hook — the sole external dependency
const mockUseCampaignInfo = jest.fn();

jest.mock(
  "../../../../layouts/common/hooks/useCampaignInfo",
  () => ({
    useCampaignInfo: () => mockUseCampaignInfo(),
  })
);

// Mock core Typography
jest.mock("../../../../../core/Typography", () => ({
  __esModule: true,
  default: ({ children, variant, color, className }: any) => {
    const Tag = variant === "h2" ? "h2" : "p";
    return (
      <Tag data-testid={`typography-${variant || "body"}`} data-color={color} className={className}>
        {children}
      </Tag>
    );
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const setupHook = (overrides: {
  activeGroup?: any;
  activeCampaign?: any;
  formattedCreationDate?: string | null;
  hasCampaign?: boolean;
  hasGroup?: boolean;
} = {}) => {
  mockUseCampaignInfo.mockReturnValue({
    activeGroup: null,
    activeCampaign: undefined,
    formattedCreationDate: null,
    hasCampaign: false,
    hasGroup: false,
    ...overrides,
  });
};

const makeGroup = (name = "Dragon's Lair") => ({ id: "g1", name });
const makeCampaign = (
  name = "The Lost Mines",
  description?: string,
  createdAt?: any
) => ({
  id: "c1",
  name,
  ...(description !== undefined ? { description } : {}),
  ...(createdAt !== undefined ? { createdAt } : {}),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CampaignBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // No group, no campaign — welcome / default state
  // -------------------------------------------------------------------------
  describe("when there is no group and no campaign", () => {
    beforeEach(() => {
      setupHook({ hasGroup: false, hasCampaign: false });
    });

    it("renders without crashing", () => {
      const { container } = render(<CampaignBanner />);
      expect(container).toBeInTheDocument();
    });

    it("shows the generic welcome heading", () => {
      render(<CampaignBanner />);
      expect(
        screen.getByText("Welcome to D&D Campaign Companion")
      ).toBeInTheDocument();
    });

    it("shows the 'select or create a group' message", () => {
      render(<CampaignBanner />);
      expect(
        screen.getByText("Select or create a group to get started")
      ).toBeInTheDocument();
    });

    it("does not show any campaign name", () => {
      render(<CampaignBanner />);
      expect(screen.queryByText(/Welcome to The/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Group exists, no campaign
  // -------------------------------------------------------------------------
  describe("when there is a group but no campaign", () => {
    beforeEach(() => {
      setupHook({
        activeGroup: makeGroup(),
        hasGroup: true,
        hasCampaign: false,
      });
    });

    it("shows the generic welcome heading", () => {
      render(<CampaignBanner />);
      expect(
        screen.getByText("Welcome to D&D Campaign Companion")
      ).toBeInTheDocument();
    });

    it("shows the 'select or create a campaign' message", () => {
      render(<CampaignBanner />);
      expect(
        screen.getByText(
          "Select or create a campaign to begin your adventure"
        )
      ).toBeInTheDocument();
    });

    it("does not show campaign-specific content", () => {
      render(<CampaignBanner />);
      expect(screen.queryByText(/Group:/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Full state — group + campaign (no description, no creation date)
  // -------------------------------------------------------------------------
  describe("when group and campaign are both active", () => {
    const campaign = makeCampaign("Curse of Strahd");
    const group = makeGroup("Brave Adventurers");

    beforeEach(() => {
      setupHook({
        activeGroup: group,
        activeCampaign: campaign,
        formattedCreationDate: null,
        hasGroup: true,
        hasCampaign: true,
      });
    });

    it("shows the campaign-specific welcome heading", () => {
      render(<CampaignBanner />);
      expect(
        screen.getByText("Welcome to Curse of Strahd")
      ).toBeInTheDocument();
    });

    it("does not show the generic welcome heading", () => {
      render(<CampaignBanner />);
      expect(
        screen.queryByText("Welcome to D&D Campaign Companion")
      ).not.toBeInTheDocument();
    });

    it("shows the group name", () => {
      render(<CampaignBanner />);
      expect(screen.getByText("Brave Adventurers")).toBeInTheDocument();
    });

    it("shows the 'Group:' label", () => {
      render(<CampaignBanner />);
      expect(screen.getByText("Group:")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Campaign description
  // -------------------------------------------------------------------------
  describe("campaign description", () => {
    it("renders the description when the campaign has one", () => {
      setupHook({
        activeGroup: makeGroup(),
        activeCampaign: makeCampaign("Mines of Phandelver", "A tale of miners"),
        hasGroup: true,
        hasCampaign: true,
      });
      render(<CampaignBanner />);
      expect(screen.getByText("A tale of miners")).toBeInTheDocument();
    });

    it("does not render a description element when campaign has none", () => {
      setupHook({
        activeGroup: makeGroup(),
        activeCampaign: makeCampaign("Mines of Phandelver", undefined),
        hasGroup: true,
        hasCampaign: true,
      });
      render(<CampaignBanner />);
      // There should be no Typography element for the description
      expect(screen.queryByText(/A tale of miners/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Creation date
  // -------------------------------------------------------------------------
  describe("creation date", () => {
    it("renders the formatted creation date when provided", () => {
      setupHook({
        activeGroup: makeGroup(),
        activeCampaign: makeCampaign("Campaign"),
        formattedCreationDate: "January 1, 2024",
        hasGroup: true,
        hasCampaign: true,
      });
      render(<CampaignBanner />);
      expect(screen.getByText("January 1, 2024")).toBeInTheDocument();
    });

    it("shows the 'Created:' label when date is available", () => {
      setupHook({
        activeGroup: makeGroup(),
        activeCampaign: makeCampaign("Campaign"),
        formattedCreationDate: "March 5, 2023",
        hasGroup: true,
        hasCampaign: true,
      });
      render(<CampaignBanner />);
      expect(screen.getByText("Created:")).toBeInTheDocument();
    });

    it("does not render the 'Created:' label when date is null", () => {
      setupHook({
        activeGroup: makeGroup(),
        activeCampaign: makeCampaign("Campaign"),
        formattedCreationDate: null,
        hasGroup: true,
        hasCampaign: true,
      });
      render(<CampaignBanner />);
      expect(screen.queryByText("Created:")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // hasCampaign=false overrides — even if activeCampaign is somehow set
  // -------------------------------------------------------------------------
  describe("conditional rendering respects hasGroup/hasCampaign flags", () => {
    it("shows default state when hasGroup=false even if activeGroup is defined", () => {
      // Edge-case guard: hasCampaign/hasGroup flags drive the conditional, not objects
      setupHook({
        activeGroup: makeGroup(),
        activeCampaign: makeCampaign(),
        hasGroup: false,
        hasCampaign: false,
      });
      render(<CampaignBanner />);
      expect(
        screen.getByText("Welcome to D&D Campaign Companion")
      ).toBeInTheDocument();
    });

    it("shows default state when hasCampaign=false even if activeCampaign is defined", () => {
      setupHook({
        activeGroup: makeGroup(),
        activeCampaign: makeCampaign(),
        hasGroup: true,
        hasCampaign: false,
      });
      render(<CampaignBanner />);
      expect(
        screen.getByText("Welcome to D&D Campaign Companion")
      ).toBeInTheDocument();
    });
  });
});
