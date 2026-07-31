import React, { useState, useMemo, useEffect } from 'react';
import { NPC } from '../types';
import Card from '../../../../core/components/Card';
import Button from '../../../../core/components/Button';
import Typography from '../../../../core/components/Typography';
import Input from '../../../../core/components/Input';
import { Search, Users, AlertCircle } from 'lucide-react';
import { useNavigation } from 'shared/context/NavigationContext';
import clsx from 'clsx';
import {
  RosterStatusBar,
  RosterFilterPills,
  RosterGroup,
  RosterRow,
  RosterField,
  type RosterSegment,
} from '../../shared/components/Roster';

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
const RELATIONSHIP_CHIP: Record<string, string> = {
  friendly: 'npc-relationship-friendly',
  hostile: 'npc-relationship-hostile',
  neutral: 'npc-relationship-neutral',
  unknown: 'npc-relationship-unknown',
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
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [highlightedNpcId, setHighlightedNpcId] = useState<string | null>(null);
  const [expandedNpcId, setExpandedNpcId] = useState<string | null>(null);
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
      // Open the highlighted entry, so arriving from a link shows its detail
      setExpandedNpcId(highlightId);
      // Find the NPC and set relevant filters
      const highlightedNpc = npcs.find(npc => npc.id === highlightId);
      if (highlightedNpc) {
        if (highlightedNpc.location) {
          setLocationFilter(highlightedNpc.location);
        }
        // Scroll to the highlighted NPC row
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
      { key: 'alive', label: 'alive', count: count('alive'), colorClass: 'bg-status-completed' },
      { key: 'deceased', label: 'deceased', count: count('deceased'), colorClass: 'bg-status-failed' },
      { key: 'missing', label: 'missing', count: count('missing'), colorClass: 'bg-status-unknown' },
      { key: 'unknown', label: 'unrecorded', count: count('unknown'), colorClass: 'bg-status-general' },
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

      // Location filter
      const locationMatch = locationFilter === 'all' || npc.location === locationFilter;

      return searchMatch && statusMatch && relationshipMatch && locationMatch;
    });
  }, [npcs, searchQuery, statusFilter, relationshipFilter, locationFilter]);

  // Group NPCs by location for display
  const groupedNPCs = useMemo(() => {
    return filteredNPCs.reduce((acc, npc) => {
      const location = npc.location || 'Location unknown';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(npc);
      return acc;
    }, {} as Record<string, NPC[]>);
  }, [filteredNPCs]);

  if (isLoading) {
    return (
      <Card>
        <Card.Content>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin mr-2">
              <Users className="primary" />
            </div>
            <Typography>Loading NPCs...</Typography>
          </div>
        </Card.Content>
      </Card>
    );
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
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Search name, title or description"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startIcon={<Search className="typography-secondary" />}
            fullWidth
          />
        </div>

        <RosterFilterPills
          options={RELATIONSHIP_FILTERS}
          value={relationshipFilter}
          onChange={setRelationshipFilter}
          label="Filter by relationship"
        />

        {locationFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setLocationFilter('all')}>
            Clear location: {locationFilter}
          </Button>
        )}
      </div>

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

                          <div className="flex gap-2 mt-1">
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
                      <Typography variant="body" className="font-semibold truncate">
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

                    {/* Status: dot plus the word, so colour is never the only cue */}
                    <Typography
                      variant="body-sm"
                      className={clsx(
                        'hidden md:flex items-center gap-2 text-sm font-semibold',
                        `npc-status-${npc.status}`
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          'w-[7px] h-[7px] rounded-full shrink-0',
                          npc.status === 'alive' && 'bg-status-completed',
                          npc.status === 'deceased' && 'bg-status-failed',
                          (npc.status === 'missing' || npc.status === 'unknown') &&
                            'bg-status-unknown'
                        )}
                      />
                      {npc.status.charAt(0).toUpperCase() + npc.status.slice(1)}
                    </Typography>

                    <Typography
                      variant="body-sm"
                      className={clsx(
                        'hidden md:inline-flex justify-self-start px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary',
                        RELATIONSHIP_CHIP[npc.relationship]
                      )}
                    >
                      {npc.relationship.charAt(0).toUpperCase() + npc.relationship.slice(1)}
                    </Typography>

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
      ) : (
        <Card>
          <Card.Content className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 typography-secondary" />
            <Typography variant="h3" className="mb-2">
              No NPCs Found
            </Typography>
            <Typography color="secondary">
              {npcs.length > 0
                ? "Try adjusting your search criteria"
                : "Start by adding some NPCs to your campaign"}
            </Typography>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default NPCDirectory;
