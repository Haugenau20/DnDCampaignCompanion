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
  useJoinGroupCompletion: jest.fn(),
  get JoinGroupDialog() {
    return require("@/features/user-management/groups/components/JoinGroupDialog").default;
  },
  get AdminPanel() {
    return require("@/features/user-management/admin/components/AdminPanel").default;
  },
  get SignInForm() {
    return require("@/features/user-management/auth/components/SignInForm").default;
  },
}));

const {
  useAuth,
  useGroups,
  useCampaigns,
  useJoinGroupCompletion,
} = require("@/features/user-management");

// The shared join-completion behaviour (useJoinGroupCompletion) now owns the
// refresh/find/switch/log sequence -- Header only closes its own dialog and
// calls it. Its own suite (useJoinGroupCompletion.test.tsx) covers what the
// callback actually does; here we only need a stub to hand back.
const mockCompleteJoin = jest.fn();

// ---------------------------------------------------------------------------
// Mock shared components used inside Header
// ---------------------------------------------------------------------------
jest.mock("shared/components/command-palette/SearchTrigger", () => ({
  __esModule: true,
  default: React.forwardRef<HTMLButtonElement, { onOpen: () => void }>(
    ({ onOpen }, ref) => (
      <button ref={ref} type="button" aria-label="Search" onClick={onOpen} />
    )
  ),
}));

jest.mock("shared/components/command-palette/CommandPalette", () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="command-palette" /> : null,
}));

jest.mock("shared/components/ThemeSelector", () => ({
  __esModule: true,
  default: () => <div data-testid="theme-selector" />,
}));

jest.mock("shared/components/context-switcher/ContextSwitcher", () => ({
  __esModule: true,
  // Renders a real trigger for `onJoinGroup` so Header's own dialog-mounting
  // behaviour can still be exercised without opening the (now-deleted)
  // hamburger menu to reach it.
  default: ({ onJoinGroup }: { onJoinGroup: () => void }) => (
    <div data-testid="context-switcher">
      <button onClick={onJoinGroup}>Join Group</button>
    </div>
  ),
}));

// Header now hosts the desktop navigation inline, replacing the second
// full-height nav row. Navigation has its own suite; mock it here.
jest.mock("../Navigation", () => ({
  __esModule: true,
  default: ({ variant }: any) => (
    <div data-testid="navigation" data-variant={variant} />
  ),
}));

// The account menu -- one named chip replacing the hamburger -- has its own
// suite (UserMenu.test.tsx and its four child suites). Here it is a stub
// that exposes just enough to prove Header wires `onOpenAdmin` through to
// the admin dialog it still owns.
jest.mock("shared/components/user-menu/UserMenu", () => ({
  __esModule: true,
  default: ({ onOpenAdmin }: { onOpenAdmin: () => void }) => (
    <div data-testid="user-menu">
      <button onClick={onOpenAdmin}>Open Admin</button>
    </div>
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
  (useJoinGroupCompletion as jest.Mock).mockReturnValue(mockCompleteJoin);
}

// A signed-in user for the search-affordance tests below -- same shape as
// the `{ uid: ... }` stand-ins used throughout this file.
const mockUser = { uid: "user-1" };

/**
 * Configures `useAuth` (and its dependent mocks) via {@link setupMocks} and
 * renders `<Header />` in one step, for the search-affordance suite.
 */
function renderHeader({ user = null as null | { uid: string } } = {}) {
  setupMocks({ user });
  render(<Header />);
}

// window.location.reload must never be called by the join-success handler.
const mockReload = jest.fn();

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshGroups.mockResolvedValue([]);
    mockCompleteJoin.mockResolvedValue(undefined);
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

    test("should render the app title link", () => {
      render(<Header />);
      // Title uses responsive text — either "D&D Campaign Companion" or "D&D Companion"
      const titleLink = screen.getByRole("link", { name: /D&D/i });
      expect(titleLink).toBeInTheDocument();
    });

    // Successor to "should render the menu toggle button": the hamburger this
    // task deletes is gone, and there is nothing left in Header that a
    // button named "menu" could refer to.
    test("renders no hamburger button", () => {
      setupMocks({ user: { uid: "u1" } });
      render(<Header />);
      expect(
        screen.queryByRole("button", { name: /^menu$/i })
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Unauthenticated state
  // -------------------------------------------------------------------------
  describe("when user is NOT authenticated", () => {
    beforeEach(() => setupMocks({ user: null }));

    // Successor to "should show a Sign In button when not logged in": the
    // hamburger used to carry a second, mobile-only Sign In button; now
    // there is exactly one, visible at every width.
    test("shows a Sign In button at every width when signed out", () => {
      render(<Header />);
      const signInButton = screen.getByRole("button", { name: /sign in/i });
      expect(signInButton).toBeInTheDocument();
      expect(signInButton.className).not.toMatch(/hidden/);
    });

    // Successor to "should NOT show a Sign Out button when not logged in":
    // Sign out now lives only inside the user menu, which does not render
    // at all when signed out.
    test("renders no user menu when signed out", () => {
      render(<Header />);
      expect(screen.queryByTestId("user-menu")).not.toBeInTheDocument();
    });

    test("still offers the theme selector when signed out", () => {
      render(<Header />);
      expect(screen.getByTestId("theme-selector")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated state
  // -------------------------------------------------------------------------
  describe("when user IS authenticated", () => {
    beforeEach(() => setupMocks({ user: { uid: "user-1" } }));

    // Successor to "should show a Sign Out button when logged in": sign out
    // is now a row inside the user menu (see UserMenuLinks's own suite);
    // Header's job is only to mount the menu.
    test("renders the account menu when signed in", () => {
      render(<Header />);
      expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Admin panel wiring
  // -------------------------------------------------------------------------
  describe("admin panel", () => {
    // Successor to "should NOT/should show Admin button for ...": which
    // users see the Admin panel row is now UserMenuLinks's concern (its own
    // suite: "shows Admin panel only for admins"). What Header still owns is
    // opening its Dialog when the menu asks it to.
    test("opens the admin panel when the menu asks to", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" }, isAdmin: true });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /open admin/i }));

      expect(
        screen.getByRole("dialog", { name: "Admin Panel" })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Campaign context display
  // -------------------------------------------------------------------------
  describe("campaign context", () => {
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
  // Joining a group -- the sole mount, and its one success behaviour. The
  // trigger moved from the hamburger's "Groups" button to the context
  // switcher's own `onJoinGroup` callback (mocked above as a plain button),
  // but Header's own dialog-mounting behaviour is unchanged.
  // -------------------------------------------------------------------------
  describe("joining a group", () => {
    test("mounts the join dialog exactly once", async () => {
      const user = userEvent.setup();
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
      });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /join group/i }));

      expect(screen.getAllByTestId("trigger-join-success")).toHaveLength(1);
    });

    // The refresh/find/switch/log sequence itself moved into
    // useJoinGroupCompletion (see useJoinGroupCompletion.test.tsx, which pins
    // "switches to the group that appeared", "stays put when none does" and
    // "logs rather than throwing when the switch fails" -- the three cases
    // this suite used to cover directly). What Header owns now is just:
    // close its own dialog, then hand off to that shared callback -- the
    // exact same one AccountCard's "Join another" entrance calls, which is
    // the invariant this test protects.
    test("closes the dialog and calls the shared completion hook -- the same path AccountCard's 'Join another' uses", async () => {
      const user = userEvent.setup();
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { id: "g1", name: "The Fellowship" },
        groups: [{ id: "g1", name: "The Fellowship" }],
      });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /join group/i }));
      expect(screen.getByTestId("trigger-join-success")).toBeInTheDocument();

      await user.click(screen.getByTestId("trigger-join-success"));

      expect(mockCompleteJoin).toHaveBeenCalled();
      expect(screen.queryByTestId("trigger-join-success")).not.toBeInTheDocument();
      expect(mockReload).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Search affordance -- the fixed trigger and command palette replacing the
  // old field-and-dropdown search bar. Both the trigger and the global
  // Meta/Control+K shortcut are gated on `user`: searching an index that was
  // never built is what put results in the signed-out screenshots.
  // -------------------------------------------------------------------------
  describe("search affordance", () => {
    it("offers the trigger to a signed-in user", () => {
      renderHeader({ user: mockUser });
      expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    });

    it("hides the trigger entirely when signed out", () => {
      renderHeader({ user: null });
      expect(
        screen.queryByRole("button", { name: /search/i })
      ).not.toBeInTheDocument();
    });

    it("opens the palette on the meta shortcut", async () => {
      renderHeader({ user: mockUser });
      await userEvent.keyboard("{Meta>}k{/Meta}");
      expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    });

    it("opens the palette on the control shortcut", async () => {
      renderHeader({ user: mockUser });
      await userEvent.keyboard("{Control>}k{/Control}");
      expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    });

    it("leaves the shortcut inert when signed out", async () => {
      renderHeader({ user: null });
      await userEvent.keyboard("{Control>}k{/Control}");
      expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
    });
  });
});
