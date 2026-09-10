// src/shared/components/page-shell/__tests__/PageShell.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import PageShell from "../PageShell";

describe("PageShell", () => {
  it("renders the title as the page's h1", () => {
    render(
      <PageShell title="Quests">
        <div>body</div>
      </PageShell>
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Quests" })
    ).toBeInTheDocument();
  });

  it("renders the subtitle when given one", () => {
    render(
      <PageShell title="Quests" subtitle="Track and complete the party's quests">
        <div>body</div>
      </PageShell>
    );
    expect(
      screen.getByText("Track and complete the party's quests")
    ).toBeInTheDocument();
  });

  it("renders children below the header", () => {
    render(
      <PageShell title="Quests">
        <div data-testid="body">body</div>
      </PageShell>
    );
    expect(screen.getByTestId("body")).toBeInTheDocument();
  });

  it("renders actions when given them", () => {
    render(
      <PageShell title="Quests" actions={<button>Create Quest</button>}>
        <div>body</div>
      </PageShell>
    );
    expect(
      screen.getByRole("button", { name: "Create Quest" })
    ).toBeInTheDocument();
  });

  it("renders no action slot when actions is false", () => {
    // Pages pass `actions={gate.canAct && <Button/>}`, so `false` is the
    // ordinary signal for "this control cannot act right now" -- it must not
    // reach the DOM as the string "false" or as an empty flex row.
    const { container } = render(
      <PageShell title="Quests" actions={false}>
        <div>body</div>
      </PageShell>
    );
    expect(container.textContent).not.toContain("false");
    expect(container.querySelectorAll("header > div")).toHaveLength(1);
  });

  it("renders a breadcrumb above the title when given one", () => {
    render(
      <PageShell title="Quests" breadcrumb={<nav aria-label="Breadcrumb" />}>
        <div>body</div>
      </PageShell>
    );
    expect(screen.getByLabelText("Breadcrumb")).toBeInTheDocument();
  });

  describe("width", () => {
    /** The shell's outer container -- the element carrying the max width. */
    const shellOf = (container: HTMLElement) =>
      container.firstElementChild as HTMLElement;

    it("defaults to the directory width", () => {
      const { container } = render(
        <PageShell title="Quests">
          <div>body</div>
        </PageShell>
      );
      expect(shellOf(container)).toHaveClass("max-w-7xl", "mx-auto");
    });

    it("takes a narrower width instead of the default, not alongside it", () => {
      // The whole point of the prop. Two `max-w-*` utilities on one element do
      // not compose -- Tailwind emits `max-w-7xl` after `max-w-5xl`, so the
      // default would win however the classes were ordered in the attribute.
      // Asserting the absence of the default is therefore the assertion that
      // matters, and it is paired with the positive one so it cannot pass
      // against a shell that rendered no width at all.
      const { container } = render(
        <PageShell title="Privacy" maxWidth="max-w-5xl">
          <div>body</div>
        </PageShell>
      );
      expect(shellOf(container)).toHaveClass("max-w-5xl");
      expect(shellOf(container)).not.toHaveClass("max-w-7xl");
    });

    it("keeps the padding and centring whatever the width", () => {
      const { container } = render(
        <PageShell title="Profile" maxWidth="max-w-3xl">
          <div>body</div>
        </PageShell>
      );
      expect(shellOf(container)).toHaveClass("mx-auto", "px-4", "py-8");
    });
  });
});
