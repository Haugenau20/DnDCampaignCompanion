// src/shared/components/__tests__/ContactForm.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "../ContactForm";

const mockSendContactEmail = jest.fn();
const mockRegistryHas = jest.fn();
const mockRegistryGet = jest.fn();
const mockNavigateToPage = jest.fn();

let mockUser: { email: string | null } | null = null;
let mockGroups = {
  activeGroupId: "group-1" as string | null,
  activeGroupUserProfile: { username: "DungeonMaster" } as { username?: string } | null,
};
let mockCampaigns = {
  activeCampaignId: "campaign-1" as string | null,
  activeCampaign: { name: "Phandelver" } as { name: string } | null,
};
let mockSearch = "";

jest.mock("core/services/firebase/core/ServiceRegistry", () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => ({ has: mockRegistryHas, get: mockRegistryGet })) },
}));

jest.mock("firebase/functions", () => ({
  httpsCallable: jest.fn(() => mockSendContactEmail),
}));

jest.mock("react-router-dom", () => ({
  useLocation: () => ({ search: mockSearch, pathname: "/contact" }),
}));

jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

jest.mock("features/user-management", () => ({
  useAuth: () => ({ user: mockUser }),
  useGroups: () => mockGroups,
  useCampaigns: () => mockCampaigns,
}));

const VALID_MESSAGE = "The delete button removed my note without asking first.";

/** Fill the form to the point where it can legitimately be submitted. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: "Something is broken" }));
  await user.type(screen.getByLabelText("What happened?"), VALID_MESSAGE);
}

describe("ContactForm", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();
    mockRegistryHas.mockReturnValue(true);
    mockRegistryGet.mockReturnValue({});
    mockSendContactEmail.mockResolvedValue({
      data: { success: true, message: "Sent", reference: "CC-4192" },
    });
    mockUser = { email: "dm@example.com" };
    mockGroups = {
      activeGroupId: "group-1",
      activeGroupUserProfile: { username: "DungeonMaster" },
    };
    mockCampaigns = {
      activeCampaignId: "campaign-1",
      activeCampaign: { name: "Phandelver" },
    };
    mockSearch = "";
  });

  // -------------------------------------------------------------------------
  // Structure
  // -------------------------------------------------------------------------
  describe("structure", () => {
    it("asks what the message is about before asking what happened", () => {
      render(<ContactForm />);

      expect(
        screen.getByRole("radiogroup", { name: "What's this about?" })
      ).toBeInTheDocument();
      expect(screen.getByLabelText("What happened?")).toBeInTheDocument();
    });

    it("no longer offers a free-text subject field", () => {
      render(<ContactForm />);

      expect(screen.queryByLabelText(/^Subject/i)).not.toBeInTheDocument();
    });

    it("says a copy goes to the sender", () => {
      render(<ContactForm />);

      expect(
        screen.getByText("A copy goes to your email address.")
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // The character counter and the ten-character minimum
  // -------------------------------------------------------------------------
  describe("the character counter", () => {
    it("starts at zero", () => {
      render(<ContactForm />);

      expect(screen.getByText("0 characters")).toBeInTheDocument();
    });

    it("counts what has been typed", async () => {
      render(<ContactForm />);

      await user.type(screen.getByLabelText("What happened?"), "abcde");

      expect(screen.getByText("5 characters")).toBeInTheDocument();
    });

    it("does not complain about length on the first keystroke", async () => {
      render(<ContactForm />);

      await user.type(screen.getByLabelText("What happened?"), "abc");

      expect(screen.queryByText(/at least 10 characters/i)).not.toBeInTheDocument();
    });

    it("complains on blur once there is something to complain about", async () => {
      render(<ContactForm />);

      await user.type(screen.getByLabelText("What happened?"), "abc");
      await user.tab();

      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });

    it("does not complain on blur when the field is still empty", async () => {
      render(<ContactForm />);

      await user.click(screen.getByLabelText("What happened?"));
      await user.tab();

      expect(screen.queryByText(/at least 10 characters/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Category-driven guidance
  // -------------------------------------------------------------------------
  describe("guidance", () => {
    it("shows nothing before a category is picked", () => {
      render(<ContactForm />);

      expect(screen.queryByTestId("category-guidance")).not.toBeInTheDocument();
    });

    it("tells a bug reporter the three things that help most", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "Something is broken" }));

      expect(screen.getByTestId("category-guidance")).toHaveTextContent(
        "For a bug, three things help most: what you clicked, what happened, and what you expected instead."
      );
    });

    it("changes when the category changes", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "Something is broken" }));
      await user.click(screen.getByRole("radio", { name: "Feature idea" }));

      expect(screen.getByTestId("category-guidance")).toHaveTextContent(
        /what you're trying to do matters more/
      );
    });

    it("shows none for a category that has none", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "Account or group" }));

      expect(screen.queryByTestId("category-guidance")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // The smart-detection second field
  // -------------------------------------------------------------------------
  describe("the smart-detection second field", () => {
    it("appears only for that category", async () => {
      render(<ContactForm />);

      expect(screen.queryByLabelText("Why do you need more?")).not.toBeInTheDocument();

      await user.click(screen.getByRole("radio", { name: "More smart detection" }));

      expect(screen.getByLabelText("Why do you need more?")).toBeInTheDocument();
    });

    it("does not prefill a message full of asterisks", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "More smart detection" }));

      expect(screen.getByLabelText("What happened?")).toHaveValue("");
    });

    it("is optional -- the form submits without it", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "More smart detection" }));
      await user.type(screen.getByLabelText("What happened?"), VALID_MESSAGE);
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
    });
  });

  // -------------------------------------------------------------------------
  // Legacy deep links
  // -------------------------------------------------------------------------
  describe("legacy deep links", () => {
    it("selects the smart-detection category from the old subject parameter", () => {
      mockSearch = "?subject=Smart%20Detection%20Limit%20Increase%20Request";

      render(<ContactForm />);

      expect(
        screen.getByRole("radio", { name: "More smart detection" })
      ).toBeChecked();
    });

    it("selects nothing for a subject that maps to no category", () => {
      mockSearch = "?subject=Something%20unrelated";

      render(<ContactForm />);

      screen.getAllByRole("radio").forEach((chip) => {
        expect(chip).not.toBeChecked();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Identity
  // -------------------------------------------------------------------------
  describe("identity", () => {
    it("does not ask a signed-in user to retype their name and email", () => {
      render(<ContactForm />);

      expect(
        screen.getByText("Sending as DungeonMaster · dm@example.com")
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    });

    it("reveals the inputs on request", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("button", { name: "Use a different email" }));

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("asks a signed-out user for a name and email", () => {
      mockUser = null;

      render(<ContactForm />);

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.queryByText(/Sending as/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // The payload
  // -------------------------------------------------------------------------
  describe("the payload", () => {
    it("sends the category as its own field", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0]).toMatchObject({
        category: "broken",
        message: VALID_MESSAGE,
      });
    });

    it("still sends a subject, so an older deployed function keeps working", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0].subject).toBe("Bug report");
    });

    it("attaches the group, campaign and app version automatically", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0].context).toMatchObject({
        groupId: "group-1",
        campaignId: "campaign-1",
      });
      expect(
        mockSendContactEmail.mock.calls[0][0].context.appVersion
      ).toEqual(expect.any(String));
    });

    it("attaches the originating route from the from parameter", async () => {
      mockSearch = "?from=%2Fnotes%2Fabc";

      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0].context.route).toBe("/notes/abc");
    });

    it("sends a null route rather than the useless /contact", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0].context.route).toBeNull();
    });

    it("sends the signed-in identity", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0]).toMatchObject({
        name: "DungeonMaster",
        email: "dm@example.com",
      });
    });

    it("sends the reason when the smart-detection field is filled", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "More smart detection" }));
      await user.type(screen.getByLabelText("What happened?"), VALID_MESSAGE);
      await user.type(screen.getByLabelText("Why do you need more?"), "Big campaign");
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() => expect(mockSendContactEmail).toHaveBeenCalled());
      expect(mockSendContactEmail.mock.calls[0][0].reason).toBe("Big campaign");
    });
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  describe("validation", () => {
    it("refuses to send without a category", async () => {
      render(<ContactForm />);

      await user.type(screen.getByLabelText("What happened?"), VALID_MESSAGE);
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(mockSendContactEmail).not.toHaveBeenCalled();
      expect(screen.getByText(/pick a category/i)).toBeInTheDocument();
    });

    it("refuses to send a message shorter than ten characters", async () => {
      render(<ContactForm />);

      await user.click(screen.getByRole("radio", { name: "Something is broken" }));
      await user.type(screen.getByLabelText("What happened?"), "short");
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(mockSendContactEmail).not.toHaveBeenCalled();
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });

    it("rejects a malformed email from a signed-out sender", async () => {
      mockUser = null;

      render(<ContactForm />);
      await user.click(screen.getByRole("radio", { name: "Something is broken" }));
      await user.type(screen.getByLabelText("Name"), "Rowan");
      await user.type(screen.getByLabelText("Email"), "not-an-email");
      await user.type(screen.getByLabelText("What happened?"), VALID_MESSAGE);
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(mockSendContactEmail).not.toHaveBeenCalled();
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Success
  // -------------------------------------------------------------------------
  describe("success", () => {
    it("shows the reference the function returned", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(
        await screen.findByText("Sent — reference CC-4192")
      ).toBeInTheDocument();
    });

    it("keeps the message on the page", async () => {
      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await screen.findByText("Sent — reference CC-4192");
      expect(screen.getByLabelText("What happened?")).toHaveValue(VALID_MESSAGE);
    });

    it("survives a function that returns no reference", async () => {
      mockSendContactEmail.mockResolvedValue({
        data: { success: true, message: "Sent" },
      });

      render(<ContactForm />);
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(await screen.findByText("Sent")).toBeInTheDocument();
      expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    });

    it("clears the message but keeps the category on Write another", async () => {
      render(<ContactForm />);
      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: /Send message/ }));
      await screen.findByText("Sent — reference CC-4192");

      await user.click(screen.getByRole("button", { name: "Write another" }));

      expect(screen.getByLabelText("What happened?")).toHaveValue("");
      expect(
        screen.getByRole("radio", { name: "Something is broken" })
      ).toBeChecked();
      expect(screen.queryByText(/Sent —/)).not.toBeInTheDocument();
    });

    it("navigates away on Back to the campaign", async () => {
      render(<ContactForm />);
      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: /Send message/ }));
      await screen.findByText("Sent — reference CC-4192");

      await user.click(screen.getByRole("button", { name: "Back to Phandelver" }));

      expect(mockNavigateToPage).toHaveBeenCalledWith("/");
    });
  });

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------
  describe("initialisation", () => {
    it("keeps the submit button enabled and correctly labelled from the start", () => {
      mockRegistryHas.mockReturnValue(false);

      render(<ContactForm />);

      const button = screen.getByRole("button", { name: /Send message/ });
      expect(button).toBeEnabled();
      expect(button).not.toHaveTextContent(/Initializing/);
    });
  });

  // -------------------------------------------------------------------------
  // Errors
  // -------------------------------------------------------------------------
  describe("errors", () => {
    it("reports a rate limit in words the sender can act on", async () => {
      mockSendContactEmail.mockRejectedValue({
        code: "functions/resource-exhausted",
      });

      render(<ContactForm />);
      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      expect(
        await screen.findByText(/Too many requests/i)
      ).toBeInTheDocument();
    });

    it("does not claim success when the function reports failure", async () => {
      mockSendContactEmail.mockResolvedValue({
        data: { success: false, message: "Nope" },
      });

      render(<ContactForm />);
      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: /Send message/ }));

      await waitFor(() =>
        expect(screen.queryByText(/^Sent/)).not.toBeInTheDocument()
      );
    });
  });
});
