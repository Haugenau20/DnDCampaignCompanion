// src/features/campaign-entities/rumors/components/RumorDirectory.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Rumor, RumorStatus, SourceType } from '../types';
import { useRumors } from '../context/RumorContext';
import { useNPCs } from '../../npcs/context/NPCContext';
import { useLocations } from '../../locations/context/LocationContext';
import { resolveLocationName } from '../../locations/utils/location-display';
import Button from '../../../../core/components/Button';
import Typography from '../../../../core/components/Typography';
import RumorBatchActions from './RumorBatchActions';
import RumorComposer from './RumorComposer';
import RumorRowEditor, { draftFromRumor, type RumorDraft } from './RumorRowEditor';
import { useNavigation } from 'shared/hooks/useNavigation';
import useHighlightTarget from 'shared/hooks/useHighlightTarget';
import type { AttachKind } from 'shared/components/attach-tray/attachCandidates';
import { Scroll } from 'lucide-react';
import {
  RUMOR_STATUS_FILL,
  RUMOR_STATUS_TONE,
  formatRumorStatus,
  formatSourceType,
} from '../utils/rumor-presentation';
import {
  RosterStatusBar,
  RosterFilterBar,
  RosterFilterPills,
  RosterGroup,
  RosterRow,
  type RosterSegment,
  type RosterFilterOption,
  RosterSkeleton,
  RosterEmpty,
  RosterStatus,
  type RosterStatusTone,
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

/**
 * Status, the status word, the ramp stop and the source label all now live in
 * `utils/rumor-presentation.ts`.
 *
 * They were here, and one of them was wrong in a way nothing could see: the
 * comment above the tone map said confirmed and disproved "sit on the same
 * rung", and the map under it gave disproved `valence-3` -- the red a failed
 * quest wears. `15-7` moved them out and made the code match what the comment,
 * the colour schema and T008 all already said.
 */

const RumorDirectory: React.FC<RumorDirectoryProps> = ({
  rumors: initialRumors,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RumorStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceType | 'all'>('all');
  const [expandedRumorId, setExpandedRumorId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRumors, setSelectedRumors] = useState<Set<string>>(new Set());
  /** The rumour the composer just made, so its row opens with the caret in it. */
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  /**
   * Typed text for every open (or recently open) row, keyed by rumour id.
   *
   * **Held here rather than in the editor** (item 8). Filtering, sorting, or
   * another player's status change re-renders this list, and a row that stops
   * matching the filter unmounts with whatever was being typed in it. A draft
   * kept in the row's own state dies at that moment; kept here it survives the
   * re-render, the filter, and the trip back.
   */
  const [drafts, setDrafts] = useState<Record<string, RumorDraft>>({});

  const { addRumor, deleteRumor, updateRumor, updateRumorStatus } = useRumors();
  const { npcs } = useNPCs();
  const { locations } = useLocations();
  const { navigateToPage, createPath, getCurrentQueryParams } = useNavigation();
  const { highlight: highlightId } = getCurrentQueryParams();

  /**
   * T014: one hook, four consumers.
   *
   * This directory matched by id already, but never expanded the target -- so
   * a link landed on a row that was still closed.
   */
  const { highlightedId: highlightedRumorId } = useHighlightTarget({
    items: initialRumors,
    highlight: highlightId,
    idOf: (rumor: Rumor) => rumor.id,
    domIdPrefix: 'rumor',
    onReveal: ([rumorId]) => setExpandedRumorId(rumorId),
  });

  // Status counts drive the one bar that replaced the "All Status" dropdown.
  // Confirmed / unconfirmed / false are the entire status enum, so the three
  // segments sum to the total and the bar needs no separate "other" bucket.
  const statusSegments: RosterSegment[] = useMemo(() => {
    const count = (status: RumorStatus) =>
      initialRumors.filter(rumor => rumor.status === status).length;
    return [
      // Confirmed and false share a rung: both are fully known, and a
      // disproven rumour is a resolved one rather than a defeat. They are told
      // apart by their labels here and by 12-5's strike in the rows -- not by
      // hue, which is what put a false rumour in the red of a lost quest.
      { key: 'confirmed', label: 'confirmed', count: count('confirmed'), colorClass: RUMOR_STATUS_FILL.confirmed },
      { key: 'unconfirmed', label: 'unconfirmed', count: count('unconfirmed'), colorClass: RUMOR_STATUS_FILL.unconfirmed },
      // "Disproved", never "false", even here (item 6).
      { key: 'false', label: 'disproved', count: count('false'), colorClass: RUMOR_STATUS_FILL.false },
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
  //
  // Rumors store `location` as a display name rather than an id, so these
  // headings read correctly today by luck of the data, not by construction —
  // NPCs and Quests store the id and printed slugs (#1412). Resolving here too
  // makes that independent of which form a given record happens to hold, and
  // canonicalises case so "rivendell" and "Rivendell" are one group.
  //
  // `resolveLocationName` prefers `rumor.locationId` (the canonical
  // reference) and falls back to the legacy `rumor.location` free text for
  // documents written before that field existed; see the contract on
  // `NPC.location`.
  const groupedRumors = useMemo(() => {
    return filteredRumors.reduce((acc, rumor) => {
      const location =
        resolveLocationName({ locationId: rumor.locationId, location: rumor.location }, locations) ??
        'Location unknown';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(rumor);
      return acc;
    }, {} as Record<string, Rumor[]>);
  }, [filteredRumors, locations]);

  const handleLocationClick = (location: string) => {
    navigateToPage(createPath('/locations', {}, { highlight: location }));
  };

  // The quest this rumour became, at its own address (`15-5` item 11). A
  // rumour could be converted into a quest and then not refer to it; this is
  // the link that closes that.
  const handleQuestClick = (questId: string) => {
    navigateToPage(`/quests/${questId}`);
  };

  /**
   * Create a rumour from the composer and open its row.
   *
   * Everything but the title is left for the row underneath: a rumour is
   * recorded while somebody is still talking, and asking for a source before
   * accepting the sentence is how a note ends up not written at all.
   */
  const handleAdd = async (title: string): Promise<string> => {
    const id = await addRumor({
      title,
      content: '',
      status: 'unconfirmed',
      // Not a source kind -- the absence of one. See `UNCHOSEN_SOURCE`.
      sourceType: 'other',
      sourceName: '',
      relatedNPCs: [],
      relatedLocations: [],
      notes: [],
    });
    setExpandedRumorId(id);
    setJustAddedId(id);
    return id;
  };

  const setDraft = (rumorId: string, patch: Partial<RumorDraft>, rumor: Rumor) =>
    setDrafts((previous) => ({
      ...previous,
      [rumorId]: { ...(previous[rumorId] ?? draftFromRumor(rumor)), ...patch },
    }));

  const clearDraft = (rumorId: string) =>
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[rumorId];
      return next;
    });

  /** Every write here re-reads through the context, as the pages do. */
  const handleSave = async (rumor: Rumor, draft: RumorDraft) => {
    await updateRumor({
      ...rumor,
      title: draft.title,
      content: draft.content,
      sourceType: draft.sourceType,
      sourceName: draft.sourceName,
      ...(draft.sourceNpcId ? { sourceNpcId: draft.sourceNpcId } : { sourceNpcId: '' }),
    });
    clearDraft(rumor.id);
  };

  const handleDelete = async (rumorId: string) => {
    await deleteRumor(rumorId);
    clearDraft(rumorId);
    setExpandedRumorId((open) => (open === rumorId ? null : open));
  };

  /**
   * What a rumour points at, attached in place.
   *
   * A location can mean two things to a rumour -- where it was heard
   * (`locationId`) and what it is about (`relatedLocations`) -- and the tray
   * cannot ask which. It writes the one the record is missing: the first place
   * attached becomes where it was heard, because that is what the directory
   * groups by and what a reader sees first; later ones are what it points at.
   */
  const handleAttach = async (rumor: Rumor, id: string, kind: AttachKind) => {
    if (kind === 'npc') {
      await updateRumor({
        ...rumor,
        relatedNPCs: Array.from(new Set([...(rumor.relatedNPCs ?? []), id])),
      });
      return;
    }

    const place = locations.find((candidate) => candidate.id === id);
    if (!rumor.locationId) {
      await updateRumor({ ...rumor, locationId: id, location: place?.name ?? '' });
      return;
    }

    await updateRumor({
      ...rumor,
      relatedLocations: Array.from(new Set([...(rumor.relatedLocations ?? []), id])),
    });
  };

  const handleDetach = async (rumor: Rumor, id: string) => {
    if (id === rumor.locationId) {
      await updateRumor({ ...rumor, locationId: '', location: '' });
      return;
    }

    await updateRumor({
      ...rumor,
      relatedNPCs: (rumor.relatedNPCs ?? []).filter((existing) => existing !== id),
      relatedLocations: (rumor.relatedLocations ?? []).filter((existing) => existing !== id),
    });
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
    return <RosterSkeleton label="Loading rumors" />;
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

      {/*
        The composer, permanently at the top of the list (item 1). Not behind a
        button and not on a route: a rumour is written down while somebody is
        still talking.

        Hidden only in selection mode, where every row has become a checkbox
        and the bar above acts on what is ticked -- adding a new rumour in the
        middle of choosing which ones to combine is not a thing anyone is
        doing.
      */}
      {!selectionMode && <RumorComposer onAdd={handleAdd} />}

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
                    entityId={rumor.id}
                    entityName={rumor.title}
                    gridClassName={ROW_GRID}
                    isFirst={index === 0}
                    highlighted={highlightedRumorId === rumor.id}
                    expanded={isExpanded}
                    toggleLabel={rumor.title}
                    onToggle={() => setExpandedRumorId(isExpanded ? null : rumor.id)}
                    selected={selectedRumors.has(rumor.id)}
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
                      /*
                        The whole record, in the row (item 2). This is the one
                        entity where §1.3's four-fact bound does not apply,
                        because there is no page holding the remainder.
                      */
                      <RumorRowEditor
                        rumor={rumor}
                        draft={drafts[rumor.id]}
                        onDraftChange={(patch) => setDraft(rumor.id, patch, rumor)}
                        onSave={(draft) => handleSave(rumor, draft)}
                        onCollapse={() => {
                          clearDraft(rumor.id);
                          setExpandedRumorId(null);
                        }}
                        onDelete={() => handleDelete(rumor.id)}
                        onStatusChange={(status) => updateRumorStatus(rumor.id, status)}
                        onAttach={(id, kind) => handleAttach(rumor, id, kind)}
                        onDetach={(id) => handleDetach(rumor, id)}
                        sources={{ npc: npcs, location: locations }}
                        autoFocus={justAddedId === rumor.id}
                        onOpenQuest={handleQuestClick}
                      />
                    }
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* The "Quest" pill that sat here is gone: the last cell in the
                            same row already reads "Converted to quest", so the pill was
                            the same fact a second time, in a box, next to the name. */}
                        <Typography
                          variant="body"
                          className="font-semibold truncate font-heading"
                        >
                          {rumor.title}
                        </Typography>
                      </div>
                      <Typography variant="body-sm" color="secondary" className="text-sm truncate">
                        {rumor.sourceName}
                      </Typography>
                    </div>

                    {/*
                      Fully known plus a strike, never failure red: a party
                      that disproves a rumour has done the work (colour schema
                      §3). `negated` is orthogonal to `tone` for exactly this
                      reason -- the rumour has not left the ladder.
                    */}
                    <RosterStatus
                      tone={RUMOR_STATUS_TONE[rumor.status]}
                      negated={rumor.status === 'false'}
                    >
                      {formatRumorStatus(rumor.status)}
                    </RosterStatus>

                    {/* Source type, stated once and plainly -- it was a filled chip
                        saying what a plain label says. */}
                    <Typography
                      variant="body-sm"
                      color="secondary"
                      className="hidden md:block justify-self-start text-sm"
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
      ) : initialRumors.length > 0 ? (
        <RosterEmpty
          title="No rumours match these filters"
          message="Try a different search term, or clear the filters to see everything the party has heard."
        />
      ) : (
        /*
          No action here any more: the composer above *is* the way to add the
          first rumour, and it is already on screen. A button pointing at
          `/rumors/create` would send someone away from the control they are
          looking at (item 1, and the empty-campaign gate).
        */
        <RosterEmpty
          title="Nothing heard yet"
          message="Overheard in a tavern, posted on a notice board, told by someone who may be lying — title it above and mark it confirmed when you find out."
        />
      )}
    </div>
  );
};

export default RumorDirectory;
