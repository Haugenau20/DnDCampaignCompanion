// src/pages/profile/__tests__/ProfilePage.test.tsx
import React from "react";
import { render, screen, within } from "@testing-library/react";
import ProfilePage from "../ProfilePage";

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

// ---------------------------------------------------------------------------
// features/user-management mock
// ---------------------------------------------------------------------------
let mockUser: any = { uid: "user-1" };
let mockCampaigns: any = { activeCampaign: { name: "Phandelver" } };
let mockGroups: any = {
  activeGroup: { id: "group-1", name: "The Fellowship" },
  loading: false,
};

jest.mock("features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
  useCampaigns: () => mockCampaigns,
  useGroups: () => mockGroups,
  AccountCard: () => <div data-testid="account-card" />,
  GroupMembershipCard: () => <div data-testid="group-membership-card" />,
  CharactersCard: () => <div data-testid="characters-card" />,
  AppearanceCard: () => <div data-testid="appearance-card" />,
  DangerZoneCard: () => <div data-testid="danger-zone-card" />,
  SignInForm: ({ onSuccess }: any) => (
    <div data-testid="sign-in-form">
      <button type="button" onClick={onSuccess}>
        Complete sign in
      </button>
    </div>
  ),
}));

function renderPage() {
  return render(<ProfilePage />);
}

describe("ProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockCampaigns = { activeCampaign: { name: "Phandelver" } };
    mockGroups = {
      activeGroup: { id: "group-1", name: "The Fellowship" },
      loading: false,
    };
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
    mockCampaigns = { activeCampaign: null };

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

    expect(
      screen.getByText(/you need to be signed in to see your profile/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("account-card")).not.toBeInTheDocument();
    expect(mockNavigateToPage).not.toHaveBeenCalled();
  });

  it("renders the account cards but no group cards when there is no active group", () => {
    mockGroups = { activeGroup: null, loading: false };

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

  it("renders a loading state while groups are still loading", () => {
    mockGroups = { activeGroup: null, loading: true };

    renderPage();

    expect(screen.getByTestId("profile-loading-state")).toBeInTheDocument();
    expect(screen.queryByTestId("account-card")).not.toBeInTheDocument();
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
