import React, { useState, useMemo, useEffect } from 'react';
import { NPC } from '../types';
import { useLocations } from '../../locations/context/LocationContext';
import { resolveLocationName } from '../../locations/utils/location-display';
import Button from '../../../../core/components/Button';
import Typography from '../../../../core/components/Typography';
import { Plus } from 'lucide-react';
import { useNavigation } from 'shared/context/NavigationContext';
import {
  RosterStatusBar,
  RosterFilterBar,
  RosterFilterPills,
  RosterGroup,
  RosterRow,
  RosterField,
  type RosterSegment,
  RosterSkeleton,
  RosterEmpty,
  RosterStatus,
  type RosterStatusTone,
} from 'core/components/Roster';

interface NPCDirectoryProps {
  npcs: NPC[];
  isLoading?: boolean;
  onNPCUpdate?: (updatedNPC: NPC) => void;
  onNPCDelete?: (npcId: string) => void;
}

/** Column template shared by every row, so the columns line up across groups. */
const ROW_GRID =
  'grid-cols-[1fr_auto] md:grid-cols-[1.5fr_112px_132px_1.15fr_26px]';

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

const STATUS_TONE: Partial<Record<string, RosterStatusTone>> = {
  alive: 'present',
  deceased: 'absent',
  missing: 'knowledge-0',
  unknown: 'knowledge-0',
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
  const [highlightedNpcId, setHighlightedNpcId] = useState<string | null>(null);
  const [expandedNpcId, setExpandedNpcId] = useState<string | null>(null);
  const { locations } = useLocations();
  const { navigateToPage, createPath } = useNavigation();

  // Get URL search params for highlighted NPC
  const { getCurrentQueryParams } = useNavigation();
  const { highlight: highlightId } = getCurrentQueryParams();

  // Update when props change
  useEffect(() => {
    setNpcs(initialNpcs);
  }, [initialNpcs]);

  // Handle NPC deletion
  const handleNPCDelete = (npcId: string) => {
    // Update local state
    setNpcs(prev => prev.filter(npc => npc.id !== npcId));

    // Call the parent handler if provided
    if (onNPCDelete) {
      onNPCDelete(npcId);
    }
  };

  // Handle location click
  const handleLocationClick = (location: string) => {
    navigateToPage(createPath('/locations', {}, { highlight: location }));
  };

  // Handle highlighted NPC from URL
  useEffect(() => {
    if (highlightId) {
      setHighlightedNpcId(highlightId);
      // Open the highlighted entry, so arriving from a link shows its detail.
      setExpandedNpcId(highlightId);

      // Deliberately no location filtering here. Arriving from a link used to
      // set locationFilter to the target's location, which silently hid every
      // other group and explained itself only through a small "Clear location:"
      // ghost button. The roster already groups by location, so the target's
      // group is visually separated anyway — highlighting, expanding and
      // scrolling is the whole job. RumorDirectory reaches the same conclusion
      // for the same reason ("Location is deliberately not part of this filter
      // set — see the grouping rationale below").
      const highlightedNpc = npcs.find(npc => npc.id === highlightId);
      if (highlightedNpc) {
        setTimeout(() => {
          const element = document.getElementById(`npc-${highlightId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [highlightId, npcs]);

  // Status counts drive the one bar that replaced four stat cards
  const statusSegments: RosterSegment[] = useMemo(() => {
    const count = (status: string) => npcs.filter(npc => npc.status === status).length;
    return [
      // Presence differs by *value*, not hue: plain ink, muted ink, and only
      // genuine uncertainty takes the ladder's first rung. Green for alive and
      // red for deceased was the bar reading a death as an error.
      { key: 'alive', label: 'alive', count: count('alive'), colorClass: 'bg-presence-present' },
      { key: 'deceased', label: 'deceased', count: count('deceased'), colorClass: 'bg-presence-absent' },
      { key: 'missing', label: 'missing', count: count('missing'), colorClass: 'bg-knowledge-0' },
      { key: 'unknown', label: 'unrecorded', count: count('unknown'), colorClass: 'bg-knowledge-0' },
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

  // Group NPCs by location for display.
  //
  // `npc.location` holds the location's id, so grouping on it verbatim printed
  // slugs as headings -- "mines-of-moria" where the Locations page says "Mines
  // of Moria" (#1412). Resolve to the display name, which also merges entries
  // stored under different cases of the same place into one group.
  //
  // `resolveLocationName` prefers `npc.locationId` (the canonical reference)
  // and falls back to the legacy `npc.location` free text for documents
  // written before that field existed; see the contract on `NPC.location`.
  const groupedNPCs = useMemo(() => {
    return filteredNPCs.reduce((acc, npc) => {
      const location =
        resolveLocationName({ locationId: npc.locationId, location: npc.location }, locations) ??
        'Location unknown';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(npc);
      return acc;
    }, {} as Record<string, NPC[]>);
  }, [filteredNPCs, locations]);

  if (isLoading) {
    return <RosterSkeleton label="Loading NPCs" />;
  }

  const groups = Object.entries(groupedNPCs);

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
      </RosterFilterBar>

      {/* NPC roster by location */}
      {groups.length > 0 ? (
        groups.map(([location, locationNPCs]) => {
          const isUnknown = location === 'Location unknown';

          return (
            <RosterGroup
              key={location}
              title={location}
              count={locationNPCs.length}
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
                    expandedContent={
                      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-7 pt-4">
                        <div className="flex flex-col gap-4">
                          <RosterField
                            label="Description"
                            emptyText="Nothing written yet"
                          >
                            {npc.description ? (
                              <Typography variant="body-sm">{npc.description}</Typography>
                            ) : undefined}
                          </RosterField>

                          <RosterField label="Notes" emptyText="No notes yet">
                            {npc.notes?.length ? (
                              <div className="flex flex-col gap-2">
                                {npc.notes.map((note, noteIndex) => (
                                  <div
                                    key={noteIndex}
                                    className="flex gap-3 px-3 py-2.5 rounded-md bg-secondary"
                                  >
                                    <Typography
                                      variant="body-sm"
                                      color="muted"
                                      className="text-xs whitespace-nowrap"
                                    >
                                      {note.date}
                                    </Typography>
                                    <Typography variant="body-sm">{note.text}</Typography>
                                  </div>
                                ))}
                              </div>
                            ) : undefined}
                          </RosterField>
                        </div>

                        <div className="flex flex-col gap-4">
                          <RosterField label="Race" emptyText="Unrecorded">
                            {npc.race ? (
                              <Typography variant="body-sm">{npc.race}</Typography>
                            ) : undefined}
                          </RosterField>

                          <RosterField label="Recorded by" emptyText="Unknown">
                            {npc.createdByUsername ? (
                              <Typography variant="body-sm">
                                {npc.createdByUsername}
                              </Typography>
                            ) : undefined}
                          </RosterField>

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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigateToPage(`/npcs/edit/${npc.id}`)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleNPCDelete(npc.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <Typography
                        variant="body"
                        className="font-semibold truncate font-heading"
                      >
                        {npc.name}
                      </Typography>
                      {npc.title && (
                        <Typography
                          variant="body-sm"
                          color="secondary"
                          className="text-sm truncate"
                        >
                          {npc.title}
                        </Typography>
                      )}
                    </div>

                    <RosterStatus
                      tone={STATUS_TONE[npc.status] ?? 'knowledge-0'}
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
    </div>
  );
};

export default NPCDirectory;
