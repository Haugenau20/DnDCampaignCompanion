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
  /** Perform the action. Async for the note, which is written before it opens. */
  run: () => void | Promise<void>;
}

/**
 * The six create commands, in the order the floating action button renders
 * them. That order is load-bearing: the button lays them out with
 * `flex-col-reverse`, so reordering this array silently reorders its menu.
 */
export function useCreateActions(): CreateAction[] {
  const { navigateToPage } = useNavigation();
  const { createAndOpen } = useCreateNote();

  return useMemo(
    () => [
      { id: "note", entityLabel: "Note", icon: FileText, run: () => createAndOpen() },
      { id: "location", entityLabel: "Location", icon: MapPin, run: () => navigateToPage("/locations/create") },
      { id: "npc", entityLabel: "NPC", icon: User, run: () => navigateToPage("/npcs/create") },
      { id: "rumor", entityLabel: "Rumor", icon: MessageSquare, run: () => navigateToPage("/rumors/create") },
      { id: "quest", entityLabel: "Quest", icon: Scroll, run: () => navigateToPage("/quests/create") },
      { id: "chapter", entityLabel: "Chapter", icon: BookOpen, run: () => navigateToPage("/story/chapters/create") },
    ],
    [navigateToPage, createAndOpen]
  );
}

export default useCreateActions;
