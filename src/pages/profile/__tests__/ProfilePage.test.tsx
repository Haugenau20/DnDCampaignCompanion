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
  UserProfile: () => <div data-testid="user-profile" />,
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

  it("renders the heading and the save-as-you-go subtitle", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Your profile" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Changes save as you make them. Nothing here needs a save button."
      )
    ).toBeInTheDocument();
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

  it("renders the section rail with all six entries", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: /profile sections/i });
    const links = within(nav).getAllByRole("link");

    // Five linkable sections (Account, the group's own name, Characters,
    // Appearance, Leaving and deleting) plus the rule drawn before the
    // error-toned entry make up the six rendered nodes.
    expect(links.map((link) => link.textContent)).toEqual([
      "Account",
      "The Fellowship",
      "Characters",
      "Appearance",
      "Leaving and deleting",
    ]);
    expect(nav.querySelector("hr")).toBeInTheDocument();
  });

  it("tells a signed-out visitor to sign in, and does not redirect", () => {
    mockUser = null;

    renderPage();

    expect(
      screen.getByText(/you need to be signed in to see your profile/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("user-profile")).not.toBeInTheDocument();
    expect(mockNavigateToPage).not.toHaveBeenCalled();
  });

  it("renders the account sections but no group sections when there is no active group", () => {
    mockGroups = { activeGroup: null, loading: false };

    renderPage();

    const nav = screen.getByRole("navigation", { name: /profile sections/i });
    const links = within(nav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Account",
      "Appearance",
      "Leaving and deleting",
    ]);
    expect(within(nav).queryByText("Characters")).not.toBeInTheDocument();
  });

  it("renders a loading state while groups are still loading", () => {
    mockGroups = { activeGroup: null, loading: true };

    renderPage();

    expect(screen.getByTestId("profile-loading-state")).toBeInTheDocument();
    expect(screen.queryByTestId("user-profile")).not.toBeInTheDocument();
  });

  // Guards the SHELL only. `UserProfile` is stubbed above, so this cannot see
  // the Close button that still sits under Delete Account inside it -- the real
  // guard for that Definition-of-Done line belongs to the danger-zone card's
  // own suite, once the split gives it one. Kept because the shell is where a
  // stray page-level "Close" would most plausibly be added later.
  it("adds no Close button of its own to the page shell", () => {
    renderPage();

    expect(
      screen.queryByRole("button", { name: /^close$/i })
    ).not.toBeInTheDocument();
  });
});
