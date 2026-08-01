// src/features/campaign-entities/quests/components/QuestDirectory.tsx
import React, { useState, useMemo } from 'react';
import { Quest, QuestStatus } from '../types';
import { useQuests } from '../context/QuestContext';
import { useNPCs } from '../../npcs/context/NPCContext';
import { useLocations } from '../../locations/context/LocationContext';
import { resolveLocationName } from '../../locations/utils/location-display';
import { useAuth } from 'features/user-management';
import Card from '../../../../core/components/Card';
import Button from '../../../../core/components/Button';
import Typography from '../../../../core/components/Typography';
import DeleteConfirmationDialog from 'shared/components/DeleteConfirmationDialog';
import { useNavigation } from 'shared/hooks/useNavigation';
import clsx from 'clsx';
import { Scroll, MapPin, Edit, Trash2, Users } from 'lucide-react';
import {
  RosterStatusBar,
  RosterFilterBar,
  RosterFilterSelect,
  RosterGroup,
  RosterRow,
  RosterField,
  type RosterSegment,
  type RosterFilterOption,
} from 'core/components/Roster';

interface QuestDirectoryProps {
  quests: Quest[];
  isLoading?: boolean;
}

/** Column template shared by every row, so the columns line up across groups. */
const ROW_GRID =
  'grid-cols-[1fr_auto] md:grid-cols-[1.7fr_130px_190px_150px_26px]';

/**
 * Fixed, ordered groups instead of the location-based grouping NPCs use.
 *
 * `QuestStatus` has exactly three members, so grouping by status gives every
 * quest list the same stable shape -- "what's still open", "what's done",
 * "what failed" -- regardless of how many quests exist. Location, by contrast,
 * is open-ended and often unset, and would scatter quests across a long tail of
 * mostly-singleton groups. Location stays as a dedicated filter below instead.
 */
const STATUS_GROUPS: { key: QuestStatus; title: string }[] = [
  { key: 'active', title: 'Active Quests' },
  { key: 'completed', title: 'Completed Quests' },
  { key: 'failed', title: 'Failed Quests' },
];

/** Segment colour per status, reusing the same tokens as the row chip and bar. */
const STATUS_COLOR: Record<QuestStatus, string> = {
  active: 'bg-status-active',
  completed: 'bg-status-completed',
  failed: 'bg-status-failed',
};

/**
 * The quest roster: status bar, filters, status-grouped rows that expand in place.
 *
 * Extracted from QuestsPage, which was 613 lines against 84-114 for the other three
 * entity pages because it was the only one carrying its own roster. That asymmetry
 * is what left Quests behind on every pass over the directories -- it kept its stat
 * cards when the other three lost theirs, and kept the pre-redesign filter row when
 * the other three moved to the shared one. Now all four pages are a header plus a
 * directory, and a change to the roster shape is one edit in four sibling files
 * rather than three plus a page.
 */
const QuestDirectory: React.FC<QuestDirectoryProps> = ({
  quests,
  isLoading = false,
}) => {
  const { deleteQuest } = useQuests();
  const { getNPCById } = useNPCs();
  const { locations } = useLocations();
  const { user } = useAuth();
  const { navigateToPage, createPath, getCurrentQueryParams } = useNavigation();
  const { highlight: highlightedQuestId } = getCurrentQueryParams();

  const [statusFilter, setStatusFilter] = useState<QuestStatus | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quest | null>(null);

  // Status counts drive the one bar that replaced three stat cards. All three
  // segments always sum to the total -- unlike a two-way "active vs completed"
  // split, there is no silently-implied remainder, since every quest has
  // exactly one of these three statuses.
  const statusSegments: RosterSegment[] = useMemo(() => {
    const count = (status: QuestStatus) =>
      quests.filter(q => q.status === status).length;
    return [
      { key: 'active', label: 'active', count: count('active'), colorClass: STATUS_COLOR.active },
      { key: 'completed', label: 'completed', count: count('completed'), colorClass: STATUS_COLOR.completed },
      { key: 'failed', label: 'failed', count: count('failed'), colorClass: STATUS_COLOR.failed },
    ];
  }, [quests]);

  // `quest.location` holds the location's id, so both the filter options and the
  // row's location cell used to read as slugs -- "mines-of-moria" where the
  // Locations page says "Mines of Moria" (#1412, the same defect NPCDirectory
  // had). Resolve once here and key everything -- display, options and the
  // filter comparison -- off the resolved name, so the three cannot disagree.
  const questLocationName = useMemo(() => {
    const names = new Map<string, string>();
    quests.forEach(quest => {
      if (quest.location) {
        names.set(quest.id, resolveLocationName(quest.location, locations));
      }
    });
    return names;
  }, [quests, locations]);

  // Locations come from the quest data, so the option set is unbounded -- this is
  // the one filter dimension in any directory that pills cannot serve, and the
  // reason RosterFilterSelect exists.
  const locationOptions: RosterFilterOption[] = useMemo(() => {
    const uniqueLocations = new Set(questLocationName.values());
    return [
      { value: 'all', label: 'All Locations' },
      ...Array.from(uniqueLocations).sort().map(location => ({
        value: location,
        label: location,
      })),
    ];
  }, [questLocationName]);

  // Filter quests based on status, location and search query
  const filteredQuests = useMemo(() => {
    return quests.filter(quest => {
      // Status filter
      if (statusFilter !== 'all' && quest.status !== statusFilter) {
        return false;
      }

      // Location filter - must match exactly, on the same resolved name the
      // options were built from.
      if (locationFilter !== 'all') {
        if (questLocationName.get(quest.id)?.toLowerCase() !== locationFilter.toLowerCase()) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          quest.title.toLowerCase().includes(search) ||
          quest.description.toLowerCase().includes(search) ||
          quest.objectives.some(obj => obj.description.toLowerCase().includes(search)) ||
          quest.relatedNPCIds?.some(id => {
            // Resolve the id to its NPC's display name -- the same lookup the
            // expanded row below uses -- so a user typing a person's name
            // actually finds the quest. The raw id is still matched as a
            // fallback (`||`, never replacing the name check) so deep links
            // and copy-pasted ids keep working. An id that doesn't resolve
            // (deleted NPC) is never silently dropped: it still matches on
            // its raw text, mirroring the expanded row, which surfaces an
            // unresolvable id as "<id> (not found in NPC directory)" rather
            // than hiding it.
            const npc = getNPCById(id);
            return (
              npc?.name.toLowerCase().includes(search) ||
              id.toLowerCase().includes(search)
            );
          })
        );
      }

      return true;
    });
  }, [quests, statusFilter, locationFilter, searchQuery, getNPCById, questLocationName]);

  // Grouped by status, in the fixed order above, skipping groups with nothing
  // left after filtering.
  const groupedQuests = useMemo(() => {
    return STATUS_GROUPS.map(group => ({
      ...group,
      quests: filteredQuests.filter(q => q.status === group.key),
    })).filter(group => group.quests.length > 0);
  }, [filteredQuests]);

  const locationExists = (locationName: string): boolean =>
    locations.some(loc => loc.name.toLowerCase() === locationName.toLowerCase());

  const handleOpenLocation = (locationName: string) => {
    navigateToPage(createPath('/locations', {}, { highlight: locationName }));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteQuest(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Content>
          <Typography>Loading quests...</Typography>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* One status bar that also filters, replacing three non-clickable stat cards */}
      <RosterStatusBar
        total={quests.length}
        totalLabel="sworn so far"
        segments={statusSegments}
        activeKey={statusFilter}
        onSelect={value => setStatusFilter(value as QuestStatus | 'all')}
      />

      {/* Search and location filter, on the row every directory shares */}
      <RosterFilterBar
        placeholder="Search quests..."
        value={searchQuery}
        onChange={setSearchQuery}
      >
        {locationOptions.length > 1 && (
          <RosterFilterSelect
            options={locationOptions}
            value={locationFilter}
            onChange={setLocationFilter}
            label="Filter by location"
          />
        )}
      </RosterFilterBar>

      {/* Quest roster by status */}
      {groupedQuests.length > 0 ? (
        groupedQuests.map(group => (
          <RosterGroup key={group.key} title={group.title} count={group.quests.length}>
            {group.quests.map((quest, index) => {
              const isExpanded = expandedQuestId === quest.id;
              const completedObjectives = quest.objectives.filter(obj => obj.completed).length;
              const totalObjectives = quest.objectives.length;

              return (
                <RosterRow
                  key={quest.id}
                  id={`quest-${quest.id}`}
                  gridClassName={ROW_GRID}
                  isFirst={index === 0}
                  highlighted={highlightedQuestId === quest.id}
                  expanded={isExpanded}
                  toggleLabel={quest.title}
                  onToggle={() => setExpandedQuestId(isExpanded ? null : quest.id)}
                  expandedContent={
                    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-7 pt-4">
                      <div className="flex flex-col gap-4">
                        <RosterField label="Description">
                          <Typography variant="body-sm">{quest.description}</Typography>
                        </RosterField>

                        <RosterField label="Background" emptyText="No background written yet">
                          {quest.background ? (
                            <Typography variant="body-sm">{quest.background}</Typography>
                          ) : undefined}
                        </RosterField>

                        <RosterField
                          label="Objectives"
                          emptyText="No objectives recorded"
                        >
                          {quest.objectives.length ? (
                            <div className="space-y-2">
                              {quest.objectives.map(objective => (
                                <div key={objective.id} className="flex items-center gap-2">
                                  <div
                                    aria-hidden="true"
                                    className={clsx(
                                      'w-4 h-4 rounded border shrink-0',
                                      objective.completed ? 'objective-completed' : 'objective-pending'
                                    )}
                                  />
                                  <Typography
                                    variant="body-sm"
                                    color={objective.completed ? 'secondary' : 'default'}
                                    className={objective.completed ? 'line-through' : ''}
                                  >
                                    {objective.description}
                                  </Typography>
                                </div>
                              ))}
                            </div>
                          ) : undefined}
                        </RosterField>

                        <RosterField label="Initial Leads" emptyText="No leads recorded">
                          {quest.leads?.length ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {quest.leads.map((lead, leadIndex) => (
                                <li key={leadIndex}>
                                  <Typography variant="body-sm">{lead}</Typography>
                                </li>
                              ))}
                            </ul>
                          ) : undefined}
                        </RosterField>

                        <RosterField label="Possible Complications" emptyText="No complications recorded">
                          {quest.complications?.length ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {quest.complications.map((complication, cIndex) => (
                                <li key={cIndex}>
                                  <Typography variant="body-sm">{complication}</Typography>
                                </li>
                              ))}
                            </ul>
                          ) : undefined}
                        </RosterField>

                        <RosterField label="Rewards" emptyText="No rewards recorded">
                          {quest.rewards?.length ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {quest.rewards.map((reward, rIndex) => (
                                <li key={rIndex}>
                                  <Typography variant="body-sm">{reward}</Typography>
                                </li>
                              ))}
                            </ul>
                          ) : undefined}
                        </RosterField>
                      </div>

                      <div className="flex flex-col gap-4">
                        <RosterField label="Level Range" emptyText="Not recorded">
                          {quest.levelRange ? (
                            <Typography variant="body-sm">{quest.levelRange}</Typography>
                          ) : undefined}
                        </RosterField>

                        <RosterField label="Completed on" emptyText={quest.status === 'completed' ? 'Date not recorded' : 'Not yet completed'}>
                          {quest.status === 'completed' && quest.dateCompleted ? (
                            <Typography variant="body-sm">{quest.dateCompleted}</Typography>
                          ) : undefined}
                        </RosterField>

                        <RosterField label="Key Locations" emptyText="No key locations recorded">
                          {quest.keyLocations?.length ? (
                            <div className="flex flex-col gap-2">
                              {quest.keyLocations.map((location, locIndex) => (
                                locationExists(location.name) ? (
                                  <Button
                                    key={locIndex}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenLocation(location.name)}
                                    className="w-full"
                                    centered={false}
                                  >
                                    <div className="flex items-start gap-2 text-left">
                                      <MapPin size={16} className="mt-1 location-status-explored" />
                                      <div className="flex-1">
                                        <Typography variant="body-sm" className="font-medium">
                                          {location.name}
                                        </Typography>
                                        <Typography variant="body-sm" color="secondary">
                                          {location.description}
                                        </Typography>
                                      </div>
                                    </div>
                                  </Button>
                                ) : (
                                  <div key={locIndex} className="flex items-start gap-2 px-3 py-2 rounded-md bg-secondary">
                                    <MapPin size={16} className="mt-1 typography-secondary" />
                                    <div className="flex-1">
                                      <Typography variant="body-sm" className="font-medium">
                                        {location.name}
                                      </Typography>
                                      <Typography variant="body-sm" color="secondary">
                                        {location.description}
                                      </Typography>
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          ) : undefined}
                        </RosterField>

                        <RosterField label="Related NPCs" emptyText="No related NPCs recorded">
                          {quest.relatedNPCIds?.length ? (
                            <div className="flex flex-col gap-2">
                              {quest.relatedNPCIds.map(npcId => {
                                const npc = getNPCById(npcId);
                                if (!npc) {
                                  return (
                                    <Typography key={npcId} variant="body-sm" color="secondary" className="italic">
                                      {npcId} (not found in NPC directory)
                                    </Typography>
                                  );
                                }
                                return (
                                  <Button
                                    key={npcId}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigateToPage(createPath('/npcs', {}, { highlight: npcId }))}
                                    className="w-full"
                                    centered={false}
                                  >
                                    <div className="flex items-start gap-2 text-left">
                                      <Users size={16} className={clsx('mt-1', `npc-relationship-${npc.relationship}`)} />
                                      <div className="flex-1">
                                        <Typography variant="body-sm" className="font-medium">
                                          {npc.name}
                                          {npc.title && (
                                            <span className="typography-secondary ml-1">- {npc.title}</span>
                                          )}
                                        </Typography>
                                        {npc.location && (
                                          <Typography variant="body-sm" color="secondary">
                                            {npc.location}
                                          </Typography>
                                        )}
                                      </div>
                                    </div>
                                  </Button>
                                );
                              })}
                            </div>
                          ) : undefined}
                        </RosterField>

                        <RosterField label="Important NPCs" emptyText="No important NPCs recorded">
                          {quest.importantNPCs?.length ? (
                            <div className="flex flex-col gap-2">
                              {quest.importantNPCs.map((npc, npcIndex) => (
                                <div key={npcIndex} className="px-3 py-2 rounded-md bg-secondary">
                                  <Typography variant="body-sm" className="font-medium">
                                    {npc.name}
                                  </Typography>
                                  <Typography variant="body-sm" color="secondary">
                                    {npc.description}
                                  </Typography>
                                </div>
                              ))}
                            </div>
                          ) : undefined}
                        </RosterField>

                        {user && (
                          <div className="flex gap-2 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigateToPage(`/quests/edit/${quest.id}`)}
                              startIcon={<Edit size={16} />}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(quest)}
                              startIcon={<Trash2 size={16} />}
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
                    <Typography variant="body" className="font-semibold truncate">
                      {quest.title}
                    </Typography>
                  </div>

                  {/* Status: dot plus the word, so colour is never the only cue */}
                  <Typography
                    variant="body-sm"
                    className={clsx(
                      'hidden md:flex items-center gap-2 text-sm font-semibold',
                      `quest-status-${quest.status}`
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx('w-[7px] h-[7px] rounded-full shrink-0', STATUS_COLOR[quest.status])}
                    />
                    {quest.status.charAt(0).toUpperCase() + quest.status.slice(1)}
                  </Typography>

                  {/* Objective progress -- the detail that makes quests more than a
                      plain roster entry, so it stays visible on the collapsed row. */}
                  <div className="hidden md:flex flex-col gap-1 min-w-0">
                    <Typography variant="body-sm" color="secondary" className="text-sm">
                      {totalObjectives > 0
                        ? `${completedObjectives} of ${totalObjectives} objectives`
                        : 'No objectives'}
                    </Typography>
                    {totalObjectives > 0 && (
                      <div className="w-full rounded-full h-1.5 progress-container">
                        <div
                          className={clsx('rounded-full h-1.5', `progress-bar-${quest.status}`)}
                          style={{ width: `${(completedObjectives / totalObjectives) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <Typography
                    variant="body-sm"
                    color="secondary"
                    className="hidden md:block text-sm truncate"
                  >
                    {questLocationName.get(quest.id) || '—'}
                  </Typography>
                </RosterRow>
              );
            })}
          </RosterGroup>
        ))
      ) : (
        <Card>
          <Card.Content className="text-center py-12">
            <Scroll className="w-12 h-12 mx-auto mb-4 typography-secondary" />
            <Typography variant="h3" className="mb-2">
              No Quests Found
            </Typography>
            <Typography color="secondary">
              {searchQuery
                ? 'No quests match your search criteria'
                : statusFilter === 'all'
                  ? 'There are no quests to display'
                  : `No ${statusFilter} quests found`}
            </Typography>
          </Card.Content>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.title || ''}
        itemType="Quest"
      />
    </div>
  );
};

export default QuestDirectory;
