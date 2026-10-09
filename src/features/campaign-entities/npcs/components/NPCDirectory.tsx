import React, { useState, useMemo, useEffect } from 'react';
import { NPC, NPCRelationship, NPCStatus } from '../types';
import { useLocations } from '../../locations/context/LocationContext';
import { useNPCs } from '../context/NPCContext';
import { indexLocationNames, resolveLocationName } from '../../locations/utils/location-display';
import Button from '../../../../core/components/Button';
import Typography from '../../../../core/components/Typography';
import { Plus } from 'lucide-react';
import { useNavigation } from 'shared/context/NavigationContext';
import useHighlightTarget from 'shared/hooks/useHighlightTarget';
import useSelection from 'shared/hooks/useSelection';
import StateLadder from 'shared/components/row-controls/StateLadder';
import useCreatorName from 'shared/hooks/useCreatorName';
import DeleteConfirmationDialog from 'shared/components/DeleteConfirmationDialog';
import EntityBatchActions, { type BatchStatusOption } from '../../shared/EntityBatchActions';
import NPCRowNotes from './NPCRowNotes';
import {
  RosterStatusBar,
  RosterFilterBar,
  RosterFilterPills,
  RosterGroup,
  RosterRow,
  RosterName,
  RosterField,
  type RosterSegment,
  RosterSkeleton,
  RosterEmpty,
  RosterStatus,
  RosterShowMore,
  type RosterStatusTone,
} from 'core/components/Roster';
import { ROSTER_PAGE_SIZE, pageGroups, limitReaching } from 'shared/utils/roster-paging';

interface NPCDirectoryProps {
  npcs: NPC[];
  isLoading?: boolean;
  onNPCUpdate?: (updatedNPC: NPC) => void;
  /** Called after an NPC has been deleted from the directory. */
  onNPCDelete?: (npcId: string) => void;
}

/** Column template shared by every row, so the columns line up across groups. */
const ROW_GRID =
  'grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.5fr)_112px_132px_minmax(0,1.15fr)_26px]';

const RELATIONSHIP_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'hostile', label: 'Hostile' },
  { value: 'unknown', label: 'Unknown' },
];

/** Relationship as a labelled chip. A bare colour stripe needed a legend nobody had. */
/** NPC state, in the shared status vocabulary. */
/**
 * NPC presence carries no hue, deliberately.
 *
 * Alive was green and deceased was red, which reads a death as an error. It is
 * a fact about the world with no valence -- a slain villain is not a bad
 * outcome -- so alive is plain ink, deceased is muted ink, and only `missing`
 * takes a hue, because genuine uncertainty is what the knowledge ladder's
 * first rung means. 12-5 adds the strike that makes deceased legible without
 * leaning on weight alone. Schema section 3.
 */
/**
 * An NPC's stance toward the party. Valenced, unlike presence above.
 *
 * `unknown` maps to `unsure` rather than sharing a name with presence's
 * `unknown`: they are different claims -- one is "we have not recorded where
 * this person stands", the other "we do not know whether they are alive".
 */
// `Partial<>` is load-bearing, not pedantry. As a plain `Record<string, T>`
// the index access is typed non-nullable, so TypeScript treats the `?? fallback`
// at the call site as unreachable and **never checks it** -- which is how a
// `?? 'unknown'` naming a tone that no longer exists survived 12-3a's rename
// and would have rendered no class at all. `Partial` makes the lookup
// `T | undefined`, so the fallback is type-checked like any other value.
const DISPOSITION_TONE: Partial<Record<string, RosterStatusTone>> = {
  friendly: 'friendly',
  neutral: 'neutral',
  hostile: 'hostile',
  unknown: 'unsure',
};

// NPC presence is the one scale with four ranks, so it takes four stops
// instead of the three a rumour or a location needs. It keeps the ramp's ends
// -- alive is the same green a completed quest is, deceased the same red a
// failed one is -- and spends stops 1 and 3 on the two middles, which is what
// finally separates "we have no record of them" from "we know they are lost".
const STATUS_TONE: Partial<Record<string, RosterStatusTone>> = {
  alive: 'valence-0',
  unknown: 'valence-1',
  missing: 'valence-2',
  deceased: 'valence-3',
};

/**
 * Stance: the only valenced thing in the NPC list, and always also a word
 * (design language §2).
 *
 * These four carried `selectedClassName: 'disposition-*'` until `15-6`.
 * `StateLadder` stopped reading that prop in `15-4`, and nothing failed: an
 * options array declared as a `const` is a wider type than the prop it is
 * passed to, so TypeScript's excess-property check never runs on it. The
 * classes are real and are still what paints the *word* in the row -- they
 * were simply being handed to something that had stopped listening.
 * `ladder-classes.test.ts` is the gate that now says so.
 */
const STANCE_OPTIONS: Array<{
  value: NPCRelationship;
  label: string;
}> = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'hostile', label: 'Hostile' },
  { value: 'unknown', label: 'Unknown' },
];

/**
 * The batch actions' statuses, best to worst as the status bar orders them.
 * Plain words with no icon or hue: presence carries none here (`STATUS_TONE`),
 * and a death is not an error.
 */
const BATCH_STATUSES: Array<BatchStatusOption<NPCStatus>> = [
  { value: 'alive', label: 'Mark Alive' },
  { value: 'unknown', label: 'Mark Unknown' },
  { value: 'missing', label: 'Mark Missing' },
  { value: 'deceased', label: 'Mark Deceased' },
];

/**
 * Who recorded the NPC, named as the NPC's own page names them. A component
 * of its own because the rows are drawn in a loop, and a hook cannot be.
 */
const RecordedBy: React.FC<{ npc: NPC }> = ({ npc }) => {
  const creator = useCreatorName(npc);
  return (
    <RosterField label="Recorded by" emptyText="Unknown">
      {creator ? <Typography variant="body-sm">{creator}</Typography> : undefined}
    </RosterField>
  );
};

const NPCDirectory: React.FC<NPCDirectoryProps> = ({
  npcs: initialNpcs,
  isLoading = false,
  onNPCUpdate,
  onNPCDelete
}) => {
  // Track npcs locally
  const [npcs, setNpcs] = useState<NPC[]>(initialNpcs);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');
  const [expandedNpcId, setExpandedNpcId] = useState<string | null>(null);
  /** How many rows the roster mounts; "Show more" raises it (T101). */
  const [rowLimit, setRowLimit] = useState(ROSTER_PAGE_SIZE);
  const { locations } = useLocations();
  /** One lookup per row, not a search of every place (T101). */
  const locationIndex = useMemo(() => indexLocationNames(locations), [locations]);
  const { updateNPCRelationship, deleteNPC, updateNPCsStatus, deleteNPCs } = useNPCs();
  /** The NPC whose Delete was pressed, awaiting confirmation. */
  const [confirmingDelete, setConfirmingDelete] = useState<NPC | null>(null);
  /** Selection mode for the batch actions (T017). */
  const selection = useSelection();
  const { navigateToPage, createPath } = useNavigation();

  const { getCurrentQueryParams } = useNavigation();

  // Update when props change
  useEffect(() => {
    setNpcs(initialNpcs);
  }, [initialNpcs]);

  /**
   * Delete the NPC once confirmed. The row leaves through the provider's
   * listener, not a local filter: this button once only hid the row and wrote
   * nothing, so the NPC came back on the next change (T078). A failure stays
   * in the dialog, which reports it.
   */
  const handleConfirmDelete = async () => {
    if (!confirmingDelete) return;
    const npcId = confirmingDelete.id;
    await deleteNPC(npcId);
    setConfirmingDelete(null);
    onNPCDelete?.(npcId);
  };

  // Handle location click
  const handleLocationClick = (location: string) => {
    // The stored value may already be an id, or the free text a player wrote.
    // A location that resolves to a record opens its own page (T014); free
    // text that names no record has no page, so it falls back to the directory.
    const match = locations.find(
      (loc) => loc.id === location || loc.name.toLowerCase() === location.toLowerCase()
    );
    if (match) {
      navigateToPage(`/locations/${match.id}`);
      return;
    }
    navigateToPage(createPath('/locations', {}, { highlight: location }));
  };

  /**
   * T014: one hook, four consumers.
   *
   * Deliberately no location filtering here. Arriving from a link used to set
   * `locationFilter` to the target's location, which silently hid every other
   * group and explained itself only through a small "Clear location:" ghost
   * button. The roster already groups by location, so the target's group is
   * visually separated anyway -- highlighting, expanding and scrolling is the
   * whole job.
   */
  const { highlightedId: highlightedNpcId } = useHighlightTarget({
    items: npcs,
    highlight: getCurrentQueryParams().highlight,
    idOf: (npc) => npc.id,
    domIdPrefix: 'npc',
    onReveal: ([npcId]) => setExpandedNpcId(npcId),
  });

  // Status counts drive the one bar that replaced four stat cards
  const statusSegments: RosterSegment[] = useMemo(() => {
    const count = (status: string) => npcs.filter(npc => npc.status === status).length;
    return [
      // Best to worst, left to right, like every other directory's bar.
      { key: 'alive', label: 'alive', count: count('alive'), colorClass: 'bg-valence-0' },
      { key: 'unknown', label: 'unknown', count: count('unknown'), colorClass: 'bg-valence-1' },
      { key: 'missing', label: 'missing', count: count('missing'), colorClass: 'bg-valence-2' },
      { key: 'deceased', label: 'deceased', count: count('deceased'), colorClass: 'bg-valence-3' },
    ];
  }, [npcs]);

  // Filter NPCs based on search and filters
  const filteredNPCs = useMemo(() => {
    return npcs.filter(npc => {
      // Search filter
      const searchMatch = searchQuery === '' ||
        npc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        npc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (npc.title && npc.title.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const statusMatch = statusFilter === 'all' || npc.status === statusFilter;

      // Relationship filter
      const relationshipMatch = relationshipFilter === 'all' ||
        npc.relationship === relationshipFilter;

      // Location is the grouping, not a filter — see the highlight effect above.
      return searchMatch && statusMatch && relationshipMatch;
    });
  }, [npcs, searchQuery, statusFilter, relationshipFilter]);

  // Each person's first place: the first place, in the places' order, whose
  // list names them (T131), as their own page shows it. One pass over the
  // places rather than one per person.
  const firstPlaceOf = useMemo(() => {
    const first = new Map<string, string>();
    for (const location of locations) {
      for (const npcId of location.connectedNPCs ?? []) {
        if (!first.has(npcId)) first.set(npcId, location.name);
      }
    }
    return first;
  }, [locations]);

  // Group NPCs by location for display: their first place, else what their
  // own record says, as `resolveLocationName` reads it -- the free text, or a
  // reference to a place since deleted, visible as one (#1412; see the
  // contract on `NPC.location`). Grouping on a stored id verbatim printed
  // slugs as headings -- "mines-of-moria" where the Locations page says
  // "Mines of Moria".
  const groupedNPCs = useMemo(() => {
    return filteredNPCs.reduce((acc, npc) => {
      const location =
        firstPlaceOf.get(npc.id) ??
        resolveLocationName({ locationId: npc.locationId, location: npc.location }, locationIndex) ??
        'Location unknown';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(npc);
      return acc;
    }, {} as Record<string, NPC[]>);
  }, [filteredNPCs, firstPlaceOf, locationIndex]);

  if (isLoading) {
    return <RosterSkeleton label="Loading NPCs" />;
  }

  const allGroups = Object.entries(groupedNPCs);
  // A deep link reaches its NPC however far down the roster it sits.
  const highlightedIndex = highlightedNpcId
    ? allGroups.flatMap(([, list]) => list).findIndex((npc) => npc.id === highlightedNpcId)
    : -1;
  const limit = limitReaching(rowLimit, highlightedIndex);
  const roster = pageGroups(allGroups, limit);

  return (
    <div className="space-y-6">
      {/* One status bar that also filters, replacing four non-clickable stat cards */}
      <RosterStatusBar
        total={npcs.length}
        totalLabel="met so far"
        segments={statusSegments}
        activeKey={statusFilter}
        onSelect={setStatusFilter}
      />

      {/* Search and filters, on one row rather than four stacked dropdowns */}
      <RosterFilterBar
        placeholder="Search name, title or description"
        value={searchQuery}
        onChange={setSearchQuery}
      >
        <RosterFilterPills
          options={RELATIONSHIP_FILTERS}
          value={relationshipFilter}
          onChange={setRelationshipFilter}
          label="Filter by relationship"
        />

        <Button
          variant={selection.active ? 'primary' : 'outline'}
          size="sm"
          onClick={selection.toggleActive}
        >
          {selection.active ? 'Exit Selection' : 'Select NPCs'}
        </Button>
      </RosterFilterBar>

      {/* Batch actions -- only in selection mode, once something is ticked */}
      {selection.active && (
        <EntityBatchActions
          selected={selection.selected}
          noun={{ one: 'NPC', many: 'NPCs' }}
          statuses={BATCH_STATUSES}
          onStatus={updateNPCsStatus}
          onDelete={deleteNPCs}
          deleteConsequence="Their pages, notes and portraits go with them."
          onComplete={selection.clear}
        />
      )}

      {/* NPC roster by location */}
      {roster.groups.length > 0 ? (
        roster.groups.map(({ key: location, rows: locationNPCs, total: groupTotal }) => {
          const isUnknown = location === 'Location unknown';

          return (
            <RosterGroup
              key={location}
              title={location}
              count={groupTotal}
              muted={isUnknown}
              onOpen={isUnknown ? undefined : () => handleLocationClick(location)}
            >
              {locationNPCs.map((npc, index) => {
                const isExpanded = expandedNpcId === npc.id;

                return (
                  <RosterRow
                    key={npc.id}
                    id={`npc-${npc.id}`}
                    entityId={npc.id}
                    entityName={npc.name}
                    gridClassName={ROW_GRID}
                    isFirst={index === 0}
                    highlighted={highlightedNpcId === npc.id}
                    expanded={isExpanded}
                    toggleLabel={npc.name}
                    onToggle={() => setExpandedNpcId(isExpanded ? null : npc.id)}
                    selected={selection.selected.has(npc.id)}
                    leadingControl={
                      selection.active ? (
                        <input
                          type="checkbox"
                          aria-label={`Select ${npc.name}`}
                          checked={selection.selected.has(npc.id)}
                          onChange={(e) => selection.setSelected(npc.id, e.target.checked)}
                        />
                      ) : undefined
                    }
                    expandedContent={
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-7 pt-4">
                        <div className="flex flex-col gap-4">
                          <RosterField
                            label="Description"
                            emptyText="Nothing written yet"
                          >
                            {npc.description ? (
                              <Typography variant="body-sm">{npc.description}</Typography>
                            ) : undefined}
                          </RosterField>

                          {/*
                            Stance, changed from the row in one click. It is the
                            field that changes most and the one people currently
                            open a whole form for (S6). Presence -- deceased --
                            is a different thing and stays where it is: muted ink
                            and a strike, never a valenced step on this ladder.
                          */}
                          <StateLadder
                            label="Stance"
                            options={STANCE_OPTIONS}
                            value={npc.relationship}
                            ariaLabel={`Stance of ${npc.name}`}
                            onChange={async (relationship) => {
                              await updateNPCRelationship(npc.id, relationship);
                              /*
                                And then tell the page. `updateNPCRelationship`
                                refreshes the provider's copy of the collection,
                                and `NPCsPage` now renders that copy, so this
                                call is belt-and-braces rather than the thing
                                carrying the fix -- which is what it used to be.
                                It was once a declared, destructured, never-called
                                prop, and the stance someone picked stayed on the
                                old word because of it (T046).
                              */
                              onNPCUpdate?.({ ...npc, relationship });
                            }}
                          />

                          <NPCRowNotes npc={npc} />
                        </div>

                        <div className="flex flex-col gap-4">
                          <RosterField label="Race" emptyText="Unrecorded">
                            {npc.race ? (
                              <Typography variant="body-sm">{npc.race}</Typography>
                            ) : undefined}
                          </RosterField>

                          <RecordedBy npc={npc} />

                          <div className="flex flex-wrap gap-2 mt-1">
                            {/* The way into the NPC's own page. It lives in the
                                expanded content, never in the collapsed row:
                                the collapsed row is the highest-frequency
                                surface in the product and does not get a second
                                control (D41). A row that is already open has
                                said it wants more. */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigateToPage(`/npcs/${npc.id}`)}
                            >
                              More info
                            </Button>
                            {/* Edit used to sit here and leave for
                                `/npcs/edit/:id`. That route is a redirect back
                                to this NPC's page since `15-8`, because the
                                page edits every field in place -- so the
                                control would have been a longer way to press
                                *More info*. */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmingDelete(npc)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <RosterName name={npc.name} detail={npc.title} />

                    <RosterStatus
                      tone={STATUS_TONE[npc.status] ?? 'valence-1'}
                      negated={npc.status === 'deceased'}
                    >
                      {npc.status.charAt(0).toUpperCase() + npc.status.slice(1)}
                    </RosterStatus>

                    {/* Disposition, and it takes its own hue again.
                        It was muted for a real reason: as a filled chip in the status
                        hue, a green "Alive" sat beside a green "Friendly" and read as
                        one fact twice. That collision is gone -- presence now carries
                        no hue at all -- so the scale that genuinely is valenced can
                        have one. A hostile NPC is a threat to the reader, which is a
                        different claim from anything presence makes. */}
                    <RosterStatus
                      tone={DISPOSITION_TONE[npc.relationship] ?? 'unsure'}
                      className="justify-self-start"
                    >
                      {npc.relationship.charAt(0).toUpperCase() + npc.relationship.slice(1)}
                    </RosterStatus>

                    <Typography
                      variant="body-sm"
                      color="secondary"
                      className="hidden md:block text-sm truncate"
                    >
                      {npc.occupation || '—'}
                    </Typography>
                  </RosterRow>
                );
              })}
            </RosterGroup>
          );
        })
      ) : npcs.length > 0 ? (
        // Emptied by a filter, not by the campaign. The fix is to change the
        // filter, so no action is offered -- "Add an NPC" would answer a
        // question nobody asked.
        <RosterEmpty
          title="No NPCs match these filters"
          message="Try a different search term, or clear the filters to see everyone you have met."
        />
      ) : (
        <RosterEmpty
          title="No one recorded yet"
          message="Every person the party meets can live here — name, standing, where you found them, and what they told you."
          action={
            <Button
              onClick={() => navigateToPage('/npcs/create')}
              startIcon={<Plus className="w-4 h-4" />}
            >
              Add the first NPC
            </Button>
          }
        />
      )}

      {roster.shown < roster.total && (
        <RosterShowMore
          shown={roster.shown}
          total={roster.total}
          step={ROSTER_PAGE_SIZE}
          noun="NPCs"
          onShowMore={() => setRowLimit(limit + ROSTER_PAGE_SIZE)}
        />
      )}

      {confirmingDelete && (
        <DeleteConfirmationDialog
          isOpen
          onClose={() => setConfirmingDelete(null)}
          onConfirm={handleConfirmDelete}
          itemName={confirmingDelete.name}
          itemType="NPC"
        />
      )}
    </div>
  );
};

export default NPCDirectory;
