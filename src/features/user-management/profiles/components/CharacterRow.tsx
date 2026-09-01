// src/features/user-management/profiles/components/CharacterRow.tsx
import React from "react";
import clsx from "clsx";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import { Edit, Trash2, Star } from "lucide-react";
import { CharacterNameEntry } from "core/types/user";

interface CharacterRowProps {
  /** The character this row represents. */
  character: CharacterNameEntry;
  /** Whether this character is the one currently posting. */
  isActive: boolean;
  /** Whether a different row is mid-edit, which disables this row's edit button. */
  isEditingOther: boolean;
  /** Whether a mutation is in flight anywhere on the card. */
  saving: boolean;
  /** Sets this character as the active (posting-as) character. */
  onSetActive: () => void;
  /** Starts editing this character's name. */
  onEdit: () => void;
  /** Removes this character. */
  onDelete: () => void;
}

/**
 * One row in the characters list: the active-character star, the name, and
 * its unlabelled icon actions (Set Active, Edit, Delete).
 *
 * A behaviour-preserving extraction of the character-row markup that used to
 * be inlined in `UserProfile.tsx`'s `.map()`. Labelled actions and an inline
 * removal confirmation arrive in a later change.
 */
const CharacterRow: React.FC<CharacterRowProps> = ({
  character,
  isActive,
  isEditingOther,
  saving,
  onSetActive,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className={clsx(
        "flex items-center justify-between p-3 rounded-md",
        isActive ? "selected-item" : "selectable-item"
      )}
    >
      <div className="flex items-center">
        {isActive && <Star size={16} className="mr-2 accent" />}
        <Typography>{character.name}</Typography>
      </div>
      <div className="flex gap-2">
        {!isActive && (
          <Button type="button" variant="ghost" size="sm" onClick={onSetActive} disabled={saving}>
            Set Active
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          startIcon={<Edit size={16} />}
          disabled={saving || isEditingOther}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          startIcon={<Trash2 size={16} className="form-error" />}
          disabled={saving}
        />
      </div>
    </div>
  );
};

export default CharacterRow;
