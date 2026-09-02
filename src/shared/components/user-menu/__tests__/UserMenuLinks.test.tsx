// src/shared/components/user-menu/__tests__/UserMenuLinks.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserMenuLinks from "../UserMenuLinks";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

const { useNavigate, useLocation } = require("react-router-dom");

const mockSignOut = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
}));

const { useAuth, useGroups } = require("@/features/user-management");

// This must carry __esModule: true -- a component importing the default
// export via `import firebaseServices from "core/services/firebase"` goes
// through TypeScript's __importDefault interop helper, which double-wraps a
// mock factory that omits this flag and leaves `firebaseServices.group`
// undefined inside the component.
const mockGetGroupUsers = jest.fn();
jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    group: {
      getGroupUsers: (...args: unknown[]) => mockGetGroupUsers(...args),
    },
  },
}));

const mockOnClose = jest.fn();
const mockOnOpenAdmin = jest.fn();

function setupMocks({
  isAdmin = false,
  pathname = "/dashboard",
  groupId = "g1",
} = {}) {
  (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  (useLocation as jest.Mock).mockReturnValue({ pathname });
  useAuth.mockReturnValue({ signOut: mockSignOut });
  useGroups.mockReturnValue({
    activeGroupId: groupId,
    activeGroupUserProfile: { role: isAdmin ? "admin" : "member" },
  });
}

describe("UserMenuLinks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockSignOut.mockResolvedValue(undefined);
    // Never resolves unless a test overrides it -- most tests here have
    // nothing to do with the member count.
    mockGetGroupUsers.mockReturnValue(new Promise(() => {}));
  });

  test("Profile and settings navigates to /profile", async () => {
    render(
      <UserMenuLinks open={true} onClose={mockOnClose} onOpenAdmin={mockOnOpenAdmin} />
    );

    await userEvent.click(
      screen.getByRole("menuitem", { name: /profile and settings/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/profile");
    expect(mockOnClose).toHaveBeenCalled();
  });

  test("Report a problem carries the current route as ?from=", async () => {
    setupMocks({ pathname: "/dashboard" });
    render(
      <UserMenuLinks open={true} onClose={mockOnClose} onOpenAdmin={mockOnOpenAdmin} />
    );

    await userEvent.click(
      screen.getByRole("menuitem", { name: /report a problem/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/contact?from=")
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent("/dashboard"))
    );
  });

  test("shows the member count as text, not as a control", async () => {
    mockGetGroupUsers.mockResolvedValue([{}, {}, {}]);

    render(
      <UserMenuLinks open={true} onClose={mockOnClose} onOpenAdmin={mockOnOpenAdmin} />
    );

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /group members/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /group members/i })
    ).not.toBeInTheDocument();
  });

  test("omits the member count until it resolves", () => {
    render(
      <UserMenuLinks open={true} onClose={mockOnClose} onOpenAdmin={mockOnOpenAdmin} />
    );

    expect(screen.getByText(/group members/i)).toBeInTheDocument();
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  test("shows Admin panel only for admins", async () => {
    setupMocks({ isAdmin: false });
    const { rerender } = render(
      <UserMenuLinks open={true} onClose={mockOnClose} onOpenAdmin={mockOnOpenAdmin} />
    );
    expect(
      screen.queryByRole("menuitem", { name: /admin panel/i })
    ).not.toBeInTheDocument();

    setupMocks({ isAdmin: true });
    rerender(
      <UserMenuLinks open={true} onClose={mockOnClose} onOpenAdmin={mockOnOpenAdmin} />
    );

    await userEvent.click(
      screen.getByRole("menuitem", { name: /admin panel/i })
    );
    expect(mockOnOpenAdmin).toHaveBeenCalled();
  });

  test("Sign out signs out", async () => {
    render(
      <UserMenuLinks open={true} onClose={mockOnClose} onOpenAdmin={mockOnOpenAdmin} />
    );

    await userEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  });
});
