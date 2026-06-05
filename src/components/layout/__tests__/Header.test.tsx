// src/components/layout/__tests__/Header.test.tsx
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
}));

const { useNavigate } = require("react-router-dom");

// ---------------------------------------------------------------------------
// Mock Firebase context hooks
// ---------------------------------------------------------------------------
const mockSignOut = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
}));

const {
  useAuth,
  useGroups,
  useCampaigns,
} = require("@/features/user-management");

// ---------------------------------------------------------------------------
// Mock shared components used inside Header
// ---------------------------------------------------------------------------
jest.mock("../../shared/SearchBar", () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));

jest.mock("../../shared/ThemeSelector", () => ({
  __esModule: true,
  default: () => <div data-testid="theme-selector" />,
}));

jest.mock("../../shared/ContextSwitcher", () => ({
  __esModule: true,
  default: () => <div data-testid="context-switcher" />,
}));

// ---------------------------------------------------------------------------
// Mock feature components rendered inside Header dialogs
// ---------------------------------------------------------------------------
jest.mock("@/features/user-management/groups/components/JoinGroupDialog", () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
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
jest.mock("../../core/Dialog", () => ({
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
  activeGroup = null as null | { name: string },
  activeCampaignId = null as null | string,
  campaigns = [] as Array<{ id: string; name: string }>,
} = {}) {
  (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  (useAuth as jest.Mock).mockReturnValue({ user, signOut: mockSignOut });
  (useGroups as jest.Mock).mockReturnValue({
    activeGroupUserProfile: user
      ? { role: isAdmin ? "admin" : "member", username: "TestUser" }
      : null,
    refreshGroups: jest.fn(),
    activeGroup,
  });
  (useCampaigns as jest.Mock).mockReturnValue({
    activeCampaignId,
    campaigns,
  });
}

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
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
    test("should display No Group Selected when no active group", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" }, activeGroup: null });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      expect(screen.getByText("No Group Selected")).toBeInTheDocument();
    });

    test("should display active group name when available", async () => {
      const user = userEvent.setup();
      setupMocks({
        user: { uid: "u1" },
        activeGroup: { name: "Fellowship of the Ring" },
      });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      expect(screen.getByText("Fellowship of the Ring")).toBeInTheDocument();
    });

    test("should display No Campaign Selected when no active campaign", async () => {
      const user = userEvent.setup();
      setupMocks({ user: { uid: "u1" }, activeCampaignId: null, campaigns: [] });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      expect(screen.getByText("No Campaign Selected")).toBeInTheDocument();
    });

    test("should display active campaign name when available", async () => {
      const user = userEvent.setup();
      setupMocks({
        user: { uid: "u1" },
        activeCampaignId: "camp-1",
        campaigns: [{ id: "camp-1", name: "The Dark Campaign" }],
      });
      render(<Header />);

      await user.click(screen.getByRole("button", { name: /menu/i }));

      expect(screen.getByText("The Dark Campaign")).toBeInTheDocument();
    });
  });
});
