// src/shared/hooks/useCreateActions.ts
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, FileText, MapPin, MessageSquare, Scroll, User } from "lucide-react";
import { useNavigation } from "../context/NavigationContext";
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

  return useMemo(
    () => [
      { id: "note", entityLabel: "Note", icon: FileText, sectionPath: "/notes", shortcut: "N", run: () => createAndOpen() },
      { id: "chapter", entityLabel: "Chapter", icon: BookOpen, sectionPath: "/story", shortcut: "C", run: () => navigateToPage("/story/chapters/create") },
      { id: "npc", entityLabel: "NPC", icon: User, sectionPath: "/npcs", shortcut: "P", run: () => navigateToPage("/npcs/create") },
      { id: "location", entityLabel: "Location", icon: MapPin, sectionPath: "/locations", shortcut: "L", run: () => navigateToPage("/locations/create") },
      { id: "rumor", entityLabel: "Rumor", icon: MessageSquare, sectionPath: "/rumors", shortcut: "R", run: () => navigateToPage("/rumors/create") },
      { id: "quest", entityLabel: "Quest", icon: Scroll, sectionPath: "/quests", shortcut: "Q", run: () => navigateToPage("/quests/create") },
    ],
    [navigateToPage, createAndOpen]
  );
}

export default useCreateActions;
