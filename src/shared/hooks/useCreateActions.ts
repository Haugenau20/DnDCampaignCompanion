// src/shared/hooks/useCreateActions.ts
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, FileText, MapPin, MessageSquare, Scroll, User } from "lucide-react";
import { useNavigation } from "../context/NavigationContext";
import { useQuickAdd } from "../context/QuickAddContext";
import { useCreateNote } from "features/collaboration";
import { useCreateRumor } from "features/campaign-entities";

/**
 * One entry in the single list of "create a new X" commands.
 *
 * Shared by the floating action button and the command palette so the two
 * cannot drift. Both the label and the icon size are left to the caller:
 * `icon` is the component, not an element, and `entityLabel` is the bare noun
 * from which each surface builds its own copy.
 */
export interface CreateAction {
  /** Stable key, e.g. "npc". */
  id: string;
  /** The entity's display noun, e.g. "NPC". */
  entityLabel: string;
  /** The icon component. Callers size it themselves. */
  icon: LucideIcon;
  /** The section this entity lives in, e.g. "/quests". Picks the contextual row. */
  sectionPath: string;
  /** Single-letter shortcut, active only while the create menu is open. */
  shortcut: string;
  /**
   * Whether `run` uses a name it is given. The command palette offers
   * "New NPC named …" only for these; promising the typed query and then
   * opening a blank form is T097. Absent means it does not.
   */
  takesName?: boolean;
  /**
   * Perform the action. Async for the note, which is written before it opens.
   * `name` pre-fills the new record's name or title where `takesName` is set.
   */
  run: (name?: string) => void | Promise<void>;
}

/**
 * The six create commands, in literal top-to-bottom display order. Both
 * consuming surfaces — the create menu and the command palette — render this
 * array unreversed, so its order is exactly what each one shows.
 */
export function useCreateActions(): CreateAction[] {
  const { navigateToPage } = useNavigation();
  const { createAndOpen } = useCreateNote();
  const { createAndOpen: createAndOpenRumor } = useCreateRumor();
  const { openQuickAdd } = useQuickAdd();

  return useMemo(() => {
    /** Quick add for one entity, with the name pre-filled when there is one. */
    const quickAdd = (entity: "npc" | "location" | "quest") => (name?: string) =>
      name ? openQuickAdd(entity, { initialName: name }) : openQuickAdd(entity);

    return [
      // A note's title is derived from its first line, and the chapter form
      // has no way in for one, so neither takes a name.
      { id: "note", entityLabel: "Note", icon: FileText, sectionPath: "/notes", shortcut: "N", takesName: false, run: () => createAndOpen() },
      { id: "chapter", entityLabel: "Chapter", icon: BookOpen, sectionPath: "/story", shortcut: "C", takesName: false, run: () => navigateToPage("/story/chapters/create") },
      // The three entities with a quick-add surface open it in place rather
      // than navigating to a create page. The route still exists and still
      // renders the same component -- note conversion and pasted links need a
      // destination -- but the menu no longer sends you to one.
      { id: "npc", entityLabel: "NPC", icon: User, sectionPath: "/npcs", shortcut: "P", takesName: true, run: quickAdd("npc") },
      { id: "location", entityLabel: "Location", icon: MapPin, sectionPath: "/locations", shortcut: "L", takesName: true, run: quickAdd("location") },
      // The rumour has no page and no dialog, so it has no destination to be
      // sent to: it is written on arrival and its row opens in the list.
      // `15-1` deferred this because `RumorForm` demanded a third field a
      // two-field surface could not supply; `15-9` retired the form.
      { id: "rumor", entityLabel: "Rumour", icon: MessageSquare, sectionPath: "/rumors", shortcut: "R", takesName: true, run: (name?: string) => createAndOpenRumor(name) },
      { id: "quest", entityLabel: "Quest", icon: Scroll, sectionPath: "/quests", shortcut: "Q", takesName: true, run: quickAdd("quest") },
    ];
  }, [navigateToPage, createAndOpen, createAndOpenRumor, openQuickAdd]);
}

export default useCreateActions;
