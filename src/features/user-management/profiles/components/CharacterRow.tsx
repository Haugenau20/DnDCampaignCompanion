// src/features/user-management/profiles/components/CharacterRow.tsx
import React, { useEffect, useState } from "react";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import Input from "core/components/Input";
import { AlertCircle, Star } from "lucide-react";
import { CharacterNameEntry } from "core/types/user";

/**
 * Props for {@link CharacterRow}.
 */
interface CharacterRowProps {
  /** The character this row represents. */
  character: CharacterNameEntry;
  /** Whether this character is the one currently posting. */
  isActive: boolean;
  /** Whether this row is currently showing its inline rename input. */
  isRenaming: boolean;
  /** Whether a different row is mid-rename, which disables this row's Rename control. */
  renameDisabled: boolean;
  /** Whether a mutation is in flight anywhere on the card. */
  saving: boolean;
  /** This row's own failure message, if its last mutation on it failed. */
  error?: string;
  /** Sets this character as the active (posting-as) character. */
  onSetActive: () => void;
  /** Starts renaming this character, in the row. */
  onStartRename: () => void;
  /** Confirms the rename with the trimmed name typed into the row's input. */
  onConfirmRename: (name: string) => void | Promise<unknown>;
  /** Cancels an in-progress rename, leaving the character's name unchanged. */
  onCancelRename: () => void;
  /** Removes this character, once the inline confirmation has been accepted. */
  onRemove: () => void | Promise<unknown>;
}

/**
 * One row in the characters list.
 *
 * A row renders one of three views: its normal state (a star and a muted
 * "posting as" marker when it is the active character, the name, and the
 * labelled `Post as this` / `Rename` / `Remove` actions), an inline rename
 * (its own input with `Save` / `Cancel`), or an inline removal confirmation
 * (`Remove {name}?` with `Remove` / `Cancel`). All three live on the row
 * itself: renaming never touches the card's add field, and removal never
 * opens a dialog -- it is one destructive click on a list item, unlike
 * leaving a group or deleting an account. The row also renders its own
 * failure message, keyed to it by {@link useCharacterRoster}'s `rowErrors`.
 */
const CharacterRow: React.FC<CharacterRowProps> = ({
  character,
  isActive,
  isRenaming,
  renameDisabled,
  saving,
  error,
  onSetActive,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onRemove,
}) => {
  const [renameValue, setRenameValue] = useState(character.name);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // Reset the input's draft to the current name every time the row enters
  // rename mode, so a previous cancelled edit never resurfaces.
  useEffect(() => {
    if (isRenaming) {
      setRenameValue(character.name);
    }
  }, [isRenaming, character.name]);

  const handleConfirmRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    onConfirmRename(trimmed);
  };

  const handleConfirmRemove = async () => {
    await onRemove();
    setConfirmingRemove(false);
  };

  const errorSlot = error && (
    <div className="flex items-center gap-2 form-error">
      <AlertCircle size={16} />
      <Typography color="error">{error}</Typography>
    </div>
  );

  if (isRenaming) {
    return (
      <div data-testid={`character-row-${character.id}`}>
        <div className="flex items-center gap-2 p-3 rounded-md selectable-item">
          <Input
            aria-label={`Rename ${character.name}`}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            disabled={saving}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancelRename} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmRename}
              disabled={!renameValue.trim() || saving}
              isLoading={saving}
            >
              Save
            </Button>
          </div>
        </div>
        {errorSlot}
      </div>
    );
  }

  if (confirmingRemove) {
    return (
      <div data-testid={`character-row-${character.id}`}>
        <div className="flex items-center justify-between p-3 rounded-md selectable-item">
          <Typography color="error">Remove {character.name}?</Typography>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingRemove(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="typography-error"
              onClick={handleConfirmRemove}
              disabled={saving}
              isLoading={saving}
            >
              Remove
            </Button>
          </div>
        </div>
        {errorSlot}
      </div>
    );
  }

  return (
    <div data-testid={`character-row-${character.id}`}>
      <div className="flex items-center justify-between p-3 rounded-md selectable-item">
        <div className="flex items-center gap-2">
          {isActive && <Star size={16} className="accent" aria-hidden="true" />}
          <Typography>{character.name}</Typography>
          {isActive && (
            <Typography variant="caption" className="accent">
              posting as
            </Typography>
          )}
        </div>
        <div className="flex gap-2">
          {!isActive && (
            <Button type="button" variant="ghost" size="sm" onClick={onSetActive} disabled={saving}>
              Post as this
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onStartRename}
            disabled={saving || renameDisabled}
          >
            Rename
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="typography-error"
            onClick={() => setConfirmingRemove(true)}
            disabled={saving}
          >
            Remove
          </Button>
        </div>
      </div>
      {errorSlot}
    </div>
  );
};

export default CharacterRow;
