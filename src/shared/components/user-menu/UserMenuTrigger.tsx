// src/shared/components/user-menu/UserMenuTrigger.tsx
import React, { forwardRef } from "react";
import { useGroups } from "features/user-management";
import Typography from "core/components/Typography";
import EntitySigil from "core/components/EntitySigil";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

/**
 * Props for {@link UserMenuTrigger}.
 */
interface UserMenuTriggerProps {
  /** Whether the popover it controls is open. */
  isOpen: boolean;
  /** Toggle the popover. */
  onToggle: () => void;
}

/**
 * The single named chip that replaces the header's hamburger button.
 *
 * Names the character currently posting -- the identity new content in this
 * group is credited to -- rather than the account's own username, because
 * that is the identity most decisions in the app actually depend on. Falls
 * back to the group username when no character is active, so the chip is
 * never blank.
 *
 * The mark beside the name is that same identity's sigil: a character's is
 * seeded on its character id, the account's on its uid. So the letter and the
 * hue always describe one identity, and switching who you post as changes both
 * -- the same seeds `PostingAsList`, `CharacterRow` and `SenderIdentity` use.
 */
const UserMenuTrigger = forwardRef<HTMLButtonElement, UserMenuTriggerProps>(
  ({ isOpen, onToggle }, ref) => {
    const { activeGroupUserProfile } = useGroups();

    const characters = activeGroupUserProfile?.characters ?? [];
    const activeCharacterId = activeGroupUserProfile?.activeCharacterId ?? null;
    const activeCharacter = characters.find(
      (character) => character.id === activeCharacterId
    );
    const displayName =
      activeCharacter?.name ?? activeGroupUserProfile?.username ?? "Account";
    const sigilId =
      activeCharacter?.id ?? activeGroupUserProfile?.userId ?? displayName;

    return (
      <button
        ref={ref}
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Account menu, posting as ${displayName}`}
        className={clsx(
          "flex items-center gap-2 px-2 py-1 rounded-md max-w-[10rem]",
          isOpen ? "dropdown-item-active" : "button-ghost"
        )}
      >
        <EntitySigil entityId={sigilId} name={displayName} />
        <Typography variant="body-sm" className="hidden nav:inline truncate font-semibold">
          {displayName}
        </Typography>
        <ChevronDown size={14} className="flex-shrink-0" />
      </button>
    );
  }
);

UserMenuTrigger.displayName = "UserMenuTrigger";

export default UserMenuTrigger;
