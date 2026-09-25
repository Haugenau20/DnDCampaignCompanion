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

const mockUpdateCampaign = jest.fn();
jest.mock("features/user-management", () => ({
  useCampaigns: () => ({ updateCampaign: mockUpdateCampaign }),
}));

let mockImageOptions: any = null;
jest.mock("shared/hooks/useImageAttachment", () => ({
  useImageAttachment: (options: any) => {
    mockImageOptions = options;
    return { upload: jest.fn(), remove: jest.fn() };
  },
}));

// Mock core Typography
jest.mock("core/components/Typography", () => ({
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

const { firebaseConfig } = jest.requireActual("core/services/firebase/config/firebaseConfig");
const banner = {
  path: "groups/g1/campaigns/c1/banner/a.webp",
  url: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/a.webp?alt=media&token=t`,
  width: 1600,
  height: 900,
  uploadedBy: "u1",
  uploadedAt: "2026-09-25T12:00:00.000Z",
};

describe("CampaignBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImageOptions = null;
    mockUpdateCampaign.mockResolvedValue(undefined);
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

    it("shows the campaign name as the page title", () => {
      render(<CampaignBanner />);
      // The title is the campaign, not a greeting — "Welcome to" spent the largest
      // type on the page saying nothing about the campaign.
      expect(screen.getByText("Curse of Strahd")).toBeInTheDocument();
      expect(
        screen.queryByText("Welcome to Curse of Strahd")
      ).not.toBeInTheDocument();
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

    it("states the group without a 'Group:' label", () => {
      render(<CampaignBanner />);
      // One quiet meta line of facts; the label was longer than the value.
      expect(screen.queryByText("Group:")).not.toBeInTheDocument();
    });

    it("shows the chapter count in the meta line when given one", () => {
      render(<CampaignBanner chapterCount={39} />);
      expect(screen.getByText("Chapter 39")).toBeInTheDocument();
    });

    it("omits the chapter count when there are no chapters", () => {
      render(<CampaignBanner chapterCount={0} />);
      expect(screen.queryByText(/^Chapter /)).not.toBeInTheDocument();
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
      // "Started <date>" reads as a sentence, so it needs no separate label.
      expect(screen.getByText("Started January 1, 2024")).toBeInTheDocument();
    });

    it("does not use a separate 'Created:' label", () => {
      setupHook({
        activeGroup: makeGroup(),
        activeCampaign: makeCampaign("Campaign"),
        formattedCreationDate: "March 5, 2023",
        hasGroup: true,
        hasCampaign: true,
      });
      render(<CampaignBanner />);
      expect(screen.queryByText("Created:")).not.toBeInTheDocument();
      expect(screen.getByText("Started March 5, 2023")).toBeInTheDocument();
    });

    it("omits the start date entirely when it is null", () => {
      setupHook({
        activeGroup: makeGroup(),
        activeCampaign: makeCampaign("Campaign"),
        formattedCreationDate: null,
        hasGroup: true,
        hasCampaign: true,
      });
      render(<CampaignBanner />);
      expect(screen.queryByText(/^Started /)).not.toBeInTheDocument();
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
  // -------------------------------------------------------------------------
  // The banner picture
  // -------------------------------------------------------------------------
  describe("banner picture", () => {
    const withCampaign = (campaign: any) =>
      setupHook({
        activeGroup: makeGroup(),
        activeCampaign: campaign,
        hasGroup: true,
        hasCampaign: true,
      });

    it("draws the band as before, with no empty slot, when there is no banner", () => {
      withCampaign(makeCampaign("Curse of Strahd"));
      render(<CampaignBanner />);

      expect(screen.queryByTestId("campaign-banner-image")).toBeNull();
      expect(screen.queryByRole("img")).toBeNull();
      expect(screen.getByTestId("campaign-banner")).not.toHaveClass("hero-band-pictured");
    });

    it("draws the banner behind the band's text", () => {
      withCampaign({ ...makeCampaign("Curse of Strahd"), banner });
      render(<CampaignBanner />);

      const band = screen.getByTestId("campaign-banner");
      const picture = screen.getByRole("img", { name: "Curse of Strahd" });
      expect(picture).toHaveAttribute("src", banner.url);
      // Inside the band, not above it, and under the band's own scrim.
      expect(band).toContainElement(picture);
      expect(band).toHaveClass("hero-band", "hero-band-pictured");
      expect(band.querySelector(".hero-picture-scrim")).not.toBeNull();
      // The title still renders over it.
      expect(screen.getByText("Curse of Strahd")).toBeInTheDocument();
    });

    it("refuses a URL outside the app's bucket", () => {
      withCampaign({
        ...makeCampaign("Curse of Strahd"),
        banner: { ...banner, url: "https://tracker.example/pixel.webp" },
      });
      render(<CampaignBanner />);

      expect(screen.queryByRole("img")).toBeNull();
      expect(screen.getByTestId("campaign-banner")).not.toHaveClass("hero-band-pictured");
    });

    it("offers a member Add, then Replace and Remove", () => {
      withCampaign(makeCampaign("Curse of Strahd"));
      const { rerender } = render(<CampaignBanner />);
      expect(screen.getByRole("button", { name: "Add banner" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Remove banner" })).toBeNull();

      withCampaign({ ...makeCampaign("Curse of Strahd"), banner });
      rerender(<CampaignBanner />);
      expect(screen.getByRole("button", { name: "Replace banner" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove banner" })).toBeInTheDocument();
    });

    it("lays the controls over the band itself", () => {
      withCampaign(makeCampaign("Curse of Strahd"));
      render(<CampaignBanner />);

      const control = screen.getByTestId("campaign-banner").parentElement!;
      expect(control).toContainElement(screen.getByRole("button", { name: "Add banner" }));
      expect(control).toHaveClass("relative");
    });

    it("offers no controls before there is a campaign", () => {
      setupHook({ activeGroup: makeGroup(), hasGroup: true, hasCampaign: false });
      render(<CampaignBanner />);

      expect(screen.queryByRole("button", { name: /banner/ })).toBeNull();
    });

    it("stores the file in the campaign's own folder", () => {
      withCampaign({ ...makeCampaign("Curse of Strahd"), banner });
      render(<CampaignBanner />);

      expect(mockImageOptions.prefix).toBe("groups/g1/campaigns/c1/banner");
      expect(mockImageOptions.current).toBe(banner);
    });

    it("saves the banner, or its removal, on the campaign document", async () => {
      withCampaign(makeCampaign("Curse of Strahd"));
      render(<CampaignBanner />);

      await mockImageOptions.save(banner);
      expect(mockUpdateCampaign).toHaveBeenCalledWith("c1", { banner });

      await mockImageOptions.save(null);
      expect(mockUpdateCampaign).toHaveBeenLastCalledWith("c1", { banner: null });
    });
  });
});
