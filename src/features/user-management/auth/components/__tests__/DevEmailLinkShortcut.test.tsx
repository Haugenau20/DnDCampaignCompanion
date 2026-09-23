// src/features/user-management/auth/components/__tests__/DevEmailLinkShortcut.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockConfig = { useEmulators: true };

jest.mock("@/core/services/firebase/config/firebaseConfig", () => ({
  get useEmulators() {
    return mockConfig.useEmulators;
  },
  emulatorHost: "localhost",
  emulatorPorts: { auth: "9099" },
  firebaseConfig: { projectId: "demo-project" },
}));

import DevEmailLinkShortcut from "../DevEmailLinkShortcut";

const OUTBOX = "http://localhost:9099/emulator/v1/projects/demo-project/oobCodes";
const originalEnv = process.env.NODE_ENV;
const originalLocation = window.location;
const assign = jest.fn();

/** Answers the outbox request with these entries. */
function outbox(oobCodes: Array<{ email: string; requestType: string; oobLink: string }>) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ oobCodes }),
  });
}

const openButton = () => screen.getByRole("button", { name: /open the emulator's link/i });

describe("DevEmailLinkShortcut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.useEmulators = true;
    (process.env as any).NODE_ENV = "development";
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign },
    });
  });

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    delete (global as any).fetch;
  });

  describe("never reaches a build that is not dev-against-the-emulators", () => {
    test("renders nothing without the emulators", () => {
      mockConfig.useEmulators = false;
      const { container } = render(<DevEmailLinkShortcut email="dm@example.com" />);
      expect(container).toBeEmptyDOMElement();
    });

    test("renders nothing in a production build, even with the emulators", () => {
      (process.env as any).NODE_ENV = "production";
      const { container } = render(<DevEmailLinkShortcut email="dm@example.com" />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  test("follows the newest sign-in link for the address, case-insensitively", async () => {
    outbox([
      { email: "dm@example.com", requestType: "EMAIL_SIGNIN", oobLink: "http://link/old" },
      { email: "player1@example.com", requestType: "EMAIL_SIGNIN", oobLink: "http://link/other" },
      { email: "DM@example.com", requestType: "EMAIL_SIGNIN", oobLink: "http://link/new" },
      { email: "dm@example.com", requestType: "PASSWORD_RESET", oobLink: "http://link/reset" },
    ]);
    render(<DevEmailLinkShortcut email="dm@example.com" />);

    await userEvent.click(openButton());

    await waitFor(() => expect(assign).toHaveBeenCalledWith("http://link/new"));
    expect((global as any).fetch).toHaveBeenCalledWith(OUTBOX);
  });

  test("says so when the emulator holds no link for the address", async () => {
    outbox([{ email: "player1@example.com", requestType: "EMAIL_SIGNIN", oobLink: "http://link/other" }]);
    render(<DevEmailLinkShortcut email="dm@example.com" />);

    await userEvent.click(openButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(/no sign-in link for dm@example.com/i);
    expect(assign).not.toHaveBeenCalled();
    expect(openButton()).toBeEnabled();
  });

  test("says so when the emulator cannot be reached", async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("Failed to fetch"));
    render(<DevEmailLinkShortcut email="dm@example.com" />);

    await userEvent.click(openButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not read the emulator's outbox/i);
    expect(assign).not.toHaveBeenCalled();
  });
});
