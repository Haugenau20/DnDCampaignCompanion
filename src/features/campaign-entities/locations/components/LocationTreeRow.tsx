// src/features/campaign-entities/locations/components/LocationTreeRow.tsx
import React from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
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
  expanded: boolean;
  /** Opens the row: the summary, and then whatever is inside it. */
  onToggle: () => void;
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
 * **The row opens the row.** §6.1 originally split the targets -- the twisty
 * opened the branch, the name opened the page -- and showed no twisty at all
 * on a place with nothing inside. That was written while a location row had
 * nothing to expand *into* except its children. §1.3 then gave every row a
 * bounded summary, and the two rules together left a leaf with **no control
 * that opened it at all**: its description, its features, its knowledge
 * ladder, who is there and the quests there were unreachable from the
 * directory, and clicking its name left the page. Reported from the running
 * app, and confirmed on `/locations`, where every one of the five places was
 * a leaf and not one of them could be opened.
 *
 * So a location row now behaves like every other row in this product: the
 * name opens it, and the way to its page is *More info* inside the expansion
 * (D41 -- the collapsed row is the highest-frequency surface and does not get
 * a second control). The twisty is on every row, because every row opens.
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
  expanded,
  onToggle,
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

        {/*
          On every row, since every row opens. Whether anything is *inside*
          no longer decides whether the control exists; the counts to the
          right already say that in words ("3 inside · 2 NPCs").
        */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${location.name}`}
          className="shrink-0 p-2 rounded-md selectable-item"
        >
          <ChevronRight
            size={16}
            aria-hidden="true"
            className={clsx('transition-transform', expanded && 'rotate-90')}
          />
        </button>

        <EntitySigil entityId={location.id} name={location.name} size={24} className="shrink-0" />

        {/*
          The name opens the row rather than leaving for the page. It carries
          `aria-expanded` as well as the twisty: they are one disclosure with
          two handles, not two different promises.
        */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
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
