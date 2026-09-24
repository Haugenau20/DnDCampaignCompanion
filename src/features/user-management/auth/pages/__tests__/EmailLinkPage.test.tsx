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
const startDeviceApproval = jest.fn();

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
    startDeviceApproval,
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

describe("EmailLinkPage — approving another device", () => {
  const approve = jest.fn();
  const close = jest.fn();
  const DEVICE = "?device=req-1&next=%2Fquests";

  /** A refusal shaped like one from a callable. */
  const callableError = (code: string, message: string) =>
    Object.assign(new Error(message), { code: `functions/${code}` });

  beforeEach(() => {
    jest.clearAllMocks();
    approve.mockResolvedValue(undefined);
    close.mockResolvedValue(undefined);
    startDeviceApproval.mockResolvedValue({ approve, close });
    completeSignInLink.mockResolvedValue({ user: { uid: "u1" }, isNewUser: false });
  });

  /** Open a device link on a browser that did not ask for it, and choose to approve. */
  async function openApproveForm() {
    const rendered = setup({ query: DEVICE, pending: null });
    await userEvent.click(screen.getByRole("button", { name: /sign in on the other device/i }));
    return rendered;
  }

  async function fillAndApprove(email: string, code: string) {
    const emailBox = screen.getByLabelText(/email/i);
    if (!(emailBox as HTMLInputElement).disabled) {
      await userEvent.clear(emailBox);
      await userEvent.type(emailBox, email);
    }
    await userEvent.type(screen.getByLabelText(/code from the other device/i), code);
    await userEvent.click(screen.getByRole("button", { name: /approve the other device/i }));
  }

  test("asks which device to sign in, and signs nobody in yet", () => {
    setup({ query: DEVICE, pending: null });
    expect(screen.getByRole("button", { name: /sign in on the other device/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in on this device/i })).toBeInTheDocument();
    expect(completeSignInLink).not.toHaveBeenCalled();
    expect(startDeviceApproval).not.toHaveBeenCalled();
  });

  // The browser that asked for the link is the one being signed in.
  test("does not ask in the browser that asked for the link", async () => {
    setup({ query: DEVICE });
    await waitFor(() => expect(completeSignInLink).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /sign in on the other device/i })).not.toBeInTheDocument();
  });

  test("does not ask on a link without a request", () => {
    setup({ query: "?next=%2Fquests", pending: null });
    expect(screen.queryByRole("button", { name: /sign in on the other device/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  test("\"this device\" is the ordinary sign-in", async () => {
    setup({ query: DEVICE, pending: null });
    await userEvent.click(screen.getByRole("button", { name: /sign in on this device/i }));
    await userEvent.type(screen.getByLabelText(/email/i), "frodo@shire.dev");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() =>
      expect(completeSignInLink).toHaveBeenCalledWith("frodo@shire.dev", expect.any(String), false)
    );
    expect(await screen.findByTestId("landed")).toHaveTextContent("/quests");
    expect(startDeviceApproval).not.toHaveBeenCalled();
  });

  test("approves the other device, and signs this one in nowhere", async () => {
    await openApproveForm();
    await fillAndApprove("frodo@shire.dev", "0471");

    await waitFor(() => expect(approve).toHaveBeenCalledWith("req-1", "0471"));
    expect(startDeviceApproval).toHaveBeenCalledWith("frodo@shire.dev", window.location.href);
    expect(completeSignInLink).not.toHaveBeenCalled();
    expect(await screen.findByText(/your other device is signing in now/i)).toBeInTheDocument();
    expect(close).toHaveBeenCalled();
    expect(screen.queryByTestId("landed")).not.toBeInTheDocument();
  });

  test("does not approve until the code is four digits", async () => {
    await openApproveForm();
    await userEvent.type(screen.getByLabelText(/email/i), "frodo@shire.dev");
    await userEvent.type(screen.getByLabelText(/code from the other device/i), "04a7");
    expect(screen.getByRole("button", { name: /approve the other device/i })).toBeDisabled();
  });

  // The link is spent by the first attempt; a mistyped code must not cost it.
  test("a wrong code can be retyped, on the same sign-in", async () => {
    approve.mockRejectedValueOnce(
      callableError("invalid-argument", "That code does not match the one on the other device. 2 tries left.")
    );
    await openApproveForm();
    await fillAndApprove("frodo@shire.dev", "0000");

    expect(await screen.findByRole("alert")).toHaveTextContent(/2 tries left/);
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(close).not.toHaveBeenCalled();

    await fillAndApprove("frodo@shire.dev", "0471");
    expect(await screen.findByText(/your other device is signing in now/i)).toBeInTheDocument();
    expect(startDeviceApproval).toHaveBeenCalledTimes(1);
  });

  test("ends the approval when the request is closed or expired", async () => {
    approve.mockRejectedValueOnce(
      callableError("failed-precondition", "This sign-in request has expired. Ask for a new link on the other device.")
    );
    await openApproveForm();
    await fillAndApprove("frodo@shire.dev", "0471");

    expect(await screen.findByRole("alert")).toHaveTextContent(/has expired/);
    expect(close).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /back to sign in/i })).toBeInTheDocument();
  });

  test("says so when the link itself is refused", async () => {
    startDeviceApproval.mockRejectedValueOnce(
      Object.assign(new Error("expired"), { code: "auth/expired-action-code" })
    );
    await openApproveForm();
    await fillAndApprove("frodo@shire.dev", "0471");

    expect(await screen.findByRole("alert")).toHaveTextContent(/expired or has already been used/i);
    expect(approve).not.toHaveBeenCalled();
  });

  test("closes the throwaway sign-in when the reader goes back", async () => {
    approve.mockRejectedValueOnce(callableError("invalid-argument", "That code does not match. 2 tries left."));
    await openApproveForm();
    await fillAndApprove("frodo@shire.dev", "0000");
    await screen.findByRole("alert");

    await userEvent.click(screen.getByRole("button", { name: /^back$/i }));
    expect(close).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /sign in on the other device/i })).toBeInTheDocument();
  });

  test("closes the throwaway sign-in when the page goes away", async () => {
    approve.mockRejectedValueOnce(callableError("invalid-argument", "That code does not match. 2 tries left."));
    const { unmount } = await openApproveForm();
    await fillAndApprove("frodo@shire.dev", "0000");
    await screen.findByRole("alert");
    expect(close).not.toHaveBeenCalled();

    unmount();
    expect(close).toHaveBeenCalled();
  });

  test("an invitation link never offers to approve another device", () => {
    setup({ query: `${INVITE}&device=req-1`, pending: null });
    expect(screen.queryByRole("button", { name: /sign in on the other device/i })).not.toBeInTheDocument();
  });
});
