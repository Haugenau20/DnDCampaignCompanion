// src/features/campaign-entities/locations/components/LocationRowSummary.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import EntitySigil from 'core/components/EntitySigil';
import StateLadder from 'shared/components/row-controls/StateLadder';
import { Location, LocationStatus } from '../types';
import { KNOWLEDGE_OPTIONS } from '../utils/location-presentation';

export interface LocationRowSummaryProps {
  location: Location;
  /** The people recorded here, already resolved to names. */
  people: Array<{ id: string; name: string; detail?: string }>;
  /** The quests here, already resolved to titles and stated statuses. */
  quests: Array<{ id: string; name: string; detail?: string }>;
  onChangeStatus: (status: LocationStatus) => Promise<unknown>;
  onOpenNPC: (npcId: string) => void;
  onOpenQuest: (questId: string) => void;
}

/** The uppercase micro-label each part of the summary is introduced by. */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="body-sm"
    color="muted"
    className="text-[11px] font-semibold uppercase tracking-wider"
  >
    {children}
  </Typography>
);

/** A row of names, as chips. */
const Chips: React.FC<{
  items: Array<{ id: string; name: string; detail?: string }>;
  onOpen: (id: string) => void;
  empty: string;
}> = ({ items, onOpen, empty }) =>
  items.length ? (
    <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full chip"
          >
            <EntitySigil entityId={item.id} name={item.name} size={16} />
            <span className="font-heading text-sm">{item.name}</span>
            {item.detail && (
              <span className="typography-secondary text-xs">· {item.detail}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  ) : (
    <Typography variant="body-sm" color="secondary" className="italic">
      {empty}
    </Typography>
  );

/**
 * What an expanded location row holds: four facts, and then what is inside.
 *
 * The same bounded shape as a quest row, at every depth. §1.3 is stated
 * carefully because its first draft was wrong: a row that expands to *structure
 * only* buries every readable fact one level deeper and makes the directory
 * useless for the thing it is for. **Nesting is the defect; content in the row
 * is not.**
 *
 * So this is description, features on one line, who is here, quests here, and
 * the knowledge step as three buttons -- roughly 160px, uniform, at every
 * depth. The notes, the tags, the full tree and the record history live on the
 * page (§3).
 */
export const LocationRowSummary: React.FC<LocationRowSummaryProps> = ({
  location,
  people,
  quests,
  onChangeStatus,
  onOpenNPC,
  onOpenQuest,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 pt-2">
    <div className="flex flex-col gap-3">
      {location.description ? (
        <Typography variant="body-sm">{location.description}</Typography>
      ) : (
        <Typography variant="body-sm" color="secondary" className="italic">
          Nothing written about this place yet
        </Typography>
      )}

      {/*
        Features on **one line**, joined. A vertical list of eight features is
        how a bounded summary stops being bounded; the full list is on the page,
        where it can also be edited and promoted.
      */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <FieldLabel>Features</FieldLabel>
        {location.features?.length ? (
          <Typography variant="body-sm" className="min-w-0">
            {location.features.join(' · ')}
          </Typography>
        ) : (
          <Typography variant="body-sm" color="secondary" className="italic">
            None recorded
          </Typography>
        )}
      </div>

      {/*
        The knowledge ladder: known -> explored -> visited, never a verdict. A
        child may be more known than its parent; that is legal and is not a
        warning (§10).
      */}
      <StateLadder
        label="Knowledge"
        options={KNOWLEDGE_OPTIONS}
        value={location.status}
        ariaLabel={`Knowledge of ${location.name}`}
        onChange={onChangeStatus}
      />
    </div>

    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <FieldLabel>Who is here</FieldLabel>
        <Chips items={people} onOpen={onOpenNPC} empty="Nobody recorded here" />
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel>Quests here</FieldLabel>
        <Chips items={quests} onOpen={onOpenQuest} empty="No quests here" />
      </div>
    </div>
  </div>
);

export default LocationRowSummary;
