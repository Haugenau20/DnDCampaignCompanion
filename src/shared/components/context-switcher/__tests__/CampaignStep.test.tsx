// src/shared/components/context-switcher/__tests__/CampaignStep.test.tsx

import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import CampaignStep from "../CampaignStep";

const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseStory = jest.fn();
const mockUseNPCs = jest.fn();
const mockUseCampaignCounts = jest.fn();

jest.mock("@/features/user-management", () => ({
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

jest.mock("@/features/storytelling", () => ({
  useStory: () => mockUseStory(),
}));

jest.mock("@/features/campaign-entities", () => ({
  useNPCs: () => mockUseNPCs(),
}));

jest.mock("../useCampaignCounts", () => ({
  useCampaignCounts: (...args: any[]) => mockUseCampaignCounts(...args),
}));

const activeGroup = { id: "group-1", name: "Fellowship of the Ring" };
const campaigns = [
  { id: "campaign-1", name: "Middle Earth Adventures" },
  { id: "campaign-2", name: "Hogwarts Campaign" },
];

function setup(overrides: {
  campaigns?: any[];
  activeCampaignId?: string | null;
  counts?: Record<string, { chapters: number; npcs: number }>;
} = {}) {
  mockUseGroups.mockReturnValue({ activeGroup, activeGroupId: "group-1" });
  mockUseCampaigns.mockReturnValue({
    campaigns: overrides.campaigns ?? campaigns,
    activeCampaignId:
      overrides.activeCampaignId === undefined
        ? "campaign-1"
        : overrides.activeCampaignId,
  });
  mockUseStory.mockReturnValue({
    chapters: [
      { id: "ch-1", order: 1 },
      { id: "ch-2", order: 2 },
      { id: "ch-3", order: 3 },
    ],
    storyProgress: { currentChapter: "ch-2" },
  });
  mockUseNPCs.mockReturnValue({ npcs: [{ id: "n1" }, { id: "n2" }] });
  mockUseCampaignCounts.mockReturnValue(overrides.counts ?? {});
}

const onSelectCampaign = jest.fn();
const onChangeGroup = jest.fn();
const onJoinGroup = jest.fn();

function renderStep() {
  return render(
    <CampaignStep
      onSelectCampaign={onSelectCampaign}
      onChangeGroup={onChangeGroup}
      onJoinGroup={onJoinGroup}
    />
  );
}

describe("CampaignStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  test("shows the group name under a Group eyebrow, with a Change action", () => {
    renderStep();
    expect(screen.getByText("Group")).toBeInTheDocument();
    expect(screen.getByText("Fellowship of the Ring")).toBeInTheDocument();

    const changeButton = screen.getByRole("menuitem", { name: /change/i });
    fireEvent.click(changeButton);
    expect(onChangeGroup).toHaveBeenCalledTimes(1);
  });

  test("the active row shows chapters, NPCs and the current chapter from context", () => {
    renderStep();
    expect(
      screen.getByText("3 chapters · 2 NPCs · you're on chapter 2")
    ).toBeInTheDocument();
  });

  test("a non-active row shows counts from the hook", () => {
    setup({ counts: { "campaign-2": { chapters: 12, npcs: 8 } } });
    renderStep();
    expect(screen.getByText("12 chapters · 8 NPCs")).toBeInTheDocument();
  });

  test("a non-active row with no resolved counts shows its name and no second line", () => {
    setup({ counts: {} });
    renderStep();

    const row = screen.getByRole("menuitem", { name: /hogwarts campaign/i });
    expect(within(row).getByText("Hogwarts Campaign")).toBeInTheDocument();
    // The non-active row has no second line at all -- not even a truncated one.
    expect(within(row).queryByText(/chapters/)).not.toBeInTheDocument();
    expect(within(row).queryByText(/NPCs/)).not.toBeInTheDocument();
  });

  test("exactly one check mark appears, on the active row", () => {
    const { container } = renderStep();
    const checkIcons = container.querySelectorAll("svg.lucide-check");
    expect(checkIcons).toHaveLength(1);

    const activeRow = screen.getByRole("menuitem", {
      name: /middle earth adventures/i,
    });
    expect(within(activeRow).getByText("Middle Earth Adventures")).toBeInTheDocument();
    expect(activeRow.querySelector("svg.lucide-check")).not.toBeNull();
  });

  test("the join row is present and calls onJoinGroup", () => {
    renderStep();
    const joinRow = screen.getByRole("menuitem", {
      name: /join a group with an invite code/i,
    });
    fireEvent.click(joinRow);
    expect(onJoinGroup).toHaveBeenCalledTimes(1);
  });

  test("clicking a campaign row calls onSelectCampaign with its id", () => {
    renderStep();
    fireEvent.click(screen.getByText("Hogwarts Campaign"));
    expect(onSelectCampaign).toHaveBeenCalledWith("campaign-2");
  });

  test("no row anywhere says last opened", () => {
    renderStep();
    expect(screen.queryByText(/last opened/i)).not.toBeInTheDocument();
  });
});
