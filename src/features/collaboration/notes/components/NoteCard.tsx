// src/features/collaboration/notes/components/NoteCard.tsx
import React from "react";
import { Note, EntityType } from "../types";
import Typography from "../../../../core/components/Typography";
import { displayTitle } from "../utils/note-title";
import { useNavigation } from "shared/hooks/useNavigation";

interface NoteCardProps {
  /** The note to display */
  note: Note;
  /** Invoked by the "Save now" action on an unsaved row */
  onSaveNow?: (noteId: string) => void;
}

/** Entity types in the order their chips are rendered, with their labels. */
const ENTITY_LABELS: Array<{ type: EntityType; one: string; many: string }> = [
  { type: "npc", one: "NPC", many: "NPCs" },
  { type: "location", one: "location", many: "locations" },
  { type: "quest", one: "quest", many: "quests" },
  { type: "rumor", one: "rumor", many: "rumors" },
];

/**
 * Absolute timestamp for a row, e.g. "2 June, 19:52".
 *
 * Rows are scanned, not read, so a fixed shape the eye can compare down the
 * column beats a relative phrase whose width changes per row.
 */
function formatRowTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Small pill used for both entity counts and tags. */
const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2 py-0.5 rounded text-xs bg-secondary card-border">
    {children}
  </span>
);

/**
 * One row in the notes index.
 *
 * A two-column grid: the note itself on the left (title, two-line preview,
 * entity and tag chips), its timestamp and any row action on the right.
 *
 * The preview is truncated by `line-clamp-2` and nothing else. This component
 * used to also cut the content to 150 characters and append an ellipsis; the
 * two truncations fought and the ellipsis frequently landed off-screen.
 */
const NoteCard: React.FC<NoteCardProps> = ({ note, onSaveNow }) => {
  const { navigateToPage } = useNavigation();

  const handleViewNote = () => {
    navigateToPage(`/notes/${note.id}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleViewNote();
    }
  };

  const handleSaveNow = (event: React.MouseEvent<HTMLButtonElement>) => {
    // The whole row navigates; the action inside it must not.
    event.stopPropagation();
    onSaveNow?.(note.id);
  };

  const title = displayTitle(note);

  // Counts of the entities already stored on the note. Computed here since
  // this redesign began -- previously computed on every render and discarded.
  const entityChips = ENTITY_LABELS.map(({ type, one, many }) => {
    const count = note.extractedEntities.filter(entity => entity.type === type).length;
    return count > 0 ? `${count} ${count === 1 ? one : many}` : null;
  }).filter((label): label is string => label !== null);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title ?? "Untitled note"}
      onClick={handleViewNote}
      onKeyDown={handleKeyDown}
      className={`note-card grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4 px-5 py-4 cursor-pointer transition-colors ${
        note.isUnsaved ? "border-l-[3px] border-l-current status-unknown" : ""
      }`}
    >
      {/* Left: the note itself */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {title ? (
            <Typography variant="body" className="font-semibold text-[17px]">
              {title}
            </Typography>
          ) : (
            <Typography variant="body" color="muted" className="font-semibold text-[17px]">
              Untitled note
            </Typography>
          )}

          {note.isUnsaved && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary status-unknown">
              Not saved yet
            </span>
          )}

          {note.status === "archived" && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary typography-secondary">
              Archived
            </span>
          )}
        </div>

        {note.content && (
          <Typography
            variant="body-sm"
            color="secondary"
            className="line-clamp-2 mt-1"
          >
            {note.content}
          </Typography>
        )}

        {(entityChips.length > 0 || note.tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {entityChips.map(label => (
              <Chip key={label}>{label}</Chip>
            ))}
            {note.tags.map(tag => (
              <Chip key={tag}>{tag}</Chip>
            ))}
          </div>
        )}
      </div>

      {/* Right: timestamp and row action */}
      <div className="sm:text-right">
        <Typography variant="body-sm" color="muted" className="text-[13px]">
          {formatRowTimestamp(note.updatedAt)}
        </Typography>

        {note.isUnsaved && onSaveNow && (
          <button
            type="button"
            onClick={handleSaveNow}
            className="mt-1 text-[13px] font-medium status-unknown hover:underline"
          >
            Save now
          </button>
        )}
      </div>
    </div>
  );
};

export default NoteCard;
