// src/shared/components/contact/__tests__/ContactSuccess.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactSuccess from "../ContactSuccess";

const baseProps = {
  reference: "CC-4192",
  campaignName: "Phandelver",
  onBackToCampaign: jest.fn(),
  onWriteAnother: jest.fn(),
};

describe("ContactSuccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the reference in the heading", () => {
    render(<ContactSuccess {...baseProps} />);

    expect(screen.getByText("Sent — reference CC-4192")).toBeInTheDocument();
  });

  it("explains what the reference is for and that the message stays put", () => {
    render(<ContactSuccess {...baseProps} />);

    expect(
      screen.getByText(
        "Quote that reference if you write again about the same thing. Your message stays on this page until you leave, so you can copy it if you want it."
      )
    ).toBeInTheDocument();
  });

  it("falls back to a plain heading when the function returned no reference", () => {
    render(<ContactSuccess {...baseProps} reference={null} />);

    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.queryByText(/CC-/)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });

  it("does not promise a reference that is not there", () => {
    render(<ContactSuccess {...baseProps} reference={null} />);

    expect(screen.queryByText(/Quote that reference/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Your message stays on this page until you leave, so you can copy it if you want it."
      )
    ).toBeInTheDocument();
  });

  it("names the campaign in the primary action", () => {
    render(<ContactSuccess {...baseProps} />);

    expect(
      screen.getByRole("button", { name: "Back to Phandelver" })
    ).toBeInTheDocument();
  });

  it("falls back to a generic label when there is no active campaign", () => {
    render(<ContactSuccess {...baseProps} campaignName={null} />);

    expect(
      screen.getByRole("button", { name: "Back to the campaign" })
    ).toBeInTheDocument();
  });

  it("reports the primary action", async () => {
    render(<ContactSuccess {...baseProps} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Back to Phandelver" })
    );

    expect(baseProps.onBackToCampaign).toHaveBeenCalledTimes(1);
  });

  it("reports the write-another action", async () => {
    render(<ContactSuccess {...baseProps} />);

    await userEvent.click(screen.getByRole("button", { name: "Write another" }));

    expect(baseProps.onWriteAnother).toHaveBeenCalledTimes(1);
  });

  it("announces itself to assistive technology", () => {
    render(<ContactSuccess {...baseProps} />);

    expect(screen.getByRole("status")).toHaveTextContent("Sent — reference CC-4192");
  });
});
