// src/shared/components/user-menu/PostingAsList.tsx
import React, { useState } from "react";
import { useAuth, useGroups, useUser } from "features/user-management";
import Typography from "core/components/Typography";
import { Check } from "lucide-react";
import clsx from "clsx";

/**
 * Props for {@link PostingAsList}.
 */
interface PostingAsListProps {
  /** Called after a switch succeeds, so the owning popover can close. */
  onSwitched: () => void;
}

/**
 * The "posting as" section of the account menu.
 *
 * Lets the user switch which character new content is credited to without
 * leaving the menu -- previously this meant opening the profile page and
 * scrolling to the Characters card. Switching writes `activeCharacterId`
 * through the same {@link useUser} path the profile page uses.
 *
 * A failed switch is reported inside this list rather than closing the
 * popover -- the pattern {@link ContextSwitcher} landed on after its own
 * error overlay outlived the surface it belonged to. Renders nothing when
 * the active membership has no characters, since there is then nothing to
 * choose between.
 */
const PostingAsList: React.FC<PostingAsListProps> = ({ onSwitched }) => {
  const { user } = useAuth();
  const { activeGroupUserProfile } = useGroups();
  const { updateGroupUserProfile } = useUser();

  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const characters = activeGroupUserProfile?.characters ?? [];
  const activeCharacterId = activeGroupUserProfile?.activeCharacterId ?? null;

  if (characters.length === 0) {
    return null;
  }

  const handleSelect = async (characterId: string) => {
    if (characterId === activeCharacterId || !user) return;

    setError(null);
    setSavingId(characterId);
    try {
      await updateGroupUserProfile(user.uid, { activeCharacterId: characterId });
      onSwitched();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not switch character."
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div role="none" className="p-2">
      <Typography
        variant="caption"
        color="muted"
        className="px-2 uppercase tracking-wide"
      >
        Posting as
      </Typography>

      <div role="group" aria-label="Posting as" className="mt-1">
        {characters.map((character) => {
          const isActive = character.id === activeCharacterId;
          return (
            <button
              key={character.id}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(character.id)}
              disabled={savingId === character.id}
              className={clsx(
                "flex items-center justify-between gap-2 px-2 py-2 w-full text-left rounded-md",
                isActive ? "dropdown-item-active" : "dropdown-item"
              )}
            >
              <Typography className="truncate">{character.name}</Typography>
              {isActive && <Check className="w-4 h-4 flex-shrink-0 accent" />}
            </button>
          );
        })}
      </div>

      {error && (
        <div role="none" className="px-2 py-2 mt-1 border-t card-divider">
          <Typography variant="body-sm" color="error">
            {error}
          </Typography>
        </div>
      )}
    </div>
  );
};

export default PostingAsList;
