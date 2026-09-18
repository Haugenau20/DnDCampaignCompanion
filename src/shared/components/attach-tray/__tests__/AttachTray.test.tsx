// src/shared/components/attach-tray/__tests__/AttachTray.test.tsx
import React, { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttachTray from "../AttachTray";
import type { AttachSources } from "../attachCandidates";

const SOURCES: AttachSources = {
  npc: [
    {
      id: "thorin",
      name: "Thorin Oakenshield",
      occupation: "King under the Mountain",
      locationId: "erebor",
      dateAdded: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "balin",
      name: "Balin",
      occupation: "Scribe",
      locationId: "erebor",
      dateAdded: "2026-02-01T00:00:00.000Z",
    },
    {
      id: "bard",
      name: "Bard the Bowman",
      occupation: "Bargeman",
      location: "Lake-town",
      dateAdded: "2026-01-01T00:00:00.000Z",
    },
  ],
  location: [{ id: "erebor", name: "Erebor", type: "city", dateAdded: "2026-01-01T00:00:00.000Z" }],
  quest: [{ id: "reclaim", title: "Reclaim Erebor", status: "active", dateAdded: "2026-01-01T00:00:00.000Z" }],
};

/** A host that owns the relation, the way a real form does. */
function Host({
  initial = [],
  ...props
}: Partial<React.ComponentProps<typeof AttachTray>> & { initial?: string[] }) {
  const [ids, setIds] = useState<string[]>(initial);
  return (
    <AttachTray
      kinds={["npc"]}
      sources={SOURCES}
      attachedIds={ids}
      onAttach={(id) => setIds((current) => [...current, id])}
      onDetach={(id) => setIds((current) => current.filter((x) => x !== id))}
      {...props}
    />
  );
}

/** Render the default host and open its tray. */
const openTray = async (
  props: Partial<React.ComponentProps<typeof AttachTray>> & { initial?: string[] } = {}
) => {
  render(<Host {...props} />);
  await userEvent.click(screen.getByRole("button", { name: /attach/i }));
  return screen.getByRole("listbox");
};

describe("AttachTray", () => {
  describe("browse first", () => {
    // The hard constraint: typing is never the price of attaching something.
    it("shows what exists as soon as it opens, with nothing typed", async () => {
      await openTray();
      expect(screen.getAllByRole("option")).toHaveLength(3);
    });

    it("attaches with no keystrokes at all", async () => {
      await openTray();
      await userEvent.click(screen.getByRole("option", { name: /Balin/ }));
      expect(screen.getByRole("option", { name: /Balin/ })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    it("does not focus the filter box, which would turn a browse into a search", async () => {
      await openTray();
      expect(screen.getByLabelText("Filter the list")).not.toHaveFocus();
    });

    it("is not a typeahead: the list is complete before anything is typed", async () => {
      await openTray();
      const names = screen.getAllByRole("option").map((o) => o.textContent);
      expect(names.join(" ")).toContain("Thorin Oakenshield");
      expect(names.join(" ")).toContain("Bard the Bowman");
    });
  });

  describe("what each entry carries", () => {
    it("shows the name and the line that disambiguates it", async () => {
      await openTray();
      const row = screen.getByRole("option", { name: /Bard the Bowman/ });
      expect(within(row).getByText("Bard the Bowman")).toBeInTheDocument();
      expect(within(row).getByText("Bargeman · Lake-town")).toBeInTheDocument();
    });

    it("never renders an id as a label", async () => {
      await openTray();
      const listbox = screen.getByRole("listbox");
      expect(listbox.textContent).not.toMatch(/\bthorin\b/);
      expect(listbox.textContent).not.toMatch(/\berebor\b/);
    });

    it("orders by recently touched, not alphabetically", async () => {
      await openTray();
      const names = screen.getAllByRole("option").map((o) => o.textContent || "");
      expect(names[0]).toContain("Thorin");
      expect(names[2]).toContain("Bard");
    });
  });

  describe("selection is immediate and reversible", () => {
    it("offers no Done button, because every toggle has already applied", async () => {
      await openTray();
      expect(screen.queryByRole("button", { name: /^done$/i })).not.toBeInTheDocument();
    });

    it("shows a chip above the list for each attachment, and keeps the list open", async () => {
      await openTray();
      await userEvent.click(screen.getByRole("option", { name: /Balin/ }));

      expect(screen.getByRole("button", { name: "Detach Balin" })).toBeInTheDocument();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("removes the row's mark when the chip is removed", async () => {
      render(<Host initial={["balin"]} />);
      await userEvent.click(screen.getByRole("button", { name: /attach/i }));
      expect(screen.getByRole("option", { name: /Balin/ })).toHaveAttribute("aria-selected", "true");

      await userEvent.click(screen.getByRole("button", { name: "Detach Balin" }));
      expect(screen.getByRole("option", { name: /Balin/ })).toHaveAttribute("aria-selected", "false");
    });

    it("detaches from the row as well as from the chip", async () => {
      render(<Host initial={["balin"]} />);
      await userEvent.click(screen.getByRole("button", { name: /attach/i }));
      await userEvent.click(screen.getByRole("option", { name: /Balin/ }));
      expect(screen.queryByRole("button", { name: "Detach Balin" })).not.toBeInTheDocument();
    });

    it("replaces rather than adds for a single-valued relation, and closes", async () => {
      const onAttach = jest.fn();
      render(
        <AttachTray
          kinds={["location"]}
          sources={SOURCES}
          attachedIds={[]}
          onAttach={onAttach}
          onDetach={jest.fn()}
          single
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /attach/i }));
      await userEvent.click(screen.getByRole("option", { name: /Erebor/ }));

      expect(onAttach).toHaveBeenCalledWith("erebor", "location");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("keyboard", () => {
    it("is arrow-navigable in visual order, and Enter attaches", async () => {
      await openTray();
      const first = screen.getAllByRole("option")[0];
      first.focus();

      await userEvent.keyboard("{ArrowDown}");
      expect(screen.getByRole("option", { name: /Balin/ })).toHaveFocus();

      await userEvent.keyboard("{Enter}");
      expect(screen.getByRole("option", { name: /Balin/ })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    it("wraps at both ends rather than dead-ending", async () => {
      await openTray();
      screen.getAllByRole("option")[0].focus();
      await userEvent.keyboard("{ArrowUp}");
      expect(screen.getByRole("option", { name: /Bard the Bowman/ })).toHaveFocus();
    });

    it("closes on Escape without the key reaching the form behind it", async () => {
      const onFormKeyDown = jest.fn();
      render(
        <div onKeyDown={onFormKeyDown}>
          <Host />
        </div>
      );
      await userEvent.click(screen.getByRole("button", { name: /attach/i }));
      screen.getAllByRole("option")[0].focus();
      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(onFormKeyDown).not.toHaveBeenCalled();
    });

    it("returns focus to the trigger when it closes", async () => {
      await openTray();
      screen.getAllByRole("option")[0].focus();
      await userEvent.keyboard("{Escape}");
      expect(screen.getByRole("button", { name: /attach/i })).toHaveFocus();
    });
  });

  describe("the filter box, as an accelerator", () => {
    it("narrows the list by name", async () => {
      await openTray();
      await userEvent.type(screen.getByLabelText("Filter the list"), "bal");
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });

    it("narrows by the disambiguating line too", async () => {
      await openTray();
      await userEvent.type(screen.getByLabelText("Filter the list"), "bargeman");
      expect(screen.getByRole("option", { name: /Bard the Bowman/ })).toBeInTheDocument();
    });

    it("says so when nothing matches, rather than showing a blank box", async () => {
      await openTray();
      await userEvent.type(screen.getByLabelText("Filter the list"), "smaug");
      expect(screen.queryAllByRole("option")).toHaveLength(0);
      expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
    });

    it("is forgotten when the tray closes, so it never reopens pre-filtered", async () => {
      await openTray();
      await userEvent.type(screen.getByLabelText("Filter the list"), "bal");
      await userEvent.click(screen.getByRole("button", { name: /close/i }));
      await userEvent.click(screen.getByRole("button", { name: /attach/i }));
      expect(screen.getAllByRole("option")).toHaveLength(3);
    });
  });

  describe("groups", () => {
    it("shows no headings for a tray of one kind", async () => {
      await openTray();
      expect(screen.queryByText("People")).not.toBeInTheDocument();
    });

    it("groups People / Places / Quests when it spans kinds", async () => {
      await openTray({ kinds: ["npc", "location", "quest"] });
      expect(screen.getByText("People")).toBeInTheDocument();
      expect(screen.getByText("Places")).toBeInTheDocument();
      expect(screen.getByText("Quests")).toBeInTheDocument();
    });
  });

  describe("the escape hatch", () => {
    it("is there without a call site wiring it, so every tray has one", async () => {
      await openTray();
      expect(
        screen.getByRole("button", { name: /no such person yet/i })
      ).toBeInTheDocument();
    });

    it("is absent for a kind quick add cannot create", async () => {
      // `15-1` leaves the rumour on its own form, so a rumour tray offers no
      // hatch rather than one that opens nothing.
      render(
        <AttachTray
          kinds={["rumor"]}
          sources={{ rumor: [] }}
          attachedIds={[]}
          onAttach={jest.fn()}
          onDetach={jest.fn()}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: /attach/i }));
      expect(screen.queryByRole("button", { name: /no such/i })).not.toBeInTheDocument();
    });

    it("offers to add one, and says so in the kind's own words", async () => {
      render(<Host onCreateNew={jest.fn()} />);
      await userEvent.click(screen.getByRole("button", { name: /attach/i }));
      expect(
        screen.getByRole("button", { name: /no such person yet/i })
      ).toBeInTheDocument();
    });

    it("hands the kind back, so quick add opens pre-wired", async () => {
      const onCreateNew = jest.fn();
      render(<Host onCreateNew={onCreateNew} />);
      await userEvent.click(screen.getByRole("button", { name: /attach/i }));
      await userEvent.click(screen.getByRole("button", { name: /no such person yet/i }));
      expect(onCreateNew).toHaveBeenCalledWith("npc");
    });

    it("is still reachable when the collection is empty", async () => {
      render(<Host sources={{ npc: [] }} onCreateNew={jest.fn()} />);
      await userEvent.click(screen.getByRole("button", { name: /attach/i }));
      expect(screen.getByText("Nobody in the campaign yet.")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /no such person yet/i })
      ).toBeInTheDocument();
    });
  });

  describe("what it never offers", () => {
    it("omits the record the tray is being filled from", async () => {
      render(<Host excludeIds={["thorin"]} />);
      await userEvent.click(screen.getByRole("button", { name: /attach/i }));
      expect(screen.queryByRole("option", { name: /Thorin/ })).not.toBeInTheDocument();
    });
  });
});
