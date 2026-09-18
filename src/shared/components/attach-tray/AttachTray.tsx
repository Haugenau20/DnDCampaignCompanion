// src/shared/components/attach-tray/AttachTray.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Plus, X } from "lucide-react";
import Button from "core/components/Button";
import Input from "core/components/Input";
import Typography from "core/components/Typography";
import { EntitySigil } from "core/components/EntitySigil";
import { useQuickAdd } from "shared/context/QuickAddContext";
import { isQuickAddEntity } from "shared/components/quick-add/quickAddSpecs";
import {
  ATTACH_KIND_EMPTY_LABELS,
  ATTACH_KIND_NEW_LABELS,
  buildCandidates,
  filterCandidates,
  groupCandidates,
  type AttachCandidate,
  type AttachKind,
  type AttachSources,
} from "./attachCandidates";

export interface AttachTrayProps {
  /** The collections to offer. More than one groups the list. */
  kinds: readonly AttachKind[];
  /** The collections themselves, from the providers that already own them. */
  sources: AttachSources;
  /** What is attached now, in the order the record stores it. */
  attachedIds: readonly string[];
  onAttach: (id: string, kind: AttachKind) => void;
  onDetach: (id: string) => void;
  /** Never offer these -- the record being edited, and any invalid choice. */
  excludeIds?: readonly string[];
  /**
   * A single-valued relation: attaching replaces rather than adds, and the
   * tray closes once something is picked.
   */
  single?: boolean;
  /**
   * Override the escape hatch. Left alone, the tray opens quick add itself
   * with the relation pre-wired and attaches whatever is created (§5 item 7),
   * so every tray gets the hatch without each call site wiring it.
   */
  onCreateNew?: (kind: AttachKind) => void;
  /**
   * Whether the tray draws its own chips for what is already attached.
   *
   * On by default, because §5 wants the picked set visible above the list the
   * whole time. An entity page turns it off: `/quests/:questId` and
   * `/locations/:locationId` already list the attached records in full -- with
   * the occupation and place that tell two NPCs apart -- and a chip repeating
   * each name below that list is the same person twice on one screen, which is
   * exactly the defect `D15.7` exists to remove.
   *
   * The tray is still *told* what is attached either way, so its own rows say
   * "Attached" rather than offering to attach someone who already is.
   */
  showAttachedChips?: boolean;
  /** The trigger's label. "Attach" everywhere, which is the point (§5 item 9). */
  triggerLabel?: string;
  /** Names the tray for assistive technology, e.g. "Who is in it". */
  ariaLabel?: string;
  className?: string;
}

/**
 * One browse-first relation picker, replacing every relation control in the
 * product.
 *
 * **Browsing what exists is the primary act, and typing is never the price of
 * attaching something.** That is a direct constraint from the maintainer and it
 * decides the shape: a list of what exists, opened in place under the field it
 * fills, with a filter box as an accelerator. It is not a typeahead -- mid
 * session you attach the NPC you can see, not the one you can spell.
 *
 * It is deliberately **not** a dialog. It fails Phase 14 §1 question 1: it is
 * *part of* the form behind it rather than a decision about it, so it stays in
 * the form's own tree. Below the phone breakpoint it becomes a bottom sheet,
 * but by CSS alone -- it never moves into a portal, because that would make it
 * the overlay the rule forbids.
 */
export const AttachTray: React.FC<AttachTrayProps> = ({
  kinds,
  sources,
  attachedIds,
  onAttach,
  onDetach,
  excludeIds,
  single = false,
  showAttachedChips = true,
  onCreateNew,
  triggerLabel = "Attach",
  ariaLabel,
  className,
}) => {
  const { openQuickAdd } = useQuickAdd();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const all = useMemo(
    () => buildCandidates(kinds, sources, { attachedIds, excludeIds }),
    [kinds, sources, attachedIds, excludeIds]
  );
  const visible = useMemo(() => filterCandidates(all, query), [all, query]);
  const groups = useMemo(() => groupCandidates(visible), [visible]);
  const showGroupHeadings = kinds.length > 1;

  /** The attached records, resolved to names -- an id is never a label (§5). */
  const attached = useMemo(() => {
    const byId = new Map(all.map((candidate) => [candidate.id, candidate]));
    return attachedIds
      .map((id) => byId.get(id))
      .filter((candidate): candidate is AttachCandidate => Boolean(candidate));
  }, [all, attachedIds]);

  // Keep the roving focus inside the list when filtering shortens it.
  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(visible.length - 1, 0)));
  }, [visible.length]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
    triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(
    (candidate: AttachCandidate) => {
      if (candidate.attached) {
        onDetach(candidate.id);
        return;
      }
      onAttach(candidate.id, candidate.kind);
      // A single-valued relation is one decision, so the tray has nothing
      // further to offer once it is made.
      if (single) close();
    },
    [onAttach, onDetach, single, close]
  );

  /** Move the roving focus, and take DOM focus with it. */
  const moveActive = useCallback(
    (next: number) => {
      setActiveIndex(next);
      // Imperative on purpose. An effect keyed on the list would also fire
      // when *filtering* shortened it, which pulls focus out of the filter box
      // on the first keystroke and sends the rest of the word to the list.
      const rows = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
      rows?.[next]?.focus();
    },
    []
  );

  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        // Escape closes the tray and must not reach the form behind it, which
        // would discard whatever else is being edited.
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (visible.length === 0) return;
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const next = activeIndex + step;
        moveActive(next < 0 ? visible.length - 1 : next >= visible.length ? 0 : next);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        const candidate = visible[activeIndex];
        if (!candidate) return;
        event.preventDefault();
        toggle(candidate);
      }
    },
    [visible, activeIndex, toggle, close, moveActive]
  );

  /**
   * "No such person yet — add one".
   *
   * Only for the kinds quick add can create: `15-1` leaves the rumour on its
   * own form, so a rumour tray offers no hatch rather than one that opens
   * nothing.
   */
  const primaryKind = kinds[0];
  const createNew =
    onCreateNew ??
    (isQuickAddEntity(primaryKind)
      ? (kind: AttachKind) =>
          openQuickAdd(primaryKind as Parameters<typeof openQuickAdd>[0], {
            // Attach what was just created and stay put: the point of the
            // hatch is to unblock the form you are already filling.
            onCreated: (id) => onAttach(id, kind),
          })
      : undefined);

  const renderRow = (candidate: AttachCandidate) => {
    const index = visible.indexOf(candidate);
    return (
      <div
        key={`${candidate.kind}-${candidate.id}`}
        role="option"
        aria-selected={candidate.attached}
        tabIndex={index === activeIndex ? 0 : -1}
        data-active={index === activeIndex}
        onClick={() => toggle(candidate)}
        onFocus={() => setActiveIndex(index)}
        className={clsx(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          candidate.attached ? "bg-accent" : "hover:bg-card"
        )}
      >
        <EntitySigil entityId={candidate.id} name={candidate.name} size={24} />
        <span className="min-w-0 flex-1">
          {/* The entity's name is the campaign's voice (design language §4). */}
          <span className="font-heading block truncate">{candidate.name}</span>
          {candidate.line && (
            <Typography variant="body-sm" color="secondary" className="block truncate">
              {candidate.line}
            </Typography>
          )}
        </span>
        <span className="shrink-0 text-accent text-sm">
          {candidate.attached ? "Attached" : "Attach"}
        </span>
      </div>
    );
  };

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      {/*
        The already-picked chips stay visible above the list the whole time
        (§5). Removing a chip and un-attaching a row are the same operation.
      */}
      {showAttachedChips && attached.length > 0 && (
        <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
          {attached.map((candidate) => (
            <li key={candidate.id}>
              <span className="inline-flex items-center gap-2 pl-2 pr-1 py-1 rounded-full chip">
                <EntitySigil entityId={candidate.id} name={candidate.name} size={16} />
                <span className="font-heading text-sm">{candidate.name}</span>
                <button
                  type="button"
                  onClick={() => onDetach(candidate.id)}
                  aria-label={`Detach ${candidate.name}`}
                  className="button-ghost rounded-full p-0.5"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/*
        The trigger stays mounted while the tray is open: it is what focus
        returns to when the tray closes, and unmounting it would leave focus on
        `<body>` with the next Tab starting from the top of the page.
      */}
      <div>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          size="sm"
          startIcon={<Plus size={16} />}
          onClick={() => (isOpen ? close() : setIsOpen(true))}
          aria-expanded={isOpen}
          // The visible verb is one word everywhere (§5 item 9), but a form
          // can carry three of these, and three buttons called "Attach" are
          // indistinguishable to a screen reader. The accessible name still
          // *contains* the visible label, which is what WCAG 2.5.3 asks, so
          // voice control still matches on "Attach".
          aria-label={ariaLabel ? `${triggerLabel} to ${ariaLabel}` : undefined}
        >
          {triggerLabel}
        </Button>
      </div>

      {isOpen && (
        <div
          className={clsx(
            // In place on a desktop; a bottom sheet below `sm`, by CSS alone so
            // the tray never leaves the form's own tree.
            "rounded-lg p-3 bg-secondary",
            "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-40",
            "max-sm:rounded-b-none max-sm:max-h-[70vh] max-sm:overflow-y-auto max-sm:shadow-xl"
          )}
          onKeyDown={handleListKeyDown}
        >
          <div className="flex items-center gap-2 mb-2">
            <Typography variant="body-sm" color="secondary" className="uppercase tracking-wide">
              Attach from the campaign
            </Typography>
            <div className="ml-auto flex items-center gap-2">
              {/*
                An accelerator, never focused by default: autofocusing it turns
                a browse into a search by accident, which is the thing this
                component exists to stop.
              */}
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter…"
                aria-label="Filter the list"
                size="sm"
                className="w-32"
              />
              {/*
                Not a `Done` button: §5 item 6 retires that control precisely
                because every toggle has already applied, so "Done" claims to
                commit something it does not. This only closes the list.
              */}
              <Button type="button" variant="ghost" size="sm" onClick={close}>
                Close
              </Button>
            </div>
          </div>

          <div
            ref={listRef}
            role="listbox"
            aria-multiselectable={!single}
            aria-label={ariaLabel ?? "Attach from the campaign"}
            className="flex flex-col gap-0.5 max-h-72 overflow-y-auto"
          >
            {groups.length === 0 && (
              <Typography variant="body-sm" color="secondary" className="px-3 py-4">
                {all.length === 0
                  ? ATTACH_KIND_EMPTY_LABELS[kinds[0]]
                  : `Nothing matches “${query.trim()}”.`}
              </Typography>
            )}

            {groups.map((group) => (
              <React.Fragment key={group.kind}>
                {showGroupHeadings && (
                  <Typography
                    variant="body-sm"
                    color="secondary"
                    className="px-3 pt-2 pb-1 uppercase tracking-wide"
                    role="presentation"
                  >
                    {group.label}
                  </Typography>
                )}
                {group.candidates.map(renderRow)}
              </React.Fragment>
            ))}
          </div>

          {/*
            The escape hatch. Always reachable, including from an empty
            collection -- §8's designed empty state is this, not a blank box.
          */}
          {createNew && (
            <div className="pt-2 mt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => createNew(primaryKind)}
              >
                {ATTACH_KIND_NEW_LABELS[kinds[0]]}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttachTray;
