// src/shared/components/contact/__tests__/SenderIdentity.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SenderIdentity from "../SenderIdentity";

const baseProps = {
  signedInName: "DungeonMaster",
  signedInEmail: "dm@example.com",
  showInputs: false,
  name: "",
  email: "",
  onNameChange: jest.fn(),
  onEmailChange: jest.fn(),
  onUseDifferentEmail: jest.fn(),
};

describe("SenderIdentity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signed in", () => {
    it("says who the message is being sent as", () => {
      render(<SenderIdentity {...baseProps} />);

      expect(
        screen.getByText("Sending as DungeonMaster · dm@example.com")
      ).toBeInTheDocument();
    });

    it("says what context is attached automatically", () => {
      render(<SenderIdentity {...baseProps} />);

      expect(
        screen.getByText(
          "We'll attach your group, campaign and app version so you don't have to describe them."
        )
      ).toBeInTheDocument();
    });

    it("does not ask for a name or an email", () => {
      render(<SenderIdentity {...baseProps} />);

      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    });

    it("offers a way to use a different email", async () => {
      render(<SenderIdentity {...baseProps} />);

      await userEvent.click(
        screen.getByRole("button", { name: "Use a different email" })
      );

      expect(baseProps.onUseDifferentEmail).toHaveBeenCalledTimes(1);
    });

    it("shows the initial of the signed-in name as an avatar", () => {
      render(<SenderIdentity {...baseProps} />);

      expect(screen.getByTestId("sender-avatar")).toHaveTextContent("D");
    });
  });

  describe("showing the inputs", () => {
    it("asks for a name and an email", () => {
      render(<SenderIdentity {...baseProps} showInputs />);

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("no longer offers the different-email action", () => {
      render(<SenderIdentity {...baseProps} showInputs />);

      expect(
        screen.queryByRole("button", { name: "Use a different email" })
      ).not.toBeInTheDocument();
    });

    it("reports what is typed into the name field", async () => {
      render(<SenderIdentity {...baseProps} showInputs />);

      await userEvent.type(screen.getByLabelText("Name"), "A");

      expect(baseProps.onNameChange).toHaveBeenCalledWith("A");
    });

    it("reports what is typed into the email field", async () => {
      render(<SenderIdentity {...baseProps} showInputs />);

      await userEvent.type(screen.getByLabelText("Email"), "a");

      expect(baseProps.onEmailChange).toHaveBeenCalledWith("a");
    });
  });

  describe("signed out", () => {
    it("shows the inputs and no identity row", () => {
      render(
        <SenderIdentity
          {...baseProps}
          signedInName={null}
          signedInEmail={null}
          showInputs
        />
      );

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.queryByText(/Sending as/)).not.toBeInTheDocument();
    });
  });
});
