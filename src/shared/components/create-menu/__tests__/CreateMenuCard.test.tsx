// src/shared/components/create-menu/__tests__/CreateMenuCard.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BookOpen,
  FileText,
  MapPin,
  MessageSquare,
  Scroll,
  User,
} from "lucide-react";
import CreateMenuCard from "../CreateMenuCard";
import type { CreateAction } from "shared/hooks/useCreateActions";

/**
 * The six real actions, in real display order, with stub `run` functions --
 * the card never calls `run` itself, only `onSelect`.
 */
const actions: CreateAction[] = [
  { id: "note", entityLabel: "Note", icon: FileText, sectionPath: "/notes", shortcut: "N", run: jest.fn() },
  { id: "chapter", entityLabel: "Chapter", icon: BookOpen, sectionPath: "/story", shortcut: "C", run: jest.fn() },
  { id: "npc", entityLabel: "NPC", icon: User, sectionPath: "/npcs", shortcut: "P", run: jest.fn() },
  { id: "location", entityLabel: "Location", icon: MapPin, sectionPath: "/locations", shortcut: "L", run: jest.fn() },
  { id: "rumor", entityLabel: "Rumor", icon: MessageSquare, sectionPath: "/rumors", shortcut: "R", run: jest.fn() },
  { id: "quest", entityLabel: "Quest", icon: Scroll, sectionPath: "/quests", shortcut: "Q", run: jest.fn() },
];

function renderCard(overrides: Partial<React.ComponentProps<typeof CreateMenuCard>> = {}) {
  const onSelect = jest.fn();
  const utils = render(
    <CreateMenuCard
      actions={actions}
      promotedId="quest"
      isOnPromotedSection={false}
      campaignName="Curse of Strahd"
      creditedName="Elandra"
      onSelect={onSelect}
      {...overrides}
    />
  );
  return { onSelect, ...utils };
}

describe("CreateMenuCard", () => {
  test("renders one menuitem per action, in the given order", () => {
    renderCard();

    const rows = screen.getAllByRole("menuitem");
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("New Quest"),
      expect.stringContaining("Note"),
      expect.stringContaining("Chapter"),
      expect.stringContaining("NPC"),
      expect.stringContaining("Location"),
      expect.stringContaining("Rumor"),
    ]);
  });

  test("exactly one row carries button-primary, and it is the promoted one", () => {
    renderCard({ promotedId: "npc" });

    const rows = screen.getAllByRole("menuitem");
    const accentRows = rows.filter((row) => row.classList.contains("button-primary"));

    expect(accentRows).toHaveLength(1);
    expect(accentRows[0]).toHaveTextContent("New NPC");
  });

  test("the promoted row reads New {entityLabel}; the others read the bare noun", () => {
    renderCard({ promotedId: "quest" });

    expect(screen.getByRole("menuitem", { name: /new quest/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Note N" })).toBeInTheDocument();
    expect(screen.queryByText("New Note")).not.toBeInTheDocument();
  });

  test("the you're here marker appears only when isOnPromotedSection is true", () => {
    const { rerender } = renderCard({ promotedId: "quest", isOnPromotedSection: false });
    expect(screen.queryByText(/you're here/i)).not.toBeInTheDocument();

    rerender(
      <CreateMenuCard
        actions={actions}
        promotedId="quest"
        isOnPromotedSection={true}
        campaignName="Curse of Strahd"
        creditedName="Elandra"
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByText(/you're here/i)).toBeInTheDocument();
  });

  test("every non-promoted row shows its shortcut letter", () => {
    renderCard({ promotedId: "quest" });

    expect(screen.getByRole("menuitem", { name: "Note N" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Chapter C" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "NPC P" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Location L" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Rumor R" })).toBeInTheDocument();
  });

  test("the header names the campaign and the footer names the credited person", () => {
    renderCard({ campaignName: "Curse of Strahd", creditedName: "Elandra" });

    expect(screen.getByText(/add to curse of strahd/i)).toBeInTheDocument();
    expect(screen.getByText("Elandra")).toBeInTheDocument();
    expect(screen.getByText(/esc to close/i)).toBeInTheDocument();
  });

  test("clicking a row calls onSelect with that action, exactly once", async () => {
    const { onSelect } = renderCard({ promotedId: "quest" });

    await userEvent.click(screen.getByRole("menuitem", { name: "Location L" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "location" })
    );
  });

  test("clicking the promoted row calls onSelect with that action", async () => {
    const { onSelect } = renderCard({ promotedId: "quest" });

    await userEvent.click(screen.getByRole("menuitem", { name: /new quest/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "quest" }));
  });

  test("the root has role=menu and forwards its ref to the DOM node", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <CreateMenuCard
        ref={ref}
        actions={actions}
        promotedId="quest"
        isOnPromotedSection={false}
        campaignName="Curse of Strahd"
        creditedName="Elandra"
        onSelect={jest.fn()}
      />
    );

    const menu = screen.getByRole("menu", { name: "Create" });
    expect(ref.current).toBe(menu);
  });
});
