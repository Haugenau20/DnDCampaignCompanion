// src/shared/components/GlobalActionButton.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { Plus } from "lucide-react";
import { useCampaigns, useGroups } from "features/user-management";
import { useCreateActions } from "shared/hooks/useCreateActions";
import type { CreateAction } from "shared/hooks/useCreateActions";
import { useCampaignContextStatus } from "shared/hooks/useCampaignContextStatus";
import { usePopoverKeys } from "shared/hooks/usePopoverKeys";
import { isParentPath } from "shared/utils/navigation";
import CreateMenuCard from "shared/components/create-menu/CreateMenuCard";

/**
 * The floating "create" button anchored to the bottom-right corner.
 *
 * Owns gating, open/close state, keyboard behaviour, route-aware row
 * promotion and the trigger itself. The popover's visible content --
 * headings, rows, the promoted row, the footer credit line -- is
 * {@link CreateMenuCard}, a presentational component this one drives.
 */
const GlobalActionButton: React.FC = () => {
  // `useCampaignContextStatus` rather than a hand-rolled
  // `user && activeGroupId && activeCampaignId`: it already distinguishes
  // "still resolving auth/group/campaign restore" from "resolved to nothing
  // selected" (bug #1413). A hand-rolled check can't tell those apart, so on
  // a fresh page load it would flash this button for a signed-out visitor
  // (or a signed-in one with nothing selected yet) for the one render before
  // restoration catches up -- exactly the bug this rewrite exists to fix,
  // not just relocate.
  const { hasRequiredContext } = useCampaignContextStatus();

  const { pathname } = useLocation();
  const actions = useCreateActions();
  const { activeCampaign } = useCampaigns();
  const { activeGroupUserProfile } = useGroups();

  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  usePopoverKeys({ isOpen, panelRef, triggerRef, onClose: closeMenu });

  // Close on an outside click. `usePopoverKeys` deliberately does not cover
  // this -- copied from `ContextSwitcher`'s identical effect.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Run a create action and close the menu immediately, in this same click's
   * render pass -- for all six actions, including the note.
   *
   * `action.run()` is deliberately fire-and-forget here, not awaited: the
   * note action writes the note and navigates to it in the background, after
   * the menu has already closed. This matches the pre-refactor behaviour
   * exactly (see `git show d4addb0:src/shared/components/GlobalActionButton.tsx`),
   * where `onClick()` was called without awaiting and `setIsOpen(false)` ran
   * unconditionally on the next line. Do not "helpfully" add an `await` --
   * that defers the close for every action, which is a real, user-visible
   * regression, not a cleanup.
   */
  const handleSelect = useCallback((action: CreateAction) => {
    action.run();
    setIsOpen(false);
  }, []);

  // Single-letter shortcuts, active only while the menu is open.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore modified keystrokes: Ctrl/Cmd/Alt combinations are almost
      // always a browser or OS shortcut (Ctrl+N, Cmd+R, an AltGr-typed
      // character in some keyboard layouts), not a request to fire a create
      // shortcut, and must be left alone rather than hijacked.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Ignore keystrokes typed into a text field. Nothing in this popover
      // is editable today, but a bare letter key typed anywhere else on the
      // page (a note editor, a form input) must not be hijacked as a create
      // shortcut just because the menu happens to be open.
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      const match = actions.find(
        (action) => action.shortcut.toLowerCase() === event.key.toLowerCase()
      );
      if (!match) return;

      event.preventDefault();
      handleSelect(match);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, actions, handleSelect]);

  // Rules of hooks: every hook above runs on every render, regardless of
  // `hasRequiredContext`. The gate is a plain early return placed after all
  // of them, never a conditional around any hook call.
  if (!hasRequiredContext) return null;

  const matchedAction = actions.find((action) => isParentPath(pathname, action.sectionPath));
  const promoted = matchedAction ?? actions.find((action) => action.id === "note") ?? actions[0];
  const isOnPromotedSection = !!matchedAction;

  const characters = activeGroupUserProfile?.characters ?? [];
  const activeCharacterId = activeGroupUserProfile?.activeCharacterId ?? null;
  const activeCharacter = characters.find((character) => character.id === activeCharacterId);
  // Same derivation `UserMenuTrigger` uses: the character currently posting,
  // falling back to the account username, then to a generic "you" so the
  // credit line is never blank.
  const creditedName =
    activeCharacter?.name ?? activeGroupUserProfile?.username ?? "you";

  return (
    <div className="fixed right-6 bottom-6 z-40" ref={wrapperRef}>
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-3">
          <CreateMenuCard
            ref={panelRef}
            actions={actions}
            promotedId={promoted?.id ?? "note"}
            isOnPromotedSection={isOnPromotedSection}
            campaignName={activeCampaign?.name ?? ""}
            creditedName={creditedName}
            onSelect={handleSelect}
          />
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close create menu" : "Create content"}
        className="w-12 h-12 rounded-full button-primary shadow-lg flex items-center justify-center"
      >
        {/*
          One icon, always -- no Plus/X swap. The pre-rewrite trigger rotated
          90deg AND swapped Plus for X over 500ms. A plus has four-fold
          rotational symmetry, so a 90deg spin animates nothing visible; the
          glyph underneath just changes mid-transition, which reads as a
          flicker rather than a transformation. Rotating 45deg instead turns
          the same Plus into a visually distinct X-like shape with a single
          continuous glyph, so nothing needs to be swapped.
        */}
        <Plus
          className={clsx("transition-transform duration-200", isOpen && "rotate-45")}
        />
      </button>
    </div>
  );
};

export default GlobalActionButton;
