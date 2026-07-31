import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Location, LocationType, LocationStatus } from '../types';
import { useNPCs } from '../../npcs/context/NPCContext';
import { useQuests } from '../../quests/context/QuestContext';
import { useLocations } from '../context/LocationContext';
import { useAuth } from 'features/user-management';
import Card from '../../../../core/components/Card';
import Button from '../../../../core/components/Button';
import Typography from '../../../../core/components/Typography';
import Input from '../../../../core/components/Input';
import { Search, MapPin, Mountain, Building, Home, Landmark, Users, Scroll, Tag } from 'lucide-react';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useNavigation } from 'shared/context/NavigationContext';
import clsx from 'clsx';
import {
  RosterStatusBar,
  RosterFilterPills,
  RosterGroup,
  RosterRow,
  RosterField,
  type RosterSegment,
  type RosterFilterOption,
} from '../../shared/components/Roster';

interface LocationDirectoryProps {
  locations: Location[];
  isLoading?: boolean;
}

/** Column template shared by every row, so the columns line up across groups and levels. */
const ROW_GRID =
  'grid-cols-[1fr_auto] md:grid-cols-[1.6fr_120px_130px_1fr_26px]';

/**
 * Location type is a small fixed enum (8 members, unlike NPCDirectory's free-text
 * `location` filter), so it gets pills rather than a dropdown too — the same
 * legibility argument RosterFilterPills already makes for four options still holds
 * for nine. The type sits below the search bar so nothing has to be stacked selects.
 */
const TYPE_FILTERS: RosterFilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'region', label: 'Regions' },
  { value: 'city', label: 'Cities' },
  { value: 'town', label: 'Towns' },
  { value: 'village', label: 'Villages' },
  { value: 'dungeon', label: 'Dungeons' },
  { value: 'landmark', label: 'Landmarks' },
  { value: 'building', label: 'Buildings' },
  { value: 'poi', label: 'POIs' },
];

/**
 * Status is a progression (known → explored → visited), not the mutually-exclusive
 * buckets NPC status was. The bar still filters like NPCDirectory's, but ordering and
 * colour read as "how far along", not "which category": known (blue, the starting
 * point) → explored (gold, partway) → visited (green, as far as this axis goes).
 * There is no failure state here, so bg-status-failed is never used.
 */
const STATUS_ORDER: { key: LocationStatus; colorClass: string }[] = [
  { key: 'known', colorClass: 'bg-status-general' },
  { key: 'explored', colorClass: 'bg-status-unknown' },
  { key: 'visited', colorClass: 'bg-status-completed' },
];

const STATUS_DOT: Record<LocationStatus, string> = {
  known: 'bg-status-general',
  explored: 'bg-status-unknown',
  visited: 'bg-status-completed',
};

const formatLocationType = (type: LocationType): string => {
  if (type === 'poi') return 'Point of Interest';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const getTypeIcon = (type: LocationType) => {
  const className = clsx('shrink-0', `location-type-${type}`);
  switch (type) {
    case 'region':
      return <Mountain size={16} className={className} />;
    case 'city':
      return <Building size={16} className={className} />;
    case 'town':
    case 'village':
      return <Home size={16} className={className} />;
    case 'dungeon':
    case 'building':
      return <Building size={16} className={className} />;
    case 'landmark':
      return <Landmark size={16} className={className} />;
    case 'poi':
    default:
      return <MapPin size={16} className={className} />;
  }
};

export const LocationDirectory: React.FC<LocationDirectoryProps> = ({
  locations: initialLocations,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  const { getNPCById } = useNPCs();
  const { getQuestById } = useQuests();
  const { user } = useAuth();
  const { deleteLocation } = useLocations();

  // Use Firebase hook for real-time updates
  const { data: updatedLocations } = useFirebaseData<Location>({
    collection: 'locations',
  });

  // Use the most up-to-date data
  const locations = updatedLocations.length > 0 ? updatedLocations : initialLocations;
  const { navigateToPage, createPath, getCurrentQueryParams } = useNavigation();
  const { highlight: highlightId } = getCurrentQueryParams();

  // Group locations by parent to create hierarchy
  const locationHierarchy = useMemo(() => {
    return locations.reduce((acc, location) => {
      const parentId = location.parentId || 'root';
      if (!acc[parentId]) {
        acc[parentId] = [];
      }
      acc[parentId].push(location);
      return acc;
    }, {} as Record<string, Location[]>);
  }, [locations]);

  // A `parentId` that names no loaded location leaves its bucket in
  // locationHierarchy keyed by that dangling id — a key `renderRows` never
  // visits, since it only ever recurses into 'root' or the id of a row it is
  // already rendering. Collect those buckets' contents here so they get a
  // home ("Unplaced") instead of silently vanishing from the tree, the group
  // count, and the empty state while still counting toward the status bar's
  // total.
  const orphanLocations = useMemo(() => {
    return Object.keys(locationHierarchy)
      .filter(key => key !== 'root' && !locations.some(loc => loc.id === key))
      .flatMap(key => locationHierarchy[key]);
  }, [locationHierarchy, locations]);

  // Helper function to get parent location IDs
  const getParentLocationIds = useCallback((locationId: string): string[] => {
    const parentIds: string[] = [];
    let currentLocation = locations.find(loc => loc.id === locationId);

    while (currentLocation?.parentId) {
      parentIds.push(currentLocation.parentId);
      currentLocation = locations.find(loc => loc.id === currentLocation?.parentId);
    }

    return parentIds;
  }, [locations]);

  // Handle highlighted location from URL
  useEffect(() => {
    if (highlightId) {
      const highlightedLocation = locations.find(loc =>
        loc.id === highlightId ||
        loc.name.toLowerCase() === highlightId.toLowerCase()
      );

      if (highlightedLocation) {
        setHighlightedLocationId(highlightedLocation.id);

        // Expand this location and all of its ancestors, so arriving from a link
        // reveals both its own detail and the path down to it.
        const parentIds = getParentLocationIds(highlightedLocation.id);
        setExpandedLocations(prev => new Set([...prev, highlightedLocation.id, ...parentIds]));

        // Scroll to the highlighted location
        setTimeout(() => {
          const element = document.getElementById(`location-${highlightedLocation.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [highlightId, locations, getParentLocationIds]);

  // Toggle a row's expansion without losing any other row's state
  const toggleExpansion = (locationId: string) => {
    setExpandedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  // Helper function to check if a location or its children match filters
  const locationMatchesFilters = useCallback((
    loc: Location,
    hierarchy: Record<string, Location[]>,
    status: string,
    type: string,
    search: string,
    isChild: boolean = false
  ): boolean => {
    const matchesStatus = status === 'all' || loc.status === status;
    const matchesType = type === 'all' || loc.type === type;
    const matchesSearch = !search ||
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      loc.description.toLowerCase().includes(search.toLowerCase()) ||
      loc.type.toLowerCase().includes(search.toLowerCase());

    // A child location whose parent already satisfies the type filter is exempt
    // from the type check on itself — a Building under a City you filtered to
    // shouldn't disappear just because "Building" isn't the selected type. But
    // (fix for #1414) that exemption must still fall through to the descendant
    // check below when the node doesn't match on its own, exactly like a
    // non-child node does — it must never return early and suppress descendant
    // matching, or a match nested two or more levels deep becomes unreachable:
    // renderRows calls this with isChild=true for essentially every child (since
    // typeFilter defaults to 'all'), so an early return here silently dropped the
    // connecting ancestor from its own parent's render even though the
    // auto-expand effect (which always calls with isChild=false) had correctly
    // decided that ancestor should be expanded.
    if (matchesStatus && matchesSearch && (isChild || matchesType)) {
      return true;
    }

    // Otherwise, a parent location still qualifies if any descendant matches —
    // this is what lets an ancestor stay visible (and gets auto-expanded below)
    // purely to reveal a matching descendant. Deliberately always recurse with
    // isChild=false here, NOT with the current node's isChild propagated down:
    // the type-filter exemption is re-decided by renderRows fresh at every level
    // of the hierarchy (based on whichever node is the *immediate* parent being
    // rendered at that level), so it must not cascade through this function's
    // own recursion into grandchildren it was never granted for. Propagating it
    // would let a mismatched-type grandchild several levels down count as a
    // "match" here while the auto-expand effect — which always recurses with
    // isChild=false — disagreed about that same grandchild, reintroducing the
    // exact expander/renderer split this bug was about, just one level further
    // down.
    const children = hierarchy[loc.id] || [];
    return children.some(child =>
      locationMatchesFilters(child, hierarchy, status, type, search, false)
    );
  }, []);

  // Auto-expand ancestors of any location that matches an active filter or search,
  // so narrowing the list never hides a match behind a collapsed row.
  useEffect(() => {
    if (typeFilter === 'all' && statusFilter === 'all' && !searchQuery) {
      return;
    }

    const locationsToExpand = new Set<string>();

    const addParentIdsForMatches = (parentId: string = 'root') => {
      const children = locationHierarchy[parentId] || [];

      children.forEach(child => {
        if (locationMatchesFilters(child, locationHierarchy, statusFilter, typeFilter, searchQuery)) {
          const parentIds = getParentLocationIds(child.id);
          parentIds.forEach(id => locationsToExpand.add(id));
        }
        addParentIdsForMatches(child.id);
      });
    };

    addParentIdsForMatches();
    setExpandedLocations(prev => new Set([...prev, ...locationsToExpand]));
  }, [typeFilter, statusFilter, searchQuery, locations, locationHierarchy, locationMatchesFilters, getParentLocationIds]);

  // Status counts drive the one bar that replaced the "All Status" dropdown
  const statusSegments: RosterSegment[] = useMemo(() => {
    const count = (status: string) => locations.filter(loc => loc.status === status).length;
    return STATUS_ORDER.map(({ key, colorClass }) => ({
      key,
      label: key,
      count: count(key),
      colorClass,
    }));
  }, [locations]);

  const handleNPCClick = (npcId: string) => {
    navigateToPage(createPath('/npcs', {}, { highlight: npcId }));
  };

  const handleQuestClick = (questId: string) => {
    navigateToPage(createPath('/quests', {}, { highlight: questId }));
  };

  const handleEdit = (locationId: string) => {
    navigateToPage(`/locations/edit/${locationId}`);
  };

  const handleDelete = async (locationId: string) => {
    try {
      await deleteLocation(locationId);
    } catch (error) {
      console.error('Failed to delete location:', error);
    }
  };

  // Renders a pre-resolved, pre-filtered list of locations as RosterRows. This
  // is the ~230-line row body shared by every caller that has already worked
  // out *which* locations belong in this list — `renderRows` below (the
  // hierarchy-driven path) and the "Unplaced" group (locations whose
  // `parentId` doesn't resolve to anything loaded, so there is no hierarchy
  // bucket for `renderRows` to walk into). A location with its own children
  // nests a further RosterGroup of them inside its expandedContent (built by
  // recursing into `renderRows`, which resolves that child list from
  // `locationHierarchy` the normal way), so the parent/child structure
  // survives as nested groups rather than getting flattened into one list —
  // this holds for an orphan's descendants too, since they sit in
  // `locationHierarchy` keyed by the orphan's own (perfectly valid) id.
  const renderLocationRows = (locationsToRender: Location[]): React.ReactNode[] => {
    return locationsToRender.map((location, index) => {
      const childIds = locationHierarchy[location.id] || [];
      const hasChildren = childIds.length > 0;
      const isExpanded = expandedLocations.has(location.id);

      const connectedNPCs = (location.connectedNPCs || [])
        .map(id => getNPCById(id))
        .filter((npc): npc is NonNullable<ReturnType<typeof getNPCById>> => npc !== undefined);

      const npcCount = location.connectedNPCs?.length || 0;
      const questCount = location.relatedQuests?.length || 0;
      const connectionsLabel = npcCount || questCount
        ? `${npcCount} NPCs · ${questCount} Quests`
        : '—';

      return (
        <RosterRow
          key={location.id}
          id={`location-${location.id}`}
          gridClassName={ROW_GRID}
          isFirst={index === 0}
          highlighted={highlightedLocationId === location.id}
          expanded={isExpanded}
          toggleLabel={location.name}
          onToggle={() => toggleExpansion(location.id)}
          expandedContent={
            isExpanded ? (
              <div className="flex flex-col gap-4 pt-2">
                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-7">
                  <div className="flex flex-col gap-4">
                    <RosterField label="Description" emptyText="Nothing written yet">
                      {location.description ? (
                        <Typography variant="body-sm">{location.description}</Typography>
                      ) : undefined}
                    </RosterField>

                    <RosterField label="Notable features" emptyText="None recorded">
                      {location.features?.length ? (
                        <ul className="flex flex-col gap-1.5">
                          {location.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start gap-2">
                              <Landmark size={14} className="typography-secondary mt-0.5 shrink-0" />
                              <Typography variant="body-sm">{feature}</Typography>
                            </li>
                          ))}
                        </ul>
                      ) : undefined}
                    </RosterField>

                    <RosterField label="Notes" emptyText="No notes yet">
                      {location.notes?.length ? (
                        <div className="flex flex-col gap-2">
                          {location.notes.map((note, noteIndex) => (
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
                    <RosterField label="Tags" emptyText="No tags yet">
                      {location.tags?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {location.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-secondary typography-secondary"
                            >
                              <Tag size={12} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : undefined}
                    </RosterField>

                    <RosterField label="Last visited" emptyText="Not recorded">
                      {location.lastVisited ? (
                        <Typography variant="body-sm">
                          {new Date(location.lastVisited).toLocaleDateString('en-uk', {
                            year: 'numeric',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </Typography>
                      ) : undefined}
                    </RosterField>

                    <RosterField label="Connected NPCs" emptyText="No NPCs linked">
                      {connectedNPCs.length ? (
                        <div className="flex flex-col gap-1.5">
                          {connectedNPCs.map(npc => (
                            <button
                              key={npc.id}
                              type="button"
                              onClick={() => handleNPCClick(npc.id)}
                              className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded-md selectable-item"
                            >
                              <Users
                                size={14}
                                className={clsx('shrink-0', `npc-relationship-${npc.relationship}`)}
                              />
                              <Typography variant="body-sm">
                                {npc.name}
                                {npc.title && (
                                  <span className="typography-secondary ml-1">– {npc.title}</span>
                                )}
                              </Typography>
                            </button>
                          ))}
                        </div>
                      ) : undefined}
                    </RosterField>

                    <RosterField label="Related quests" emptyText="No quests linked">
                      {location.relatedQuests?.length ? (
                        <div className="flex flex-col gap-1.5">
                          {location.relatedQuests.map(questId => {
                            const quest = getQuestById(questId);
                            if (!quest) return null;
                            return (
                              <button
                                key={questId}
                                type="button"
                                onClick={() => handleQuestClick(questId)}
                                className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded-md selectable-item"
                              >
                                <Scroll
                                  size={14}
                                  className={clsx('shrink-0', `quest-status-${quest.status}`)}
                                />
                                <Typography variant="body-sm">{quest.title}</Typography>
                              </button>
                            );
                          })}
                        </div>
                      ) : undefined}
                    </RosterField>

                    <RosterField label="Recorded by" emptyText="Unknown">
                      {location.createdByUsername ? (
                        <Typography variant="body-sm">{location.createdByUsername}</Typography>
                      ) : undefined}
                    </RosterField>

                    {user && (
                      <div className="flex gap-2 mt-1">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(location.id)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(location.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {hasChildren && (() => {
                  const subRows = renderRows(location.id);
                  return subRows.length > 0 ? (
                    <RosterGroup
                      title={`Locations in ${location.name}`}
                      count={subRows.length}
                    >
                      {subRows}
                    </RosterGroup>
                  ) : null;
                })()}
              </div>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {getTypeIcon(location.type)}
              <Typography variant="body" className="font-semibold truncate">
                {location.name}
              </Typography>
            </div>
            {hasChildren && (
              <Typography variant="body-sm" color="secondary" className="text-sm truncate">
                {childIds.length} sub-location{childIds.length === 1 ? '' : 's'}
              </Typography>
            )}
          </div>

          {/* Status: dot plus the word, so colour is never the only cue */}
          <Typography
            variant="body-sm"
            className={clsx(
              'hidden md:flex items-center gap-2 text-sm font-semibold',
              `location-status-${location.status}`
            )}
          >
            <span
              aria-hidden="true"
              className={clsx('w-[7px] h-[7px] rounded-sm shrink-0', STATUS_DOT[location.status])}
            />
            {location.status.charAt(0).toUpperCase() + location.status.slice(1)}
          </Typography>

          <Typography
            variant="body-sm"
            className={clsx(
              'hidden md:inline-flex justify-self-start px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary',
              `location-type-${location.type}`
            )}
          >
            {formatLocationType(location.type)}
          </Typography>

          <Typography variant="body-sm" color="secondary" className="hidden md:block text-sm truncate">
            {connectionsLabel}
          </Typography>
        </RosterRow>
      );
    });
  };

  // Resolves the direct children of `parentId` out of `locationHierarchy`,
  // applies the existing filter semantics, and delegates the actual row JSX
  // to `renderLocationRows`. Only ever called with 'root' or the id of a row
  // that is itself already being rendered (the recursive call inside
  // `renderLocationRows`'s expandedContent) — never with an unresolvable
  // parentId, since nothing walks into those buckets this way. That's exactly
  // why orphans need a separate path: see `orphanLocations` above and its use
  // below.
  const renderRows = (parentId: string): React.ReactNode[] => {
    const childLocations = locationHierarchy[parentId] || [];

    const filteredChildLocations = childLocations.filter(location => {
      const parentLocation = locations.find(loc => loc.id === parentId);
      if (parentLocation && (typeFilter === 'all' || parentLocation.type === typeFilter)) {
        return locationMatchesFilters(location, locationHierarchy, statusFilter, typeFilter, searchQuery, true);
      }
      return locationMatchesFilters(location, locationHierarchy, statusFilter, typeFilter, searchQuery, false);
    });

    return renderLocationRows(filteredChildLocations);
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Content>
          <Typography>Loading locations...</Typography>
        </Card.Content>
      </Card>
    );
  }

  const rootRows = renderRows('root');

  // Orphans have no resolvable parent, so the parentLocation-based type-filter
  // exemption `renderRows` applies to ordinary children can't apply to them
  // either — treat them like root-level nodes (isChild=false), same as the
  // 'root' path above (whose own `parentLocation` lookup already resolves to
  // undefined and falls into this same branch).
  const filteredOrphanLocations = orphanLocations.filter(location =>
    locationMatchesFilters(location, locationHierarchy, statusFilter, typeFilter, searchQuery, false)
  );
  const orphanRows = renderLocationRows(filteredOrphanLocations);

  return (
    <div className="space-y-6">
      {/* One status bar that also filters, replacing the "All Status" dropdown */}
      <RosterStatusBar
        total={locations.length}
        totalLabel="charted so far"
        segments={statusSegments}
        activeKey={statusFilter}
        onSelect={setStatusFilter}
      />

      {/* Search and type filter, on one row rather than two stacked dropdowns */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startIcon={<Search className="typography-secondary" />}
            fullWidth
          />
        </div>

        <RosterFilterPills
          options={TYPE_FILTERS}
          value={typeFilter}
          onChange={setTypeFilter}
          label="Filter by location type"
        />
      </div>

      {/* Location hierarchy */}
      {rootRows.length === 0 && orphanRows.length === 0 ? (
        <Card>
          <Card.Content className="text-center py-8">
            <MapPin className="w-12 h-12 mx-auto mb-4 typography-secondary" />
            <Typography variant="h3" className="mb-2">
              No Locations Found
            </Typography>
            <Typography color="secondary">
              {searchQuery
                ? 'No locations match your search criteria'
                : 'There are no locations to display'}
            </Typography>
          </Card.Content>
        </Card>
      ) : (
        <>
          {rootRows.length > 0 && (
            <RosterGroup title="Locations" count={rootRows.length}>
              {rootRows}
            </RosterGroup>
          )}

          {/* Locations whose parentId names an id that isn't in the loaded
              set — dangling references from a deleted or renamed parent (see
              #303). Kept visible and reconciled against the status bar's
              total instead of silently vanishing. */}
          {orphanRows.length > 0 && (
            <RosterGroup title="Unplaced" count={orphanRows.length} muted>
              {orphanRows}
            </RosterGroup>
          )}
        </>
      )}
    </div>
  );
};

export default LocationDirectory;
