// src/pages/__tests__/ContactPage.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactPage from "../ContactPage";

const mockNavigateToPage = jest.fn();
let mockCampaigns = {
  activeCampaign: { name: "Phandelver" } as { name: string } | null,
};

jest.mock("shared/components/ContactForm", () => ({
  __esModule: true,
  default: () => <div data-testid="contact-form" />,
}));

jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

jest.mock("features/user-management", () => ({
  useCampaigns: () => mockCampaigns,
}));

describe("ContactPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCampaigns = { activeCampaign: { name: "Phandelver" } };
  });

  it("titles the page Get in touch", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Get in touch" })
    ).toBeInTheDocument();
  });

  it("explains that everything lands in one inbox", () => {
    render(<ContactPage />);

    expect(
      screen.getByText(
        "Bugs, ideas and account questions all land in the same inbox — it's a two-person project, so pick a category and we'll know what we're looking at."
      )
    ).toBeInTheDocument();
  });

  it("states the response time before the form", () => {
    render(<ContactPage />);

    expect(screen.getByText("We answer within 1–2 weeks.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Nothing is monitored around the clock — if the app is broken, say so in the message and we'll look sooner."
      )
    ).toBeInTheDocument();
  });

  it("renders the form", () => {
    render(<ContactPage />);

    expect(screen.getByTestId("contact-form")).toBeInTheDocument();
  });

  it("offers a way back to the campaign", async () => {
    render(<ContactPage />);

    await userEvent.click(
      screen.getByRole("button", { name: "Back to Phandelver" })
    );

    expect(mockNavigateToPage).toHaveBeenCalledWith("/");
  });

  it("falls back to a generic back label when there is no active campaign", () => {
    mockCampaigns = { activeCampaign: null };

    render(<ContactPage />);

    expect(
      screen.getByRole("button", { name: "Back to the campaign" })
    ).toBeInTheDocument();
  });

  // The four right-hand prose blocks are the thing this redesign removes.
  // Three of them were instructions for a field the reader had already
  // scrolled past; their content now lives under the message field.
  it("no longer renders the right-hand column of advice", () => {
    render(<ContactPage />);

    expect(screen.queryByText("Feature Request")).not.toBeInTheDocument();
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
    expect(screen.queryByText("Response Time")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Our secure contact form ensures your privacy/)
    ).not.toBeInTheDocument();
  });
});
