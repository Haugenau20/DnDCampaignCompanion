// src/shared/components/user-menu/UserMenuTrigger.tsx
import React, { forwardRef } from "react";
import { useGroups } from "features/user-management";
import Typography from "core/components/Typography";
import { ChevronDown, User } from "lucide-react";
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
        <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary">
          <User size={16} className="accent" />
        </span>
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
