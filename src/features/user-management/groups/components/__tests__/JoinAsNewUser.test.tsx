// src/features/user-management/groups/components/__tests__/JoinAsNewUser.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import JoinAsNewUser from "../JoinAsNewUser";

jest.mock("@/features/user-management/profiles/hooks/useUser", () => ({
  useUser: jest.fn(),
}));
jest.mock("@/features/user-management/groups/hooks/useInvitations", () => ({
  useInvitations: jest.fn(),
}));

const { useUser } = require("@/features/user-management/profiles/hooks/useUser");
const {
  useInvitations,
} = require("@/features/user-management/groups/hooks/useInvitations");

const signUpWithToken = jest.fn().mockResolvedValue(undefined);
const validateUsername = jest
  .fn()
  .mockResolvedValue({ isValid: true, isAvailable: true });

function setup(onJoined = jest.fn()) {
  useUser.mockReturnValue({ validateUsername });
  useInvitations.mockReturnValue({ signUpWithToken });
  render(
    <MemoryRouter>
      <JoinAsNewUser token="tok-1" onJoined={onJoined} />
    </MemoryRouter>
  );
  return onJoined;
}

/** Fill every field with values that should pass. */
async function fillValid() {
  await userEvent.type(screen.getByLabelText(/your name in this group/i), "Boromir");
  await userEvent.type(screen.getByLabelText(/^email/i), "b@gondor.test");
  const passwords = document.querySelectorAll('input[type="password"]');
  await userEvent.type(passwords[0] as HTMLElement, "Str0ng!Password");
  await userEvent.type(passwords[1] as HTMLElement, "Str0ng!Password");
  // The username check is debounced at 500ms.
  await waitFor(() => expect(validateUsername).toHaveBeenCalled(), { timeout: 3000 });
}

describe("JoinAsNewUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
  });

  // The name is not an account name, and people get that wrong. It is asked
  // first, while attention is still on the group.
  test("asks for the group name before the credentials", () => {
    setup();
    const labels = Array.from(document.querySelectorAll("label")).map((l) =>
      (l.textContent ?? "").toLowerCase()
    );
    const nameAt = labels.findIndex((l) => l.includes("name in this group"));
    const emailAt = labels.findIndex((l) => l.includes("email"));
    expect(nameAt).toBeGreaterThanOrEqual(0);
    expect(nameAt).toBeLessThan(emailAt);
  });

  test("says what the name is for, in the words that matter", () => {
    setup();
    expect(
      screen.getByText(/other members see this name on everything you write/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/not an account name/i)).toBeInTheDocument();
  });

  test("cannot be submitted until everything is valid", () => {
    setup();
    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
  });

  // An earlier draft described the rules by hand and omitted the
  // special-character one, which would have disabled Join with nothing on
  // screen explaining why. The list comes from the validator now.
  test("states every password rule the validator actually enforces", () => {
    setup();
    const { validatePassword } = require("@/shared/utils/password-validation");
    const rules: string[] = validatePassword("").errors;
    expect(rules.length).toBeGreaterThan(0);

    const helper = screen
      .getByLabelText(/^password/i)
      .closest("div")?.parentElement?.textContent ?? "";
    for (const rule of rules) {
      expect(helper).toContain(rule);
    }
  });

  test("refuses mismatched passwords", async () => {
    setup();
    const passwords = document.querySelectorAll('input[type="password"]');
    await userEvent.type(passwords[0] as HTMLElement, "Str0ng!Password");
    await userEvent.type(passwords[1] as HTMLElement, "Different1!");
    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
  });

  test("refuses an address that is not one", async () => {
    setup();
    await userEvent.type(screen.getByLabelText(/^email/i), "not-an-email");
    expect(
      await screen.findByText(/enter a valid email address/i)
    ).toBeInTheDocument();
  });

  test("signs up with the token it was given", async () => {
    const onJoined = setup();
    await fillValid();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Join" })).toBeEnabled()
    );
    await userEvent.click(screen.getByRole("button", { name: "Join" }));
    await waitFor(() =>
      expect(signUpWithToken).toHaveBeenCalledWith(
        "tok-1",
        "b@gondor.test",
        "Str0ng!Password",
        "Boromir"
      )
    );
    await waitFor(() => expect(onJoined).toHaveBeenCalled());
  });

  // A swap has no URL and no visible progress; a link out and back does.
  test("offers the way out for somebody who already has an account", () => {
    setup();
    expect(screen.getByRole("link", { name: /sign in first/i })).toHaveAttribute(
      "href",
      "/signin"
    );
  });
});
