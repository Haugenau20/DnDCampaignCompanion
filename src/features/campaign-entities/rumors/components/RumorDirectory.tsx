// src/features/campaign-entities/rumors/components/RumorDirectory.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Rumor, RumorStatus, SourceType } from '../types';
import { useRumors } from '../context/RumorContext';
import { useNPCs } from '../../npcs/context/NPCContext';
import { useLocations } from '../../locations/context/LocationContext';
import { useAuth } from 'features/user-management';
import Card from '../../../../core/components/Card';
import Button from '../../../../core/components/Button';
import Typography from '../../../../core/components/Typography';
import RumorBatchActions from './RumorBatchActions';
import { useNavigation } from 'shared/hooks/useNavigation';
import clsx from 'clsx';
import { HelpCircle, RotateCw, Users, MapPin, Scroll } from 'lucide-react';
import {
  RosterStatusBar,
  RosterFilterBar,
  RosterFilterPills,
  RosterGroup,
  RosterRow,
  RosterField,
  type RosterSegment,
  type RosterFilterOption,
} from 'core/components/Roster';

interface RumorDirectoryProps {
  rumors: Rumor[];
  isLoading?: boolean;
}

/** Column template shared by every row, so the columns line up across groups. */
const ROW_GRID =
  'grid-cols-[1fr_auto] md:grid-cols-[1.6fr_128px_128px_150px_26px]';

const SOURCE_FILTERS: RosterFilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'npc', label: 'NPC' },
  { value: 'tavern', label: 'Tavern' },
  { value: 'notice', label: 'Notice' },
  { value: 'traveler', label: 'Traveler' },
  { value: 'other', label: 'Other' },
];

/** Status as a labelled chip. A bare colour stripe needed a legend nobody had. */
const STATUS_CLASS: Record<RumorStatus, string> = {
  confirmed: 'rumor-status-confirmed',
  unconfirmed: 'rumor-status-unconfirmed',
  false: 'rumor-status-false',
};

const STATUS_DOT: Record<RumorStatus, string> = {
  confirmed: 'bg-status-completed',
  unconfirmed: 'bg-status-unknown',
  false: 'bg-status-failed',
};

const formatStatus = (status: RumorStatus): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

const formatSourceType = (type: SourceType): string =>
  type === 'npc' ? 'NPC' : type.charAt(0).toUpperCase() + type.slice(1);

const RumorDirectory: React.FC<RumorDirectoryProps> = ({
  rumors: initialRumors,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RumorStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceType | 'all'>('all');
  const [highlightedRumorId, setHighlightedRumorId] = useState<string | null>(null);
  const [expandedRumorId, setExpandedRumorId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRumors, setSelectedRumors] = useState<Set<string>>(new Set());

  const { deleteRumor } = useRumors();
  const { getNPCById } = useNPCs();
  const { getLocationById } = useLocations();
  const { user } = useAuth();
  const { navigateToPage, createPath, getCurrentQueryParams } = useNavigation();
  const { highlight: highlightId } = getCurrentQueryParams();

  // Check for a highlighted rumor from the URL and scroll to it
  useEffect(() => {
    if (highlightId) {
      setHighlightedRumorId(highlightId);
      setTimeout(() => {
        const element = document.getElementById(`rumor-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [highlightId, initialRumors]);

  // Status counts drive the one bar that replaced the "All Status" dropdown.
  // Confirmed / unconfirmed / false are the entire status enum, so the three
  // segments sum to the total and the bar needs no separate "other" bucket.
  const statusSegments: RosterSegment[] = useMemo(() => {
    const count = (status: RumorStatus) =>
      initialRumors.filter(rumor => rumor.status === status).length;
    return [
      { key: 'confirmed', label: 'confirmed', count: count('confirmed'), colorClass: 'bg-status-completed' },
      { key: 'unconfirmed', label: 'unconfirmed', count: count('unconfirmed'), colorClass: 'bg-status-unknown' },
      { key: 'false', label: 'false', count: count('false'), colorClass: 'bg-status-failed' },
    ];
  }, [initialRumors]);

  // Filter rumors based on search and filters. Location is deliberately not
  // part of this filter set — see the grouping rationale below.
  const filteredRumors = useMemo(() => {
    return initialRumors.filter(rumor => {
      if (statusFilter !== 'all' && rumor.status !== statusFilter) {
        return false;
      }

      if (sourceFilter !== 'all' && rumor.sourceType !== sourceFilter) {
        return false;
      }

      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          rumor.title.toLowerCase().includes(search) ||
          rumor.content.toLowerCase().includes(search) ||
          rumor.sourceName.toLowerCase().includes(search) ||
          (rumor.createdByUsername && rumor.createdByUsername.toLowerCase().includes(search))
        );
      }

      return true;
    });
  }, [initialRumors, statusFilter, sourceFilter, searchQuery]);

  // Group rumors by location rather than offering a third dropdown for it.
  // `location` is free text and frequently unset (unlike `sourceType`, a
  // five-value enum that fits pills, or `status`, which already drives the
  // bar above) so forcing it into pills would either omit real values or
  // sprawl unpredictably. Grouping still answers the question a location
  // filter existed for — "what have I heard about this place?" — while
  // reading as a rumor's context rather than a control to operate. Rumors
  // with no location land in a muted "Location unknown" group, mirroring
  // NPCDirectory's grouping of NPCs with no location.
  const groupedRumors = useMemo(() => {
    return filteredRumors.reduce((acc, rumor) => {
      const location = rumor.location || 'Location unknown';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(rumor);
      return acc;
    }, {} as Record<string, Rumor[]>);
  }, [filteredRumors]);

  const handleLocationClick = (location: string) => {
    navigateToPage(createPath('/locations', {}, { highlight: location }));
  };

  const handleNPCClick = (npcId: string) => {
    navigateToPage(createPath('/npcs', {}, { highlight: npcId }));
  };

  const handleRelatedLocationClick = (locationId: string) => {
    navigateToPage(createPath('/locations', {}, { highlight: locationId }));
  };

  const handleQuestClick = (questId: string) => {
    navigateToPage(createPath('/quests', {}, { highlight: questId }));
  };

  const handleEdit = (rumorId: string) => {
    navigateToPage(`/rumors/edit/${rumorId}`);
  };

  const handleDelete = async (rumorId: string) => {
    try {
      await deleteRumor(rumorId);
    } catch (error) {
      console.error('Failed to delete rumor:', error);
    }
  };

  // Handle rumor selection for batch actions
  const handleSelectRumor = (rumorId: string, selected: boolean) => {
    setSelectedRumors(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(rumorId);
      } else {
        newSet.delete(rumorId);
      }
      return newSet;
    });
  };

  // Handle batch selection toggle
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Clear selections when exiting selection mode
      setSelectedRumors(new Set());
    }
  };

  // Handle batch actions completion
  const handleBatchActionsComplete = () => {
    setSelectionMode(false);
    setSelectedRumors(new Set());
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Content>
          <div className="flex justify-center items-center py-8">
            <RotateCw className="w-6 h-6 animate-spin primary mr-3" />
            <Typography>Loading rumors...</Typography>
          </div>
        </Card.Content>
      </Card>
    );
  }

  const groups = Object.entries(groupedRumors);

  return (
    <div className="space-y-6">
      {/* One status bar that also filters, replacing the "All Status" dropdown */}
      <RosterStatusBar
        total={initialRumors.length}
        totalLabel="rumors gathered"
        segments={statusSegments}
        activeKey={statusFilter}
        onSelect={key => setStatusFilter(key as RumorStatus | 'all')}
      />

      {/* Search and source filter, on one row rather than three stacked dropdowns */}
      <RosterFilterBar
        placeholder="Search rumors..."
        value={searchQuery}
        onChange={setSearchQuery}
      >
        <RosterFilterPills
          options={SOURCE_FILTERS}
          value={sourceFilter}
          onChange={value => setSourceFilter(value as SourceType | 'all')}
          label="Filter by source"
        />

        <Button
          variant={selectionMode ? 'primary' : 'outline'}
          size="sm"
          onClick={toggleSelectionMode}
        >
          {selectionMode ? 'Exit Selection' : 'Select Rumors'}
        </Button>
      </RosterFilterBar>

      {/* Batch actions bar — only visible in selection mode, once something is selected */}
      {selectionMode && (
        <RumorBatchActions
          selectedRumors={selectedRumors}
          onComplete={handleBatchActionsComplete}
        />
      )}

      {/* Rumor roster by location */}
      {groups.length > 0 ? (
        groups.map(([location, locationRumors]) => {
          const isUnknown = location === 'Location unknown';

          return (
            <RosterGroup
              key={location}
              title={location}
              count={locationRumors.length}
              muted={isUnknown}
              onOpen={isUnknown ? undefined : () => handleLocationClick(location)}
            >
              {locationRumors.map((rumor, index) => {
                const isExpanded = expandedRumorId === rumor.id;
                const relatedNPCs = Array.isArray(rumor.relatedNPCs) ? rumor.relatedNPCs : [];
                const relatedLocations = Array.isArray(rumor.relatedLocations) ? rumor.relatedLocations : [];

                return (
                  <RosterRow
                    key={rumor.id}
                    id={`rumor-${rumor.id}`}
                    gridClassName={ROW_GRID}
                    isFirst={index === 0}
                    highlighted={highlightedRumorId === rumor.id}
                    expanded={isExpanded}
                    toggleLabel={rumor.title}
                    onToggle={() => setExpandedRumorId(isExpanded ? null : rumor.id)}
                    leadingControl={
                      selectionMode ? (
                        <input
                          type="checkbox"
                          aria-label={`Select ${rumor.title}`}
                          checked={selectedRumors.has(rumor.id)}
                          onChange={(e) => handleSelectRumor(rumor.id, e.target.checked)}
                        />
                      ) : undefined
                    }
                    expandedContent={
                      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-7 pt-4">
                        <div className="flex flex-col gap-4">
                          <RosterField label="Content" emptyText="No details recorded">
                            {rumor.content ? (
                              <Typography variant="body-sm">{rumor.content}</Typography>
                            ) : undefined}
                          </RosterField>

                          <RosterField label="Notes" emptyText="No notes yet">
                            {rumor.notes?.length ? (
                              <div className="flex flex-col gap-2">
                                {rumor.notes.map(note => (
                                  <div
                                    key={note.id}
                                    className="flex gap-3 px-3 py-2.5 rounded-md bg-secondary"
                                  >
                                    <Typography
                                      variant="body-sm"
                                      color="muted"
                                      className="text-xs whitespace-nowrap"
                                    >
                                      {new Date(note.dateAdded).toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="body-sm">{note.content}</Typography>
                                  </div>
                                ))}
                              </div>
                            ) : undefined}
                          </RosterField>
                        </div>

                        <div className="flex flex-col gap-4">
                          <RosterField label="Heard from" emptyText="Not recorded">
                            {rumor.sourceName ? (
                              <Typography variant="body-sm">
                                {rumor.sourceName} ({formatSourceType(rumor.sourceType)})
                              </Typography>
                            ) : undefined}
                          </RosterField>

                          <RosterField label="Related NPCs" emptyText="No NPCs linked">
                            {relatedNPCs.length ? (
                              <div className="flex flex-col gap-1.5">
                                {relatedNPCs.map(npcId => {
                                  const npc = getNPCById(npcId);
                                  return (
                                    <button
                                      key={npcId}
                                      type="button"
                                      onClick={() => handleNPCClick(npcId)}
                                      className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded-md selectable-item"
                                    >
                                      <Users size={14} className="shrink-0 typography-secondary" />
                                      <Typography variant="body-sm">{npc?.name || npcId}</Typography>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : undefined}
                          </RosterField>

                          <RosterField label="Related locations" emptyText="No locations linked">
                            {relatedLocations.length ? (
                              <div className="flex flex-col gap-1.5">
                                {relatedLocations.map(locationId => {
                                  const relatedLocation = getLocationById(locationId);
                                  return (
                                    <button
                                      key={locationId}
                                      type="button"
                                      onClick={() => handleRelatedLocationClick(locationId)}
                                      className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded-md selectable-item"
                                    >
                                      <MapPin size={14} className="shrink-0 typography-secondary" />
                                      <Typography variant="body-sm">
                                        {relatedLocation?.name || locationId}
                                      </Typography>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : undefined}
                          </RosterField>

                          {/* convertedToQuestId is meaningful, not incidental: it is the
                              one signal that a rumor stopped being a rumor and became a
                              tracked quest, so it gets its own field and a live link
                              rather than being folded into "notes" or omitted. */}
                          <RosterField label="Converted to quest" emptyText="Not converted to a quest">
                            {rumor.convertedToQuestId ? (
                              <button
                                type="button"
                                onClick={() => handleQuestClick(rumor.convertedToQuestId!)}
                                className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded-md selectable-item"
                              >
                                <Scroll size={14} className="shrink-0 typography-secondary" />
                                <Typography variant="body-sm">View quest</Typography>
                              </button>
                            ) : undefined}
                          </RosterField>

                          <RosterField label="Recorded by" emptyText="Unknown">
                            {rumor.createdByUsername ? (
                              <Typography variant="body-sm">{rumor.createdByUsername}</Typography>
                            ) : undefined}
                          </RosterField>

                          {user && (
                            <div className="flex gap-2 mt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(rumor.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(rumor.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    }
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Typography variant="body" className="font-semibold truncate">
                          {rumor.title}
                        </Typography>
                        {rumor.convertedToQuestId && (
                          <span className="hidden md:inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-secondary typography-secondary">
                            <Scroll size={10} aria-hidden="true" />
                            Quest
                          </span>
                        )}
                      </div>
                      <Typography variant="body-sm" color="secondary" className="text-sm truncate">
                        {rumor.sourceName}
                      </Typography>
                    </div>

                    {/* Status: dot plus the word, so colour is never the only cue */}
                    <Typography
                      variant="body-sm"
                      className={clsx(
                        'hidden md:flex items-center gap-2 text-sm font-semibold',
                        STATUS_CLASS[rumor.status]
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx('w-[7px] h-[7px] rounded-full shrink-0', STATUS_DOT[rumor.status])}
                      />
                      {formatStatus(rumor.status)}
                    </Typography>

                    <Typography
                      variant="body-sm"
                      className="hidden md:inline-flex justify-self-start px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary typography-secondary"
                    >
                      {formatSourceType(rumor.sourceType)}
                    </Typography>

                    <Typography
                      variant="body-sm"
                      color="secondary"
                      className="hidden md:flex items-center gap-1.5 text-sm truncate"
                    >
                      {rumor.convertedToQuestId ? (
                        <>
                          <Scroll size={13} className="shrink-0" aria-hidden="true" />
                          Converted to quest
                        </>
                      ) : (
                        '—'
                      )}
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
            <HelpCircle className="w-12 h-12 mx-auto typography-secondary mb-4" />
            <Typography variant="h3" className="mb-2">
              No Rumors Found
            </Typography>
            <Typography color="secondary">
              {searchQuery || statusFilter !== 'all' || sourceFilter !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'There are no rumors to display. Add your first rumor to get started.'}
            </Typography>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default RumorDirectory;
