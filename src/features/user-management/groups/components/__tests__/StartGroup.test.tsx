// src/features/user-management/groups/components/__tests__/StartGroup.test.tsx
//
// T127: a founder link leads from the link to a group with its first
// campaign, then to the page the players are invited from.
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import StartGroup from "../StartGroup";

jest.mock("@/features/user-management/groups/hooks/useInvitations", () => ({
  useInvitations: jest.fn(),
}));
jest.mock("@/features/user-management/auth/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));
jest.mock("@/features/user-management/groups/hooks/useGroups", () => ({
  useGroups: jest.fn(),
}));
jest.mock("@/features/user-management/groups/hooks/useCampaigns", () => ({
  useCampaigns: jest.fn(),
}));

const { useInvitations } = require("@/features/user-management/groups/hooks/useInvitations");
const { useAuth } = require("@/features/user-management/auth/hooks/useAuth");
const { useGroups } = require("@/features/user-management/groups/hooks/useGroups");
const { useCampaigns } = require("@/features/user-management/groups/hooks/useCampaigns");

const reserveFounderSignUp = jest.fn();
const sendSignInLink = jest.fn();
const signInWithGoogle = jest.fn();
const reloadUserContext = jest.fn();
const createGroup = jest.fn();
const createCampaign = jest.fn();
const setActiveCampaign = jest.fn();

/** Shows where the flow navigated to. */
const Where: React.FC = () => {
  const location = useLocation();
  return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
};

function setup({
  token = "f-tok",
  user = null as { uid: string } | null,
  loading = false,
  username = undefined as string | undefined,
} = {}) {
  useInvitations.mockReturnValue({ reserveFounderSignUp });
  useAuth.mockReturnValue({ user, loading, sendSignInLink, signInWithGoogle, reloadUserContext });
  useGroups.mockReturnValue({
    createGroup,
    activeGroupUserProfile: username ? { username } : null,
  });
  useCampaigns.mockReturnValue({ createCampaign, setActiveCampaign });
  const tree = () => (
    <MemoryRouter initialEntries={["/join"]}>
      <Routes>
        <Route path="/join" element={<><StartGroup founderToken={token} /><Where /></>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
  const { rerender } = render(tree());
  rerenderPage = () => rerender(tree());
}

/** Renders the page again, as a context change would. */
let rerenderPage: () => void = () => undefined;

const where = () => screen.getByTestId("where").textContent;

describe("StartGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reserveFounderSignUp.mockResolvedValue(undefined);
    sendSignInLink.mockResolvedValue(undefined);
    signInWithGoogle.mockResolvedValue({ user: { uid: "u-new" }, isNewUser: true });
    reloadUserContext.mockResolvedValue(undefined);
    createGroup.mockResolvedValue("g-new");
    createCampaign.mockResolvedValue("c-new");
    setActiveCampaign.mockResolvedValue(undefined);
  });

  describe("signed out", () => {
    test("asks for an account first, by email", () => {
      setup();
      expect(screen.getByRole("heading", { name: /first, your account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/group name/i)).not.toBeInTheDocument();
    });

    test("reserves the address against the founder link, then sends a link that comes back to it", async () => {
      setup();
      await userEvent.type(screen.getByLabelText(/^email/i), "f@table.test");
      await userEvent.click(screen.getByRole("button", { name: /email me a sign-in link/i }));

      await waitFor(() => expect(sendSignInLink).toHaveBeenCalled());
      expect(reserveFounderSignUp).toHaveBeenCalledWith("f-tok", "f@table.test");
      const [address, url] = sendSignInLink.mock.calls[0];
      expect(address).toBe("f@table.test");
      expect(new URL(url).searchParams.get("founder")).toBe("f-tok");
      expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
    });

    // The order matters: the blocking function admits only a reserved address.
    test("reserves before opening Google, with the address as the one to pick", async () => {
      setup();
      await userEvent.type(screen.getByLabelText(/^email/i), "f@table.test");
      await userEvent.click(screen.getByRole("button", { name: /continue with google/i }));

      await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith(false, "f@table.test"));
      expect(reserveFounderSignUp.mock.invocationCallOrder[0]).toBeLessThan(
        signInWithGoogle.mock.invocationCallOrder[0]
      );
    });

    test("says what is wrong with a spent link, and sends nothing", async () => {
      reserveFounderSignUp.mockRejectedValue(
        new Error("This link to start a group has already been used. Ask for a new one.")
      );
      setup();
      await userEvent.type(screen.getByLabelText(/^email/i), "f@table.test");
      await userEvent.click(screen.getByRole("button", { name: /email me a sign-in link/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/already been used/i);
      expect(sendSignInLink).not.toHaveBeenCalled();
    });
  });

  describe("signed in", () => {
    const user = { uid: "u-1" };

    test("asks for the group's name and the founder's name in it", () => {
      setup({ user });
      expect(screen.getByRole("heading", { name: /name your group/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/your name in this group/i)).toBeInTheDocument();
    });

    test("offers the name the founder uses in another group", () => {
      setup({ user, username: "Strider" });
      expect(screen.getByLabelText(/your name in this group/i)).toHaveValue("Strider");
    });

    test("refuses a name too short to be one, without calling the server", async () => {
      setup({ user });
      await userEvent.type(screen.getByLabelText(/group name/i), "Thursday");
      await userEvent.type(screen.getByLabelText(/your name in this group/i), "Al");
      expect(screen.getByText(/3–20 characters$/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create the group/i })).toBeDisabled();
    });

    test("spends the link on the group, loads it, then asks for the first campaign", async () => {
      setup({ user });
      await userEvent.type(screen.getByLabelText(/group name/i), "Thursday table");
      await userEvent.type(screen.getByLabelText(/your name in this group/i), "Aragorn");
      await userEvent.click(screen.getByRole("button", { name: /create the group/i }));

      expect(await screen.findByRole("heading", { name: /start your first campaign/i })).toBeInTheDocument();
      expect(createGroup).toHaveBeenCalledWith({
        name: "Thursday table",
        username: "Aragorn",
        founderToken: "f-tok",
      });
      expect(reloadUserContext).toHaveBeenCalled();
    });

    test("shows the server's refusal and stays on the group step", async () => {
      createGroup.mockRejectedValue(new Error("This link to start a group has expired. Ask for a new one."));
      setup({ user });
      await userEvent.type(screen.getByLabelText(/group name/i), "Thursday table");
      await userEvent.type(screen.getByLabelText(/your name in this group/i), "Aragorn");
      await userEvent.click(screen.getByRole("button", { name: /create the group/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/expired/i);
      expect(screen.getByRole("button", { name: /create the group/i })).toBeEnabled();
    });

    async function makeGroup() {
      await userEvent.type(screen.getByLabelText(/group name/i), "Thursday table");
      await userEvent.type(screen.getByLabelText(/your name in this group/i), "Aragorn");
      await userEvent.click(screen.getByRole("button", { name: /create the group/i }));
      await screen.findByRole("heading", { name: /start your first campaign/i });
    }

    test("makes the first campaign in the new group, then goes to invite the players", async () => {
      setup({ user });
      await makeGroup();
      await userEvent.type(screen.getByLabelText(/campaign name/i), "The Sunken Library");
      await userEvent.click(screen.getByRole("button", { name: /create campaign/i }));

      await waitFor(() => expect(where()).toBe("/admin/people"));
      expect(createCampaign).toHaveBeenCalledWith("g-new", "The Sunken Library", "");
      expect(setActiveCampaign).toHaveBeenCalledWith("c-new");
    });

    test("lets the first campaign wait", async () => {
      setup({ user });
      await makeGroup();
      await userEvent.click(screen.getByRole("button", { name: /later/i }));

      await waitFor(() => expect(where()).toBe("/admin/people"));
      expect(createCampaign).not.toHaveBeenCalled();
    });
  });

  // A new founder has no profile until the group exists; the form must not
  // wait for the context to stop looking for one.
  test("asks for the group as soon as someone is signed in, profile or not", () => {
    setup({ user: { uid: "u-new" }, loading: true });
    expect(screen.getByRole("heading", { name: /name your group/i })).toBeInTheDocument();
  });

  test("offers the founder's name from another group once it has loaded", () => {
    setup({ user: { uid: "u-1" }, loading: true });
    expect(screen.getByLabelText(/your name in this group/i)).toHaveValue("");

    useGroups.mockReturnValue({ createGroup, activeGroupUserProfile: { username: "Strider" } });
    // Any re-render picks the loaded profile up.
    useAuth.mockReturnValue({ user: { uid: "u-1" }, loading: false, sendSignInLink, signInWithGoogle, reloadUserContext });
    rerenderPage();
    expect(screen.getByLabelText(/your name in this group/i)).toHaveValue("Strider");
  });

  test("shows a skeleton, not a form, while the session is restored", () => {
    setup({ loading: true });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByLabelText(/^email/i)).not.toBeInTheDocument();
  });

  describe("with no link", () => {
    test("asks for it, and accepts the whole link", async () => {
      setup({ token: "" });
      await userEvent.type(
        screen.getByLabelText(/link to start a group/i),
        "https://muninn.quest/join?founder=abc_DEF-1"
      );
      await userEvent.click(screen.getByRole("button", { name: /continue/i }));
      await waitFor(() => expect(where()).toBe("/join?founder=abc_DEF-1"));
    });

    test("says so when what was pasted holds no link", async () => {
      setup({ token: "" });
      await userEvent.type(screen.getByLabelText(/link to start a group/i), "https://muninn.quest/join");
      expect(screen.getByText(/not a link to start a group/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    });
  });
});
