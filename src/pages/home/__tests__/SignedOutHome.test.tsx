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

  // Rewritten with the copy pass that took the access model out of the
  // product's voice. The blurb used to say "Invite-only: a DM sends a join
  // link, and nothing is public" -- two claims a player already assumes, one
  // of which named the wrong person, since any player can be the group admin.
  // What survives is the only part a stranger cannot work out for themselves:
  // an account alone gets you nowhere, you need someone to send you a link.
  // Home is now the only place in `src/` that says so (`GATED_FOOTNOTE` used
  // to repeat it on twenty routes), so this assertion is what keeps a
  // signed-out visitor from being told to create an account and nothing else.
  it("tells a stranger they need a join link, without naming the DM", () => {
    renderHome();
    // Scoped to the prose element: "invite" also appears on the secondary
    // button, and an unscoped getByText would match both and throw.
    const blurb = screen.getByTestId("home-blurb");
    expect(blurb).toHaveTextContent(/join link/i);
    expect(blurb).toHaveTextContent(/whoever set up your campaign/i);
    expect(blurb).not.toHaveTextContent(/\bDM\b/);
  });

  it("pitches the AI extraction a stranger has no other way to discover", () => {
    renderHome();
    // The notes line is the product's most persuasive feature and the only
    // one a signed-out visitor cannot infer from the entity names above it.
    expect(screen.getByTestId("product-lines")).toHaveTextContent(
      /AI pulls out the NPCs/i
    );
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

  // Replaces "says the panel is a picture rather than a demo", which pinned
  // the caption "a picture, not a demo — nothing here is clickable". That
  // sentence described the implementation rather than the product, so it was
  // removed. Nothing is lost: the promise it made is enforced for real by
  // "puts nothing clickable or focusable inside the example panel" below,
  // which checks the DOM instead of asking the reader to take our word for
  // it. This test guards the replacement -- the chip alone is the caption.
  it("captions the example with the chip alone, no explanatory prose", () => {
    renderHome();
    const chip = screen.getByText(/example campaign/i);
    const captionRow = chip.parentElement as HTMLElement;
    expect(captionRow).not.toBeNull();
    expect(captionRow.textContent?.trim()).toBe("Example campaign");
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
    // Scoped to the list: "rumors" and "notes" also appear in the blurb
    // above, so unscoped queries would match several elements and throw.
    const lines = screen.getByTestId("product-lines");
    expect(lines).toHaveTextContent(/chapter log/i);
    expect(lines).toHaveTextContent(/rumors/i);
    // Was /private session notes/i. The line no longer leads with "private" --
    // a player assumes their own notes are their own -- and leads with the
    // extraction pitch instead; see "pitches the AI extraction" above.
    expect(lines).toHaveTextContent(/session notes/i);
    expect(lines.querySelectorAll("li")).toHaveLength(3);
  });
});
