// src/features/user-management/auth/pages/__tests__/EmailLinkPage.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import EmailLinkPage from "../EmailLinkPage";

jest.mock("@/features/user-management/auth/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));
jest.mock("@/features/user-management/groups/hooks/useInvitations", () => ({
  useInvitations: jest.fn(),
}));

const { useAuth } = require("@/features/user-management/auth/hooks/useAuth");
const {
  useInvitations,
} = require("@/features/user-management/groups/hooks/useInvitations");

const isSignInLink = jest.fn();
const getPendingEmailSignIn = jest.fn();
const completeSignInLink = jest.fn();
const deleteFreshAccount = jest.fn();
const reloadUserContext = jest.fn();
const joinGroupWithToken = jest.fn();

const LocationProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="landed">{`${location.pathname}${location.search}`}</div>;
};

function setup({
  query = "",
  isLink = true,
  pending = { email: "frodo@shire.dev", rememberMe: true } as
    | { email: string; rememberMe: boolean }
    | null,
  strict = false,
} = {}) {
  isSignInLink.mockReturnValue(isLink);
  getPendingEmailSignIn.mockReturnValue(pending);
  useAuth.mockReturnValue({
    isSignInLink,
    getPendingEmailSignIn,
    completeSignInLink,
    deleteFreshAccount,
    reloadUserContext,
  });
  useInvitations.mockReturnValue({ joinGroupWithToken });

  const tree = (
    <MemoryRouter initialEntries={[`/auth/link${query}`]}>
      <Routes>
        <Route path="/auth/link" element={<EmailLinkPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
  return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
}

const INVITE = "?groupId=g-1&token=tok-1&username=Sam";

/** An error shaped like the one a refused blocking function produces. */
const gateRefusal = () =>
  Object.assign(new Error("Firebase: INVITE_REQUIRED: refused (auth/internal-error)."), {
    code: "auth/internal-error",
  });

describe("EmailLinkPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    completeSignInLink.mockResolvedValue({ user: { uid: "u1" }, isNewUser: false });
    joinGroupWithToken.mockResolvedValue(undefined);
    deleteFreshAccount.mockResolvedValue(undefined);
    reloadUserContext.mockResolvedValue(undefined);
  });

  test("says so when the URL is not a sign-in link, and signs nobody in", () => {
    setup({ isLink: false });
    expect(screen.getByRole("heading", { name: /not a sign-in link/i })).toBeInTheDocument();
    expect(completeSignInLink).not.toHaveBeenCalled();
  });

  describe("signing in", () => {
    test("finishes at once with the address and session choice this browser remembered", async () => {
      setup({ query: "?next=%2Fnpcs" });
      await waitFor(() => expect(screen.getByTestId("landed")).toHaveTextContent("/npcs"));
      expect(completeSignInLink).toHaveBeenCalledWith("frodo@shire.dev", window.location.href, true);
    });

    test("goes to campaign home when there is no destination", async () => {
      setup();
      await waitFor(() => expect(screen.getByTestId("landed")).toHaveTextContent(/^\/$/));
    });

    // `next` is untrusted input on a sign-in surface: an open redirect is the
    // thing `safeNextPath` exists to prevent (D45).
    test("does not follow a destination on another origin", async () => {
      setup({ query: "?next=%2F%2Fevil.test" });
      await waitFor(() => expect(screen.getByTestId("landed")).toHaveTextContent(/^\/$/));
    });

    // The one-time code in the link can be spent exactly once. StrictMode runs
    // effects twice in development, which would spend it and then fail.
    test("uses the link exactly once", async () => {
      setup({ strict: true });
      await waitFor(() => expect(screen.getByTestId("landed")).toBeInTheDocument());
      expect(completeSignInLink).toHaveBeenCalledTimes(1);
    });

    test("asks for the address when the link was opened on another device", async () => {
      setup({ pending: null, query: "?next=%2Fquests" });
      expect(completeSignInLink).not.toHaveBeenCalled();

      await userEvent.type(screen.getByLabelText(/email/i), "frodo@shire.dev");
      await userEvent.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => expect(screen.getByTestId("landed")).toHaveTextContent("/quests"));
      expect(completeSignInLink).toHaveBeenCalledWith("frodo@shire.dev", window.location.href, false);
    });

    test("explains an address with no account, and offers the way back", async () => {
      completeSignInLink.mockRejectedValueOnce(gateRefusal());
      setup();
      expect(await screen.findByRole("alert")).toHaveTextContent(/no account for this address/i);
      expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute("href", "/signin");
    });

    test("explains a spent or expired link", async () => {
      completeSignInLink.mockRejectedValueOnce(
        Object.assign(new Error("x"), { code: "auth/invalid-action-code" })
      );
      setup();
      expect(await screen.findByRole("alert")).toHaveTextContent(/expired or has already been used/i);
    });
  });

  describe("joining from an invitation", () => {
    test("redeems the invitation under the chosen name, reloads, and lands home", async () => {
      completeSignInLink.mockResolvedValueOnce({ user: { uid: "u-new" }, isNewUser: true });
      setup({ query: INVITE });
      await waitFor(() => expect(screen.getByTestId("landed")).toHaveTextContent(/^\/$/));
      expect(joinGroupWithToken).toHaveBeenCalledWith("tok-1", "Sam");
      expect(reloadUserContext).toHaveBeenCalled();
      expect(deleteFreshAccount).not.toHaveBeenCalled();
    });

    test("removes a brand-new account whose invitation then fails, and points back at it", async () => {
      completeSignInLink.mockResolvedValueOnce({ user: { uid: "u-new" }, isNewUser: true });
      joinGroupWithToken.mockRejectedValueOnce(new Error("Username is already taken in this group."));
      setup({ query: INVITE });

      expect(await screen.findByRole("alert")).toHaveTextContent(/already taken/i);
      expect(deleteFreshAccount).toHaveBeenCalled();
      expect(screen.getByRole("link", { name: /back to the invitation/i })).toHaveAttribute(
        "href",
        "/join?groupId=g-1&token=tok-1"
      );
    });

    test("keeps an existing account whose join fails", async () => {
      joinGroupWithToken.mockRejectedValueOnce(new Error("You are already a member of this group."));
      setup({ query: INVITE });
      await screen.findByRole("alert");
      expect(deleteFreshAccount).not.toHaveBeenCalled();
    });
  });
});
