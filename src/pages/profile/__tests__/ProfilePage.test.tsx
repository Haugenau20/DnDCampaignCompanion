// src/pages/profile/__tests__/ProfilePage.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfilePage from "../ProfilePage";
import { GATED_COPY } from "shared/components/gated/gated-page-copy";

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

// ---------------------------------------------------------------------------
// Page-suite gate mock, matching the shape the other gated page suites use.
//
// It is deliberately the *full* surface `GatedContent` touches -- `groups`,
// `setActiveGroup`, `setActiveCampaign`, `JoinGroupDialog` -- and not the
// subset this page happens to reach. A stub laxer than the thing it stands in
// for is D75, R28 and R33 three times over; here the page's gate is
// `requires: "none"`, so a missing `setActiveCampaign` would go unnoticed
// until some later change made the pick-campaign panel reachable.
// ---------------------------------------------------------------------------
let mockUser: { uid: string } | null = { uid: "user-1" };
let mockIsResolving = false;
let mockActiveGroup: { id: string; name: string } | null = {
  id: "group-1",
  name: "The Fellowship",
};
let mockActiveCampaignId: string | null = "campaign-1";
let mockGroups: Array<{ id: string; name: string }> = [
  { id: "group-1", name: "The Fellowship" },
];

const mockSetActiveGroup = jest.fn().mockResolvedValue(undefined);
const mockSetActiveCampaign = jest.fn().mockResolvedValue(undefined);

jest.mock("features/user-management", () => ({
  useAuth: () => ({ user: mockUser, loading: mockIsResolving }),
  useGroups: () => ({
    activeGroup: mockActiveGroup,
    activeGroupId: mockActiveGroup?.id ?? null,
    groups: mockGroups,
    setActiveGroup: mockSetActiveGroup,
  }),
  useCampaigns: () => ({
    activeCampaignId: mockActiveCampaignId,
    activeCampaign: mockActiveCampaignId
      ? { id: mockActiveCampaignId, name: "Phandelver" }
      : null,
    setActiveCampaign: mockSetActiveCampaign,
  }),
  AccountCard: () => <div data-testid="account-card" />,
  GroupMembershipCard: () => <div data-testid="group-membership-card" />,
  CharactersCard: () => <div data-testid="characters-card" />,
  AppearanceCard: () => <div data-testid="appearance-card" />,
  DangerZoneCard: () => <div data-testid="danger-zone-card" />,
  SignInForm: () => <div data-testid="sign-in-form" />,
  JoinGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

// useSelectableCampaigns fetches through this in the pick-campaign state.
jest.mock("core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: { getCampaigns: jest.fn().mockResolvedValue([]) },
  },
}));

/**
 * The signed-out panel links to Home with a react-router `<Link>`, so the
 * page needs a router even though it does not route anything itself.
 */
function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroup = { id: "group-1", name: "The Fellowship" };
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
  });

  it("renders the heading", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Your profile" })
    ).toBeInTheDocument();
  });

  // The page used to explain its own save behaviour to the reader. That is
  // developer rationale, not product copy, and it does not belong on screen.
  it("does not narrate how the page saves", () => {
    renderPage();

    expect(screen.queryByText(/save button/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/changes save as you make them/i)).not.toBeInTheDocument();
  });

  it("the back link names the active campaign", () => {
    renderPage();

    expect(
      screen.getByRole("button", { name: "Back to Phandelver" })
    ).toBeInTheDocument();
  });

  it("the back link falls back to 'Back to the campaign' with no active campaign", () => {
    mockActiveCampaignId = null;

    renderPage();

    expect(
      screen.getByRole("button", { name: "Back to the campaign" })
    ).toBeInTheDocument();
  });

  // Five short cards do not need an index alongside them; the rail cost more
  // width than it saved scrolling, so the page is a single column.
  it("renders no section rail", () => {
    renderPage();

    expect(screen.queryByRole("navigation", { name: /profile sections/i })).not.toBeInTheDocument();
  });

  it("tells a signed-out visitor to sign in, and does not redirect", () => {
    mockUser = null;

    renderPage();

    // The words are the gate's now, not this page's. The page used to say
    // "You need to be signed in to see your profile" in its own hand-rolled
    // card; the same sentence is written once, for every gated route, in
    // gated-page-copy.ts -- so the assertion reads it from there rather than
    // restating it and drifting.
    expect(screen.getByText(GATED_COPY.profile.heading)).toBeInTheDocument();
    expect(screen.getByText(GATED_COPY.profile.blurb)).toBeInTheDocument();
    expect(screen.queryByTestId("account-card")).not.toBeInTheDocument();
    expect(mockNavigateToPage).not.toHaveBeenCalled();
  });

  it("keeps the page's title visible while signed out, so the URL still says where it went", () => {
    mockUser = null;

    renderPage();

    // The behaviour the old file's header comment defended in a paragraph:
    // /profile stays linkable when signed out. PageShell is what guarantees
    // it now -- the title renders in every state, not only in `ready`.
    expect(
      screen.getByRole("heading", { level: 1, name: "Your profile" })
    ).toBeInTheDocument();
  });

  it("shows the account cards to a member with no campaign chosen", () => {
    // The reason this page's gate is `requires: "none"`. An email address, a
    // username and a delete-account button are not campaign-scoped, so a
    // member between campaigns must reach them rather than meeting a campaign
    // picker.
    mockActiveCampaignId = null;

    renderPage();

    expect(screen.getByTestId("account-card")).toBeInTheDocument();
    expect(screen.getByTestId("danger-zone-card")).toBeInTheDocument();
    expect(screen.queryByTestId("gated-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByText(GATED_COPY.profile.heading)).not.toBeInTheDocument();
  });

  it("renders the account cards but no group cards when there is no active group", () => {
    mockActiveGroup = null;

    renderPage();

    expect(screen.getByTestId("account-card")).toBeInTheDocument();
    expect(screen.queryByTestId("group-membership-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("characters-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("appearance-card")).toBeInTheDocument();
    expect(screen.getByTestId("danger-zone-card")).toBeInTheDocument();
  });

  // The ids outlived the rail: they are what makes /profile#characters
  // linkable, which the dialog this page replaced could never be.
  it("renders every card in its own section, each with a linkable id", () => {
    renderPage();

    expect(
      document.getElementById("account")?.contains(screen.getByTestId("account-card"))
    ).toBe(true);
    expect(
      document.getElementById("group")?.contains(screen.getByTestId("group-membership-card"))
    ).toBe(true);
    expect(
      document.getElementById("characters")?.contains(screen.getByTestId("characters-card"))
    ).toBe(true);
    expect(
      document.getElementById("appearance")?.contains(screen.getByTestId("appearance-card"))
    ).toBe(true);
    expect(
      document.getElementById("danger")?.contains(screen.getByTestId("danger-zone-card"))
    ).toBe(true);
  });

  it("renders the gate's skeleton while the session is still resolving", () => {
    // Was `useGroups().loading`. The gate waits on `useAuth().loading`, which
    // is the flag that stays true for the whole restore chain -- `useGroups`'
    // own flag flips false the moment `groups` is an array, well before the
    // group or campaign has been fetched (bug #701).
    mockIsResolving = true;

    renderPage();

    expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("account-card")).not.toBeInTheDocument();
    // Not the signed-out panel: nothing is claimed while the answer is unknown.
    expect(screen.queryByText(GATED_COPY.profile.heading)).not.toBeInTheDocument();
  });

  // Guards the SHELL only. Every card is stubbed above, so this cannot see
  // inside the danger zone -- the real guard for that Definition-of-Done line
  // lives in DangerZoneCard's own suite. Kept because the shell is where a
  // stray page-level "Close" would most plausibly be added later.
  it("adds no Close button of its own to the page shell", () => {
    renderPage();

    expect(
      screen.queryByRole("button", { name: /^close$/i })
    ).not.toBeInTheDocument();
  });
});
