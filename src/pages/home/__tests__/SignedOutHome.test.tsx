import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignedOutHome from "../SignedOutHome";
import { SIGNED_OUT_EXAMPLE } from "../signed-out-example";

jest.mock("features/user-management", () => ({
  SignInForm: () => <div data-testid="sign-in-form" />,
  JoinGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

const renderHome = () =>
  render(
    <MemoryRouter>
      <SignedOutHome />
    </MemoryRouter>
  );

describe("SignedOutHome", () => {
  it("leads with what the product is, as the page's h1", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /everything your table agreed happened/i
    );
  });

  it("says a campaign is private to its group and joining is by invite", () => {
    renderHome();
    // Scoped to the prose element: "invite" also appears on the secondary
    // button, and an unscoped getByText would match both and throw.
    expect(screen.getByTestId("home-blurb")).toHaveTextContent(/invite-only/i);
    expect(screen.getByTestId("home-blurb")).toHaveTextContent(/nothing is public/i);
  });

  it("offers signing in and an invite link", () => {
    renderHome();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /invite link/i })
    ).toBeInTheDocument();
  });

  it("opens the sign-in dialog", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByTestId("sign-in-form")).toBeInTheDocument();
  });

  it("opens the join-group dialog", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: /invite link/i }));
    expect(screen.getByTestId("join-group-dialog")).toBeInTheDocument();
  });

  it("labels the example as an example, in real text", () => {
    renderHome();
    // Outside the aria-hidden subtree, so a screen reader hears it.
    const chip = screen.getByText(/example campaign/i);
    expect(chip).toBeInTheDocument();
    expect(chip.closest("[aria-hidden='true']")).toBeNull();
  });

  it("says the panel is a picture rather than a demo", () => {
    renderHome();
    expect(screen.getByText(/nothing here is clickable/i)).toBeInTheDocument();
  });

  it("hides the example panel from assistive technology", () => {
    renderHome();
    const panel = screen.getByTestId("example-panel");
    expect(panel).toHaveAttribute("aria-hidden", "true");
  });

  it("puts nothing clickable or focusable inside the example panel", () => {
    renderHome();
    const panel = screen.getByTestId("example-panel");
    expect(
      panel.querySelectorAll("a, button, input, select, textarea, [tabindex]")
    ).toHaveLength(0);
  });

  it("renders the fixture's own numbers, not a dashboard of zeros", () => {
    renderHome();
    const panel = screen.getByTestId("example-panel");
    expect(panel).toHaveTextContent(SIGNED_OUT_EXAMPLE.campaignTitle);
    SIGNED_OUT_EXAMPLE.stats.forEach((stat) => {
      expect(panel).toHaveTextContent(String(stat.value));
    });
    SIGNED_OUT_EXAMPLE.updates.forEach((update) => {
      expect(panel).toHaveTextContent(update.title);
    });
  });

  it("lists the three things the product does, in words", () => {
    renderHome();
    // Scoped to the list: "rumors" and "private" also appear in the blurb
    // above, so unscoped queries would match several elements and throw.
    const lines = screen.getByTestId("product-lines");
    expect(lines).toHaveTextContent(/chapter log/i);
    expect(lines).toHaveTextContent(/rumors/i);
    expect(lines).toHaveTextContent(/private session notes/i);
    expect(lines.querySelectorAll("li")).toHaveLength(3);
  });
});
