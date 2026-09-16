// src/features/user-management/admin/pages/__tests__/AdminLayout.test.tsx
import React from "react";
import { render, screen, within, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "../AdminLayout";

jest.mock("@/features/user-management/auth/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/features/user-management/groups/hooks/useGroups", () => ({
  useGroups: jest.fn(),
}));

// The back control reaches for campaign context and navigation; neither is
// what this suite is about.
jest.mock("@/shared/components/BackToCampaign", () => ({
  __esModule: true,
  default: () => <div data-testid="back-to-campaign" />,
}));

const { useAuth } = require("@/features/user-management/auth/hooks/useAuth");
const { useGroups } = require("@/features/user-management/groups/hooks/useGroups");

/** A stand-in for wherever a redirect lands, so the URL can be asserted. */
const LocationProbe: React.FC = () => {
  const { useLocation } = require("react-router-dom");
  const location = useLocation();
  return (
    <div data-testid="landed">{`${location.pathname}${location.search}`}</div>
  );
};

type Group = { id: string; name: string } | null;

function setAuth({
  user = { uid: "u1" } as { uid: string } | null,
  loading = false,
} = {}) {
  useAuth.mockReturnValue({ user, loading });
}

function setGroups({
  isAdmin = true,
  activeGroup = { id: "g1", name: "The Fellowship" } as Group,
  loading = false,
} = {}) {
  useGroups.mockReturnValue({ isAdmin, activeGroup, loading });
}

function renderAt(path = "/admin/people") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="people" element={<div data-testid="people-view" />} />
          <Route path="campaigns" element={<div data-testid="campaigns-view" />} />
          <Route path="group" element={<div data-testid="group-view" />} />
        </Route>
        <Route path="/signin" element={<LocationProbe />} />
        <Route path="/" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuth();
    setGroups();
  });

  describe("as an admin with an active group", () => {
    test("renders the group name in the band", () => {
      renderAt();
      expect(
        screen.getByRole("heading", { name: "The Fellowship" })
      ).toBeInTheDocument();
    });

    test("renders the child route's content", () => {
      renderAt();
      expect(screen.getByTestId("people-view")).toBeInTheDocument();
    });

    test("renders three sub-navigation links, as real anchors", () => {
      renderAt();
      const nav = screen.getByRole("navigation", { name: /administration/i });
      const links = within(nav).getAllByRole("link");
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "/admin/people",
        "/admin/campaigns",
        "/admin/group",
      ]);
    });

    test("marks only the current view with aria-current", () => {
      renderAt("/admin/campaigns");
      const current = screen.getAllByRole("link", { current: "page" });
      expect(current).toHaveLength(1);
      expect(current[0]).toHaveTextContent("Campaigns");
    });

    test("offers the way back to the campaign", () => {
      renderAt();
      expect(screen.getByTestId("back-to-campaign")).toBeInTheDocument();
    });
  });

  describe("while auth is still rehydrating", () => {
    // Bug #1423's failure mode: `user` is null both when nobody is signed in
    // and while Firebase Auth is restoring, so a terminal decision taken here
    // bounces a signed-in admin off their own admin page.
    beforeEach(() => {
      setAuth({ user: null, loading: true });
      setGroups({ isAdmin: false, activeGroup: null, loading: true });
    });

    test("does not redirect to sign-in", () => {
      renderAt();
      expect(screen.queryByTestId("landed")).not.toBeInTheDocument();
    });

    test("does not claim the visitor is not an admin", () => {
      renderAt();
      expect(screen.queryByText(/not an admin/i)).not.toBeInTheDocument();
    });

    test("shows a busy state instead", () => {
      renderAt();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    test("renders no admin content", () => {
      renderAt();
      expect(screen.queryByTestId("people-view")).not.toBeInTheDocument();
    });
  });

  describe("signed out, once auth has settled", () => {
    beforeEach(() => {
      setAuth({ user: null, loading: false });
      setGroups({ isAdmin: false, activeGroup: null });
    });

    test("redirects to sign-in carrying the destination", () => {
      renderAt("/admin/people");
      expect(screen.getByTestId("landed")).toHaveTextContent(
        "/signin?next=%2Fadmin%2Fpeople"
      );
    });

    test("carries the destination from any of the three views", () => {
      renderAt("/admin/group");
      expect(screen.getByTestId("landed")).toHaveTextContent(
        "/signin?next=%2Fadmin%2Fgroup"
      );
    });
  });

  describe("signed in but not an admin", () => {
    beforeEach(() => {
      setGroups({ isAdmin: false });
    });

    test("says so plainly, without calling it an error", () => {
      renderAt();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        /not an admin/i
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    test("renders no admin content", () => {
      renderAt();
      expect(screen.queryByTestId("people-view")).not.toBeInTheDocument();
    });

    test("renders no sub-navigation", () => {
      renderAt();
      expect(
        screen.queryByRole("navigation", { name: /administration/i })
      ).not.toBeInTheDocument();
    });

    test("offers one way back to the campaign", () => {
      renderAt();
      expect(screen.getByTestId("back-to-campaign")).toBeInTheDocument();
    });
  });

  describe("signed in with no active group", () => {
    beforeEach(() => {
      setGroups({ isAdmin: false, activeGroup: null, loading: false });
    });

    test("says there is no group selected rather than blaming the role", () => {
      renderAt();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        /no group/i
      );
    });

    test("renders no admin content", () => {
      renderAt();
      expect(screen.queryByTestId("people-view")).not.toBeInTheDocument();
    });
  });

  describe("while group data is still settling", () => {
    // The 3-second cap carried over from `AdminPanel`: group data that never
    // resolves must not leave the page spinning forever.
    beforeEach(() => {
      jest.useFakeTimers();
      setGroups({ isAdmin: false, activeGroup: null, loading: true });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("waits rather than deciding", () => {
      renderAt();
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    });

    test("gives up after three seconds and states where it got to", () => {
      renderAt();
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        /no group/i
      );
    });
  });
});
