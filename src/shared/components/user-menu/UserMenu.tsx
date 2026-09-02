// src/shared/components/user-menu/UserMenu.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGroups } from "features/user-management";
import { usePopoverKeys } from "shared/hooks/usePopoverKeys";
import Typography from "core/components/Typography";
import UserMenuTrigger from "./UserMenuTrigger";
import PostingAsList from "./PostingAsList";
import ThemeSegmented from "./ThemeSegmented";
import UserMenuLinks from "./UserMenuLinks";

/**
 * Props for {@link UserMenu}.
 */
interface UserMenuProps {
  /** Opens the admin panel dialog, owned by the header. */
  onOpenAdmin: () => void;
}

/**
 * The one named account menu that replaces the header's hamburger.
 *
 * A single chip (avatar, the posting-as character name, a chevron) opens a
 * popover carrying: a header block naming the account and its role in the
 * active group, the posting-as character list, the account theme, and the
 * links the hamburger used to spread across an icon grid.
 *
 * Follows {@link ContextSwitcher}'s shape: a popover anchored to its own
 * trigger rather than a modal, closed by a click outside or by
 * {@link usePopoverKeys}'s Escape/focus-trap contract.
 */
const UserMenu: React.FC<UserMenuProps> = ({ onOpenAdmin }) => {
  const { activeGroup, activeGroupUserProfile } = useGroups();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  usePopoverKeys({ isOpen, panelRef, triggerRef, onClose: close });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAdmin = activeGroupUserProfile?.role === "admin";
  const username = activeGroupUserProfile?.username ?? "";
  const groupName = activeGroup?.name ?? "";

  return (
    <div className="relative" ref={containerRef}>
      <UserMenuTrigger
        ref={triggerRef}
        isOpen={isOpen}
        onToggle={() => setIsOpen((previous) => !previous)}
      />

      {isOpen && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Account"
          className="dropdown absolute right-0 top-full mt-1 w-[17.75rem] max-w-[calc(100vw-2rem)] rounded-md shadow-lg z-20"
        >
          <div role="none" className="px-3 py-3 border-b card-divider">
            <Typography className="font-semibold truncate">{username}</Typography>
            <Typography variant="body-sm" color="secondary" className="truncate">
              {isAdmin ? `Admin in ${groupName}` : `Member in ${groupName}`}
            </Typography>
          </div>

          <PostingAsList onSwitched={close} />

          <div className="mx-2 border-t card-divider" />

          <div role="none" className="px-2 py-2">
            <Typography
              variant="caption"
              color="muted"
              className="px-2 uppercase tracking-wide"
            >
              Theme
            </Typography>
            <div className="mt-1 px-2">
              <ThemeSegmented />
            </div>
          </div>

          <div className="mx-2 border-t card-divider" />

          <UserMenuLinks open={isOpen} onClose={close} onOpenAdmin={onOpenAdmin} />
        </div>
      )}
    </div>
  );
};

export default UserMenu;
