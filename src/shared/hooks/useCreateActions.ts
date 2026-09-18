// src/shared/hooks/useCreateActions.ts
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, FileText, MapPin, MessageSquare, Scroll, User } from "lucide-react";
import { useNavigation } from "../context/NavigationContext";
import { useQuickAdd } from "../context/QuickAddContext";
import { useCreateNote } from "features/collaboration";

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
  /** Perform the action. Async for the note, which is written before it opens. */
  run: () => void | Promise<void>;
}

/**
 * The six create commands, in literal top-to-bottom display order. Both
 * consuming surfaces — the create menu and the command palette — render this
 * array unreversed, so its order is exactly what each one shows.
 */
export function useCreateActions(): CreateAction[] {
  const { navigateToPage } = useNavigation();
  const { createAndOpen } = useCreateNote();
  const { openQuickAdd } = useQuickAdd();

  return useMemo(
    () => [
      { id: "note", entityLabel: "Note", icon: FileText, sectionPath: "/notes", shortcut: "N", run: () => createAndOpen() },
      { id: "chapter", entityLabel: "Chapter", icon: BookOpen, sectionPath: "/story", shortcut: "C", run: () => navigateToPage("/story/chapters/create") },
      // The three entities with a quick-add surface open it in place rather
      // than navigating to a create page. The route still exists and still
      // renders the same component -- note conversion and pasted links need a
      // destination -- but the menu no longer sends you to one.
      { id: "npc", entityLabel: "NPC", icon: User, sectionPath: "/npcs", shortcut: "P", run: () => openQuickAdd("npc") },
      { id: "location", entityLabel: "Location", icon: MapPin, sectionPath: "/locations", shortcut: "L", run: () => openQuickAdd("location") },
      // The rumour keeps its form: `15-1` item 9 leaves its composer row to
      // `15-7`, because `RumorForm` requires a third field a two-field
      // surface cannot supply without relaxing validation.
      { id: "rumor", entityLabel: "Rumor", icon: MessageSquare, sectionPath: "/rumors", shortcut: "R", run: () => navigateToPage("/rumors/create") },
      { id: "quest", entityLabel: "Quest", icon: Scroll, sectionPath: "/quests", shortcut: "Q", run: () => openQuickAdd("quest") },
    ],
    [navigateToPage, createAndOpen, openQuickAdd]
  );
}

export default useCreateActions;
