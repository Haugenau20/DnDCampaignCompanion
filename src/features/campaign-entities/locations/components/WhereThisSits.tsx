// src/features/campaign-entities/locations/components/WhereThisSits.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import Typography from 'core/components/Typography';
import EntitySigil from 'core/components/EntitySigil';
import AttachTray from 'shared/components/attach-tray/AttachTray';
import { usePendingWrite } from 'shared/components/row-controls/usePendingWrite';
import { EntityPageSection, FieldPrompt } from 'shared/components/entity-page';
import { Location } from '../types';
import {
  buildLocationIndex,
  childrenOf,
  invalidParentIdsFor,
  parentIdOf,
  siblingsOf,
} from '../utils/location-tree';
import { formatLocationStatus, formatLocationType } from '../utils/location-presentation';

export interface WhereThisSitsProps {
  location: Location;
  /** Every location in the campaign, from the provider that owns them. */
  locations: readonly Location[];
  /** Move this location under `parentId`, or to the top level with `undefined`. */
  onMove: (parentId: string | undefined) => Promise<unknown>;
  /** Open quick add with this location pre-set as the parent. */
  onAddInside: () => void;
  onOpen: (locationId: string) => void;
  /** False when nobody is signed in, or no campaign is picked. */
  canAct?: boolean;
  /**
   * Take the caret on mount, and scroll here.
   *
   * `15-1` records that quick add sends `quickAddFocus` in router state naming
   * the first unwritten field, and that consuming it belongs to the pages. A
   * location's is `parent`, and this is where a parent is chosen.
   */
  focusParent?: boolean;
}

/** One line in the module. The name opens; everything else is context. */
const TreeLine: React.FC<{
  location?: Location;
  /** 0 for the parent, 1 for self and siblings, 2 for what is inside. */
  depth: number;
  /** "the parent", "you are here", "a sibling" -- or a knowledge step. */
  note?: string;
  self?: boolean;
  onOpen?: () => void;
  children?: React.ReactNode;
}> = ({ location, depth, note, self = false, onOpen, children }) => (
  <div
    className={clsx(
      'flex items-center gap-2 py-2 px-3 rounded-md min-h-[44px] sm:min-h-[38px]',
      // The rail, not a box. Design language §5: rules inside a card read as
      // one object with parts, which is exactly what the nested record cards
      // this module replaces did not.
      depth > 0 && 'border-l card-border',
      self && 'bg-secondary'
    )}
    style={{ marginLeft: depth * 24 }}
  >
    {location && (
      <EntitySigil entityId={location.id} name={location.name} size={20} className="shrink-0" />
    )}
    {children ?? (
      <>
        {/*
          The name is a target here for the same reason it is in the directory
          row: it is the thing a reader points at. `Open` stays beside it
          because this module is read as a map, and a map needs a visible way
          out of each line.
        */}
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="font-heading truncate text-left rounded-md px-1 -mx-1 selectable-item"
          >
            {location?.name}
          </button>
        ) : (
          <span className={clsx('font-heading truncate', self && 'font-semibold')}>
            {location?.name}
          </span>
        )}
        {note && (
          <Typography variant="body-sm" color="secondary" className="text-xs truncate">
            {note}
          </Typography>
        )}
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="ml-auto shrink-0 flex items-center gap-1 text-sm selectable-item rounded-md px-2 py-1"
          >
            Open
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        )}
      </>
    )}
  </div>
);

/**
 * "Where this sits" -- parent, self, what is inside, and siblings at reduced
 * emphasis.
 *
 * **Three levels at once, always exactly three, however deep the data goes.**
 * This is the module a row deliberately does not carry (§6.2) and the whole
 * reason a location earns a page: the directory used to answer "what is inside
 * this?" by expanding a parent into a full record card, printing a heading, and
 * nesting a *child record card* inside it -- two records at identical weight,
 * unbounded as depth grows.
 *
 * Every walk it does is guarded. `location-tree.ts` carries the visited sets
 * and the depth cap, because this module is where cycles become reachable:
 * before `15-4` nothing in the product could choose a parent.
 */
export const WhereThisSits: React.FC<WhereThisSitsProps> = ({
  location,
  locations,
  onMove,
  onAddInside,
  onOpen,
  canAct = true,
  focusParent = false,
}) => {
  const { isPending, error, run } = usePendingWrite();
  const trayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusParent) return;
    const trigger = trayRef.current?.querySelector('button');
    // jsdom has no `scrollIntoView`, so this is called optionally rather than
    // guarded by an environment check -- moving the caret is the part that
    // matters, and it must not be lost to a missing scroll implementation.
    trigger?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    trigger?.focus();
  }, [focusParent]);

  const index = useMemo(() => buildLocationIndex(locations), [locations]);
  const parentId = parentIdOf(location);
  const parent = parentId ? index.byId.get(parentId) : undefined;
  const children = useMemo(() => childrenOf(index, location.id), [index, location.id]);
  const siblings = useMemo(
    () => siblingsOf(locations, location.id, index),
    [locations, location.id, index]
  );

  /**
   * Self, and everything inside it, at any depth.
   *
   * §6.2 and item 3: an invalid parent must be **unofferable**. Today's edit
   * form offers a combobox that accepts any value and then silently blanks a
   * parent that fails validation, so choosing a descendant loses the parent the
   * record already had and says nothing.
   */
  const unofferable = useMemo(
    () => invalidParentIdsFor(locations, location.id, index),
    [locations, location.id, index]
  );

  return (
    <EntityPageSection title="Where this sits">
      <div className="flex flex-col gap-1">
        {parent ? (
          <TreeLine
            location={parent}
            depth={0}
            note={`${formatLocationType(parent.type)} · the parent`}
            onOpen={() => onOpen(parent.id)}
          />
        ) : (
          <Typography variant="body-sm" color="secondary" className="px-3 py-2 italic">
            At the top level — nothing holds this place.
          </Typography>
        )}

        <TreeLine
          location={location}
          depth={parent ? 1 : 0}
          note="you are here"
          self
        />

        {children.map((child) => (
          <TreeLine
            key={child.id}
            location={child}
            depth={parent ? 2 : 1}
            note={formatLocationStatus(child.status)}
            onOpen={() => onOpen(child.id)}
          />
        ))}

        {canAct && (
          <div style={{ marginLeft: (parent ? 2 : 1) * 24 }}>
            {/*
              §6.2 item 2: this is the **only** way a child is created, so
              nothing lands loose. It is `15-1`'s quick add with the parent
              pre-set -- the phase's one pre-filled field.
            */}
            <FieldPrompt onClick={onAddInside}>
              Add a place inside {location.name}
            </FieldPrompt>
          </div>
        )}

        {siblings.map((sibling) => (
          <TreeLine
            key={sibling.id}
            location={sibling}
            depth={parent ? 1 : 0}
            note="a sibling"
            onOpen={() => onOpen(sibling.id)}
          />
        ))}
      </div>

      {canAct && (
        /*
          The reference puts *Move elsewhere* at the top right of this module.
          It sits at the foot instead, because the tray shows the current parent
          as an attached chip and that chip has a job here: its `x` is the only
          way to say "no parent at all", which the tray cannot offer as a row --
          a list of places has no entry for the absence of one. A chip stacked
          above a button inside a heading row makes the heading two lines tall;
          beside the trigger, at the foot, it reads as what it is.
        */
        <div className="pt-1" ref={trayRef}>
          <AttachTray
            kinds={['location']}
            sources={{ location: locations as Location[] }}
            attachedIds={parentId ? [parentId] : []}
            excludeIds={unofferable}
            single
            triggerLabel="Move elsewhere"
            ariaLabel={`the place holding ${location.name}`}
            onAttach={(id) => void run(() => onMove(id))}
            onDetach={() => void run(() => onMove(undefined))}
          />
        </div>
      )}

      {isPending && (
        <Typography variant="body-sm" color="secondary" aria-live="polite">
          Moving…
        </Typography>
      )}
      {error && (
        <Typography variant="body-sm" color="error" role="alert">
          {error}
        </Typography>
      )}
    </EntityPageSection>
  );
};

export default WhereThisSits;
