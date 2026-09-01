// src/app/layout/__tests__/Header.test.tsx
// Behavioral tests for the Header component.
// Header pulls in many contexts and feature components — mock aggressively.

import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "../Header";

// ---------------------------------------------------------------------------
// Mock react-router-dom
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  Link: ({
    children,
    to,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    [k: string]: unknown;
  }) => (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

const { useNavigate, useLocation } = require("react-router-dom");

// ---------------------------------------------------------------------------
// Mock Firebase context hooks
// ---------------------------------------------------------------------------
const mockSignOut = jest.fn();
// useGroups' refreshGroups and setActiveGroup, hoisted so tests can configure
// and assert on them -- the join-success handler calls both.
const mockRefreshGroups = jest.fn();
const mockSetActiveGroup = jest.fn();

// Header consumes these components through the domain barrel, so the barrel
// mock re-exports the component stubs defined further down.
jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
  get JoinGroupDialog() {
    return require("@/features/user-management/groups/components/JoinGroupDialog").default;
  },
  get AdminPanel() {
    return require("@/features/user-management/admin/components/AdminPanel").default;
  },
  get UserProfile() {
    return require("@/features/user-management/profiles/components/UserProfile").default;
  },
  get SignInForm() {
    return require("@/features/user-management/auth/components/SignInForm").default;
  },
}));

const {
  useAuth,
  useGroups,
  useCampaigns,
} = require("@/features/user-management");

// ---------------------------------------------------------------------------
// Mock shared components used inside Header
// ---------------------------------------------------------------------------
jest.mock("shared/components/SearchBar", () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));

jest.mock("shared/components/ThemeSelector", () => ({
  __esModule: true,
  default: () => <div data-testid="theme-selector" />,
}));

jest.mock("shared/components/context-switcher/ContextSwitcher", () => ({
  __esModule: true,
  default: () => <div data-testid="context-switcher" />,
}));

// Header now hosts the desktop navigation inline, replacing the second
// full-height nav row. Navigation has its own suite; mock it here.
jest.mock("../Navigation", () => ({
  __esModule: true,
  default: ({ variant }: any) => (
    <div data-testid="navigation" data-variant={variant} />
  ),
}));

// ---------------------------------------------------------------------------
// Mock feature components rendered inside Header dialogs
// ---------------------------------------------------------------------------
jest.mock("@/features/user-management/groups/components/JoinGroupDialog", () => ({
  __esModule: true,
  default: ({ open, onSuccess }: { open: boolean; onSuccess: () => void }) =>
    open ? (
      <button data-testid="trigger-join-success" onClick={onSuccess}>
        Join
      </button>
    ) : null,
}));

jest.mock("@/features/user-management/admin/components/AdminPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="admin-panel" />,
}));

jest.mock("@/features/user-management/profiles/components/UserProfile", () => ({
  __esModule: true,
  default: () => <div data-testid="user-profile" />,
}));

jest.mock("@/features/user-management/auth/components/SignInForm", () => ({
  __esModule: true,
  default: () => <div data-testid="sign-in-form" />,
}));

// ---------------------------------------------------------------------------
// Mock core Dialog to avoid portal timing issues (bug #100)
// ---------------------------------------------------------------------------
jest.mock("core/components/Dialog", () => ({
  __esModule: true,
  default: ({
    open,
    children,
    title,
    onClose,
  }: {
    open: boolean;
    children: React.ReactNode;
    title?: string;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onClose} aria-label="Close dialog">
          ×
        </button>
        {children}
      </div>
    ) : null,
}));

// ---------------------------------------------------------------------------
// Default mock values
// ---------------------------------------------------------------------------
function setupMocks({
  user = null as null | { uid: string },
  isAdmin = false,
  activeGroup = null as null | { id?: string; name: string },
  groups = [] as Array<{ id: string; name: string }>,
  activeCampaignId = null as null | string,
  campaigns = [] as Array<{ id: string; name: string }>,
  pathname = "/dashboard",
} = {}) {
  (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  (useLocation as jest.Mock).mockReturnValue({ pathname });
  (useAuth as jest.Mock).mockReturnValue({ user, signOut: mockSignOut });
  (useGroups as jest.Mock).mockReturnValue({
    activeGroupUserProfile: user
      ? { role: isAdmin ? "admin" : "member", username: "TestUser" }
      : null,
    refreshGroups: mockRefreshGroups,
    setActiveGroup: mockSetActiveGroup,
    activeGroup,
    groups,
  });
  (useCampaigns as jest.Mock).mockReturnValue({
    activeCampaignId,
    campaigns,
  });
}

// window.location.reload must never be called by the join-success handler.
const mockReload = jest.fn();

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshGroups.mockResolvedValue([]);
    setupMocks();
    Object.defineProperty(window, "location", {
      value: { reload: mockReload },
      writable: true,
    });
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    test("should render a <header> element", () => {
      render(<Header />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    test("should render the SearchBar", () => {
      render(<Header />);
      expect(screen.getByTestId("search-bar")).toBeInTheDocument();
    });

    test("should render the menu toggle button", () => {
      render(<Header />);
      expect(
        screen.getByRole("button", { name: /menu/i })
      ).toBeInTheDocument();
    });

    test("should render the app title link", () => {
      render(<Header />);
      // Title uses responsive text — either "D&D Campaign Companion" or "D&D Companion"
      const titleLink = screen.getByRole("link", { name: /D&D/i });
      expect(titleLink).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Unauthenticated state
  // -------------------------------------------------------------------------
  describe("when user is NOT authenticated", () => {
    beforeEach(() => setupMocks({ user: null }));

    test("should show a Sign In button when not logged in", () => {
      render(<Header />);
      // At least one Sign In button/link should be visible
      const signInBtns = screen.getAllByRole("button").filter((b) =>
        /sign in/i.test(b.textContent ?? "")
      );
      // The desktop Sign In button uses a Button component
      expect(signInBtns.length).toBeGreaterThanOrEqual(0);
      // Better: check aria-label or text
      // The hidden md:flex Sign In button is in the DOM
      expect(document.body.textContent).toMatch(/Sign In/);
    });

    test("should NOT show a Sign Out button when not logged in", () => {
      render(<Header />);
      const signOutBtns = screen.queryAllByRole("button").filter((b) =>
        /sign out/i.test(b.textContent ?? "")
      );
      expect(signOutBtns).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated state
  // -------------------------------------------------------------------------
  describe("when user IS authenticated", () => {
    beforeEach(() =>
      setupMocks({ user: { uid: "user-1" } })
    );

    test("should show a Sign Out button when logged in", () => {
      render(<Header />);
      // At least one button with 'sign out' text (desktop or mobile)
      const btns = screen
        .getAllByRole("button")
        .filter((b) => /sign out/i.test(b.textContent ?? ""));
      // Desktop button has text "Sign Out" (lg:inline) — may be in DOM as hidden
      // We check the DOM text globally
      expect(document.body.textContent).toMatch(/Sign Out/i);
    });
  });

  // -------------------------------------------------------------------------
  // Menu toggle
  // -------------------------------------------------------------------------
  describe("menu toggle", () => {
    test("should NOT show the dropdown menu before toggling", () => {
      setupMocks({ user: { uid: "u1" } });
      render(<Header />);
      // Menu content: "Account" section
      expect(screen.queryByText("Account")).not.toBeInTheDocument();
    });

    test("should show the dropdown menu after clicking the menu button", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" } });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      expect(screen.getByText("Account")).toBeInTheDocument();
    });

    test("should show the Appearance section in the menu", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" } });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      expect(screen.getByText("Appearance")).toBeInTheDocument();
    });

    test("should show the ThemeSelector in the open menu", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" } });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      expect(screen.getByTestId("theme-selector")).toBeInTheDocument();
    });

    test("should close the menu when clicking menu button again", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" } });
      render(<Header />);

      const menuBtn = screen.getByRole("button", { name: /menu/i });
      await user.click(menuBtn);
      expect(screen.getByText("Account")).toBeInTheDocument();

      await user.click(menuBtn);
      expect(screen.queryByText("Account")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Admin visibility
  // -------------------------------------------------------------------------
  describe("admin visibility", () => {
    test("should NOT show Admin button for non-admin users", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" }, isAdmin: false });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      expect(screen.queryByRole("button", { name: /admin/i })).not.toBeInTheDocument();
    });

    test("should show Admin button for admin users", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" }, isAdmin: true });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      expect(screen.getByRole("button", { name: /admin/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Sign out
  // -------------------------------------------------------------------------
  describe("sign out", () => {
    test("should call signOut when Sign Out button is clicked", async () => {
      const user = userEvent.setup();
      mockSignOut.mockResolvedValue(undefined);
      setupMocks({ user: { uid: "u1" } });
      render(<Header />);

      // Open menu to access mobile sign out
      await user.click(screen.getByRole("button", { name: /menu/i }));

      // Find all Sign Out buttons (mobile one inside menu)
      const signOutBtns = screen
        .getAllByRole("button")
        .filter((b) => /sign out/i.test(b.textContent ?? ""));

      if (signOutBtns.length > 0) {
        await user.click(signOutBtns[0]);
        expect(mockSignOut).toHaveBeenCalled();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Campaign context display
  // -------------------------------------------------------------------------
  describe("campaign context", () => {
    test("should display active campaign name when available", async () => {
      const user = userEvent.setup();
      setupMocks({
        user: { uid: "u1" },
        activeCampaignId: "camp-1",
        campaigns: [{ id: "camp-1", name: "The Dark Campaign" }],
      });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      // The menu's read-only Campaign section is gone: the switcher chip is
      // the one place the active campaign is shown, and the one door onto
      // changing it.
      expect(screen.queryByText("The Dark Campaign")).not.toBeInTheDocument();
    });

    test("hosts the context switcher in the bar", () => {
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
        activeCampaignId: "camp-1",
        campaigns: [{ id: "camp-1", name: "The Dark Campaign" }],
      });
      render(<Header />);

      expect(screen.getByTestId("context-switcher")).toBeInTheDocument();
    });

    test("omits the switcher when there is no active group", () => {
      setupMocks({ user: { uid: "u1" }, activeGroup: null, campaigns: [] });
      render(<Header />);

      // Nothing to switch between, and nothing to name.
      expect(screen.queryByTestId("context-switcher")).not.toBeInTheDocument();
    });

    test("keeps the switcher when a group has no campaigns yet", () => {
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
        activeCampaignId: null,
        campaigns: [],
      });
      render(<Header />);

      // The chip is now the only entrance to switching, so a group with no
      // campaigns must not strand the user without one.
      expect(screen.getByTestId("context-switcher")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Report a problem
  // -------------------------------------------------------------------------
  describe("report a problem", () => {
    test("offers a way to report a problem", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" } });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      expect(
        screen.getByRole("button", { name: /Report a problem/i })
      ).toBeInTheDocument();
    });

    test("carries the current route to the contact page as context", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" }, pathname: "/dashboard" });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(
        screen.getByRole("button", { name: /Report a problem/i })
      );

      // The originating route is what makes a bug report actionable; by the
      // time the form renders, the current path is only ever "/contact".
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining("/contact?from=")
      );
    });
  });

  // -------------------------------------------------------------------------
  // Navigation consolidation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    test("hosts the desktop navigation inline in the bar", () => {
      setupMocks({ user: { uid: "u1" } });
      render(<Header />);

      // The nav used to be a second full-height row rendered by Layout.
      expect(screen.getByTestId("navigation")).toHaveAttribute(
        "data-variant",
        "inline"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Profile dialog title
  // -------------------------------------------------------------------------
  describe("profile dialog title", () => {
    test("the profile dialog is not titled undefined's profile before the profile loads", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" } });
      // The profile hasn't loaded yet: activeGroupUserProfile is still null
      // even though the user is signed in.
      (useGroups as jest.Mock).mockReturnValue({
        activeGroupUserProfile: null,
        refreshGroups: mockRefreshGroups,
        setActiveGroup: mockSetActiveGroup,
        activeGroup: null,
        groups: [],
      });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("button", { name: /^profile$/i }));

      expect(
        screen.getByRole("dialog", { name: "Your profile" })
      ).toBeInTheDocument();
      // Asserted against the accessible name rather than the text: the Dialog
      // mock above renders `title` only as aria-label, so a queryByText for
      // /undefined/ would pass against the broken code too.
      expect(
        screen.queryByRole("dialog", { name: /undefined/i })
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Joining a group -- the sole mount, and its one success behaviour
  // -------------------------------------------------------------------------
  describe("joining a group", () => {
    test("mounts the join dialog exactly once", async () => {
      const user = userEvent.setup();
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
      });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("button", { name: /join group/i }));

      expect(screen.getAllByTestId("trigger-join-success")).toHaveLength(1);
    });

    test("switches to a group the user has just joined", async () => {
      const user = userEvent.setup();
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
        groups: [{ id: "g1", name: "The Fellowship" }],
      });
      // refreshGroups resolves with the list as it is AFTER joining
      mockRefreshGroups.mockResolvedValue([
        { id: "g1", name: "The Fellowship" },
        { id: "g2", name: "The Council of Elrond" },
      ]);
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("button", { name: /join group/i }));
      await user.click(screen.getByTestId("trigger-join-success"));

      // joinGroupWithToken returns void, so the new group is the one that
      // appears in the list. Landing the user in it is the whole point of
      // having just joined it.
      expect(mockSetActiveGroup).toHaveBeenCalledWith("g2");
      expect(mockReload).not.toHaveBeenCalled();
    });

    // Finding 3 of the 2026-09-01 review: JoinGroupDialog's stub above calls
    // onSuccess() fire-and-forget (no await, no catch), and useGroups().
    // setActiveGroup re-throws after recording its own failure -- so a
    // rejection here used to become an unhandled promise rejection with
    // nothing shown to the user. The group refresh has already succeeded by
    // this point, so this only has to confirm the rejection is actually
    // handled (not just that this test doesn't fail).
    test("reports rather than throws when landing in the newly joined group fails", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
        groups: [{ id: "g1", name: "The Fellowship" }],
      });
      mockRefreshGroups.mockResolvedValue([
        { id: "g1", name: "The Fellowship" },
        { id: "g2", name: "The Council of Elrond" },
      ]);
      mockSetActiveGroup.mockRejectedValue(new Error("Switch failed"));
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));
      await user.click(screen.getByRole("button", { name: /join group/i }));

      await act(async () => {
        await user.click(screen.getByTestId("trigger-join-success"));
      });

      expect(mockSetActiveGroup).toHaveBeenCalledWith("g2");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
