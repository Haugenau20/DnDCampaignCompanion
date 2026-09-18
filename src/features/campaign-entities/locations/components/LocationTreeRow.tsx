// src/features/campaign-entities/locations/components/LocationTreeRow.tsx
import React from 'react';
import clsx from 'clsx';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import Typography from 'core/components/Typography';
import EntitySigil from 'core/components/EntitySigil';
import { RosterStatus } from 'core/components/Roster';
import { Location } from '../types';
import {
  formatLocationStatus,
  formatLocationType,
  STATUS_TONE,
} from '../utils/location-presentation';

/** 30px per level, and the visual indent stops at four (§6.1). */
export const INDENT_PX = 30;
export const MAX_VISUAL_DEPTH = 4;

export interface LocationTreeRowProps {
  location: Location;
  /** Logical depth. Keeps counting past four; the indent does not. */
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
  /** Opens `/locations/:locationId`. A different target from the twisty. */
  onOpen: () => void;
  highlighted?: boolean;
  /** "Beleriand · Gondolin" -- shown only in the flattened search results. */
  path?: string;
  insideCount: number;
  npcCount: number;
  questCount: number;
  /** The bounded summary, rendered under the row when it is open. */
  summary?: React.ReactNode;
  /** The rows for what is inside, rendered after the summary. */
  children?: React.ReactNode;
}

/**
 * One place, on one line, at every depth.
 *
 * Not a `RosterRow`, and the difference is the point: a roster row is a single
 * button, so the whole row toggles. §6.1 requires the **twisty and the name to
 * be different targets** -- the twisty opens the branch, the name opens the
 * page -- which a row that is one button cannot express. A place with nothing
 * inside shows no twisty at all rather than a disabled one.
 *
 * Indentation plus a 1px rail carries the hierarchy, and that is the whole fix
 * for what this replaces: a parent expanded into a full record card, printed a
 * "Locations in X" heading, and nested a *child record card* inside it. Design
 * language §5 -- rules inside a card read as one object with parts; cards
 * inside cards read as two objects arguing about which is the record.
 */
export const LocationTreeRow: React.FC<LocationTreeRowProps> = ({
  location,
  depth,
  hasChildren,
  expanded,
  onToggle,
  onOpen,
  highlighted = false,
  path,
  insideCount,
  npcCount,
  questCount,
  summary,
  children,
}) => {
  const inside = [
    insideCount ? `${insideCount} inside` : undefined,
    npcCount ? `${npcCount} NPC${npcCount === 1 ? '' : 's'}` : undefined,
    questCount ? `${questCount} quest${questCount === 1 ? '' : 's'}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      id={`location-${location.id}`}
      className={clsx(
        'border-t border-card transition-colors',
        highlighted && 'highlighted-item',
        expanded && 'bg-secondary'
      )}
    >
      <div
        className="flex items-center gap-2 pr-3 min-h-[44px]"
        // Logical indent continues past the cap; the visual one stops, so a
        // place nine levels down still has a name column to read (§6.1).
        style={{ paddingLeft: Math.min(depth, MAX_VISUAL_DEPTH) * INDENT_PX }}
      >
        {/* The rail. A hairline, not a box. */}
        <div className={clsx('self-stretch', depth > 0 && 'border-l card-border')} />

        {hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} what is inside ${location.name}`}
            className="shrink-0 p-2 rounded-md selectable-item"
          >
            <ChevronRight
              size={16}
              aria-hidden="true"
              className={clsx('transition-transform', expanded && 'rotate-90')}
            />
          </button>
        ) : (
          // A place with nothing inside shows no twisty (§6.1). The slot is
          // kept so the names still line up down the column.
          <span className="shrink-0 w-8" aria-hidden="true" />
        )}

        <EntitySigil entityId={location.id} name={location.name} size={24} className="shrink-0" />

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-left py-2 px-1 rounded-md selectable-item"
        >
          {/* A place name is the campaign's voice (design language §4). */}
          <span className="font-heading font-semibold truncate">{location.name}</span>
          <Typography variant="body-sm" color="secondary" className="text-sm">
            {formatLocationType(location.type)}
          </Typography>
          <RosterStatus tone={STATUS_TONE[location.status]}>
            {formatLocationStatus(location.status)}
          </RosterStatus>
          {path && (
            // Only in the flattened search results: a hit with no path is a
            // name with no context (§6.1).
            <Typography variant="body-sm" color="muted" className="text-xs truncate">
              in {path}
            </Typography>
          )}
        </button>

        {inside && (
          <Typography
            variant="body-sm"
            color="secondary"
            className="hidden md:block text-sm whitespace-nowrap"
          >
            {inside}
          </Typography>
        )}

        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${location.name}`}
          className="shrink-0 flex items-center gap-1 text-sm px-2 py-1.5 rounded-md selectable-item"
        >
          <span className="hidden sm:inline">Open</span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      </div>

      {expanded && summary && (
        <div
          className="pb-4 pr-3"
          style={{ paddingLeft: Math.min(depth, MAX_VISUAL_DEPTH) * INDENT_PX + 40 }}
        >
          {summary}
        </div>
      )}

      {expanded && children}
    </div>
  );
};

export default LocationTreeRow;
