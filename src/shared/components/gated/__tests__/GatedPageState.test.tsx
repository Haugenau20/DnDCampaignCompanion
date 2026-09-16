import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GatedPageState, { CampaignOption } from "../GatedPageState";

const OPTIONS: CampaignOption[] = [
  {
    campaignId: "c-1",
    campaignName: "Phandelver",
    groupId: "g-1",
    groupName: "The Fellowship",
  },
  {
    campaignId: "c-2",
    campaignName: "Curse of Strahd",
    groupId: "g-2",
    groupName: "The Council",
  },
];

const renderPanel = (props: Partial<React.ComponentProps<typeof GatedPageState>> = {}) =>
  render(
    <MemoryRouter>
      <GatedPageState
        variant="signed-out"
        heading="Sign in to see your party's quests"
        blurb="Quests are the open threads of a campaign."
        onSignIn={jest.fn()}
        onJoinGroup={jest.fn()}
        {...props}
      />
    </MemoryRouter>
  );

describe("GatedPageState, signed out", () => {
  it("labels the page as a private campaign", () => {
    renderPanel();
    expect(screen.getByTestId("gated-eyebrow")).toHaveTextContent(/private campaign/i);
  });

  it("renders the page's heading and blurb", () => {
    renderPanel();
    expect(
      screen.getByRole("heading", { name: "Sign in to see your party's quests" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Quests are the open threads of a campaign.")
    ).toBeInTheDocument();
  });

  it("offers signing in and an invite link, and nothing else", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /invite link/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("calls onSignIn when the primary action is used", () => {
    const onSignIn = jest.fn();
    renderPanel({ onSignIn });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it("calls onJoinGroup when the invite action is used", () => {
    const onJoinGroup = jest.fn();
    renderPanel({ onJoinGroup });
    fireEvent.click(screen.getByRole("button", { name: /invite link/i }));
    expect(onJoinGroup).toHaveBeenCalledTimes(1);
  });

  // The footnote used to explain the invite model itself ("a DM invites you
  // with a join link") on every one of the twenty gated routes. It now only
  // opens the question, and the link carries the reader to Home, which is the
  // single place that answers it -- so what this test must protect is the
  // route out, not a sentence. Without the link working, the newcomer the
  // footnote addresses has nowhere to go.
  it("asks the newcomer's question and links to Home for the answer", () => {
    renderPanel();
    expect(screen.getByText(/new here/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /what the companion does/i })
    ).toHaveAttribute("href", "/");
  });

  it("never lists campaigns", () => {
    renderPanel({ campaigns: OPTIONS });
    expect(screen.queryByText("Phandelver")).not.toBeInTheDocument();
  });
});

describe("GatedPageState, pick campaign", () => {
  const pickProps = {
    variant: "pick-campaign" as const,
    heading: "unused",
    blurb: "unused",
    hasGroups: true,
    campaigns: OPTIONS,
    onSelectCampaign: jest.fn(),
  };

  it("asks which campaign, not to go and select one elsewhere", () => {
    renderPanel(pickProps);
    expect(
      screen.getByRole("heading", { name: /which campaign/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/please select/i)).not.toBeInTheDocument();
  });

  it("lists every campaign with the group it belongs to", () => {
    renderPanel(pickProps);
    const phandelver = screen.getByRole("button", { name: /Phandelver/ });
    expect(within(phandelver).getByText(/The Fellowship/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Curse of Strahd/ })
    ).toBeInTheDocument();
  });

  it("makes the selection here, as buttons", () => {
    const onSelectCampaign = jest.fn();
    renderPanel({ ...pickProps, onSelectCampaign });
    fireEvent.click(screen.getByRole("button", { name: /Phandelver/ }));
    expect(onSelectCampaign).toHaveBeenCalledWith(OPTIONS[0]);
  });

  it("counts the campaigns in the singular when there is one", () => {
    renderPanel({ ...pickProps, campaigns: [OPTIONS[0]] });
    expect(screen.getByText(/you're in one campaign\b/i)).toBeInTheDocument();
  });

  it("says there are no campaigns yet rather than showing an empty list", () => {
    renderPanel({ ...pickProps, campaigns: [], campaignsLoading: false });
    expect(
      screen.getByRole("heading", { name: /no campaigns yet/i })
    ).toBeInTheDocument();
  });

  it("offers joining a group when the user belongs to none", () => {
    renderPanel({ ...pickProps, hasGroups: false, campaigns: [] });
    expect(
      screen.getByRole("heading", { name: /join a group/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /invite link/i })
    ).toBeInTheDocument();
  });

  // FIX 1 -- the cross-group campaign fetch is still in flight, and
  // `campaigns` is empty only because nothing has arrived yet, not because
  // there is nothing to arrive. The panel must not claim "No campaigns yet"
  // here: that is exactly the "claim something while the answer is unknown"
  // defect the gated-states redesign exists to remove, reproduced inside its
  // own panel. Verified to fail against the pre-fix code, which computed
  // `pickSituation` from `campaigns.length` alone and rendered "No campaigns
  // yet" here.
  it("does not claim there are no campaigns while the campaign fetch is still in flight", () => {
    renderPanel({ ...pickProps, campaigns: [], campaignsLoading: true });
    expect(
      screen.queryByRole("heading", { name: /no campaigns yet/i })
    ).not.toBeInTheDocument();
    expect(
      // Was /a group admin creates the first campaign/, reworded away from
      // naming a role the reader may not have; this still targets the
      // "no-campaigns" line specifically, which is what the guard needs.
      screen.queryByText(/your first campaign will appear here/i)
    ).not.toBeInTheDocument();
  });

  // A member with no group at all needs no fetch to know that -- `hasGroups`
  // is already known synchronously, so this case must not wait on
  // `campaignsLoading` before offering the invite-link action.
  it("still offers joining a group while campaigns are loading, when there are no groups", () => {
    renderPanel({
      ...pickProps,
      hasGroups: false,
      campaigns: [],
      campaignsLoading: true,
    });
    expect(
      screen.getByRole("heading", { name: /join a group/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /invite link/i })
    ).toBeInTheDocument();
  });

  it("shows a switch failure without dropping the list", () => {
    renderPanel({ ...pickProps, selectError: "Could not open that campaign." });
    expect(
      screen.getByText("Could not open that campaign.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Phandelver/ })
    ).toBeInTheDocument();
  });
});
