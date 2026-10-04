// src/features/campaign-entities/locations/context/LocationContext.tsx
import React, { createContext, useContext, useCallback, useRef } from 'react';
import { Location, LocationStatus, LocationContextValue, LocationNote, LocationChildStrategy } from '../types';
import { descendantIdsDeepestFirst, parentChainReaches, wouldCreateCycle } from '../utils/location-tree';
import { DomainData } from 'core/types/common';
import { useLocationData } from '../hooks/useLocationData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useCampaignCollectionPath } from 'shared/hooks/useCampaignCollectionPath';
import { toNoteDate } from 'shared/utils/dateFormatter';
import { useAuth, useUser, useGroups, useCampaigns } from 'features/user-management';
import { createWithUniqueEntityId } from 'core/utils/entity-id';
import { buildModificationAttribution } from 'core/attribution';
import { commitEntityWrites } from '../../shared/commitEntityWrites';
import { discardImage } from 'shared/hooks/useImageAttachment';
import { createListenerDemandContext, useListenerDemand, ListReaderOptions } from 'shared/hooks/useListenerDemand';

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

/**
 * Who is reading this provider's list right now (T032, `PERF-03`): the
 * listener is open only while some component that called `useLocations()` is
 * mounted, and for a while after. See `useListenerDemand`.
 */
const { DemandProvider: LocationDemandProvider, useDemand: useLocationDemand } = createListenerDemandContext();

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The list follows a Firestore listener (T032), which delivers this
  // client's own writes before their promises resolve -- so nothing below
  // patches it after a write, or asks for a re-read.
  const demand = useListenerDemand();
  const { locations, loading, error, refreshLocations, hasRequiredContext } = useLocationData({ enabled: demand.wanted });
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  // `autoFetch: false` because nothing renders off this instance's `data`:
  // the list comes from `useLocationData()` above. Its `error` is bound as
  // `writeError` so write failures are not conflated with read failures
  // (bug #1401).
  // Writes name this render's campaign by full path, so one started here
  // lands here even if the player switches campaign before it runs (T082).
  const locationsPath = useCampaignCollectionPath('locations');
  const { updateData, updateDataAfterReading, deleteData, addData, error: writeError } = useFirebaseData<Location>({
    collection: locationsPath,
    autoFetch: false
  });

  // Get location by ID
  const getLocationById = useCallback((id: string) => {
    return locations.find(location => location.id === id);
  }, [locations]);

  // Get locations by type
  const getLocationsByType = useCallback((type: string) => {
    return locations.filter(location => location.type === type);
  }, [locations]);

  // Get locations by status
  const getLocationsByStatus = useCallback((status: LocationStatus) => {
    return locations.filter(location => location.status === status);
  }, [locations]);

  // Get all child locations for a parent
  const getChildLocations = useCallback((parentId: string) => {
    return locations.filter(location => location.parentId === parentId);
  }, [locations]);

  // Get parent location for a location
  const getParentLocation = useCallback((locationId: string) => {
    const location = getLocationById(locationId);
    return location?.parentId ? getLocationById(location.parentId) : undefined;
  }, [getLocationById]);

  // Update a location
  const updateLocation = useCallback(async (locationId: string, updatedLocation: Partial<Location>): Promise<void> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to update a location');
    }

    // Get the current location to update
    const location = getLocationById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    const updatedData = {
      ...updatedLocation
    };

    await updateData(locationId, updatedData);
  }, [user, activeGroupId, activeCampaignId, getLocationById, updateData]);

  // Update location note
  const updateLocationNote = useCallback(async (locationId: string, note: LocationNote): Promise<void> => {
    if (!user || !userProfile || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to add location notes');
    }

    const location = getLocationById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // The notes alone (T083): the rest of the copy may be behind the server.
    await updateData(locationId, {
      notes: [
        ...(location.notes || []),
        {
          ...note,
          date: toNoteDate()
        }
      ]
    });
  }, [user, userProfile, activeGroupId, activeCampaignId, getLocationById, updateData]);

  // Update location status
  const updateLocationStatus = useCallback(async (locationId: string, status: LocationStatus): Promise<void> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to update location status');
    }

    if (!getLocationById(locationId)) {
      throw new Error('Location not found');
    }

    await updateData(locationId, { status });
  }, [user, activeGroupId, activeCampaignId, getLocationById, updateData]);

  /**
   * Sets the status of several locations in one batch (T017): one round trip,
   * and all or nothing. There is no batch delete: deleting one location asks
   * what becomes of its children, and a selection has no single answer yet.
   */
  const updateLocationsStatus = useCallback(async (locationIds: string[], status: LocationStatus): Promise<void> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to update location status');
    }

    if (locationIds.some(id => !getLocationById(id))) {
      throw new Error('One or more locations not found');
    }

    const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });
    await commitEntityWrites<Location>(locationsPath, 'locations', locationIds.map(id => ({
      type: 'update' as const,
      id,
      data: { status, ...modificationAttribution }
    })));
  }, [user, activeGroupUserProfile, activeGroupId, activeCampaignId, getLocationById, locationsPath]);

  /**
   * Move a location under a new parent.
   *
   * The write the whole cycle guard exists for. Nothing in the product could
   * choose a parent before `15-4`, so `PERF-11`'s unterminating walks needed
   * hand-edited data to reach; *Move elsewhere* makes them one click away. The
   * tray refuses to offer self or a descendant and this refuses to write one,
   * because the two failures have very different blast radii: an unofferable
   * choice is a UI gap, a written cycle is a campaign nobody can open.
   */
  const moveLocation = useCallback(async (
    locationId: string,
    nextParentId: string | undefined
  ): Promise<void> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to move a location');
    }

    const location = getLocationById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    /** Why `nextParentId` cannot hold this place. */
    const cycleError = (parentName: string | undefined) =>
      new Error(
        nextParentId === locationId
          ? `${location.name} cannot be inside itself.`
          : `${parentName ?? 'That place'} is already inside ${location.name}.`
      );

    // Refused here at once when the list on screen already shows the cycle.
    if (wouldCreateCycle(locations, locationId, nextParentId)) {
      throw cycleError(nextParentId ? getLocationById(nextParentId)?.name : undefined);
    }

    // '' rather than `undefined`: Firestore rejects `undefined`, and it is what
    // both the form and quick add already write for "no parent".
    if (!nextParentId) {
      await updateLocation(locationId, { parentId: '' });
      return;
    }

    // The list on screen is a snapshot: another member may have moved the new
    // parent inside this place since, and two opposite moves each pass the
    // check above (DATA-006). The parent's chain is read again inside the
    // transaction that writes the move, so whichever commits second sees the
    // first and is refused.
    await updateDataAfterReading(locationId, async (read) => {
      const parent = await read(nextParentId);
      if (!parent) {
        throw new Error(`${getLocationById(nextParentId)?.name ?? 'That place'} no longer exists.`);
      }
      if (await parentChainReaches(read, nextParentId, locationId)) {
        throw cycleError(parent.name);
      }
      return { parentId: nextParentId };
    });
  }, [user, activeGroupId, activeCampaignId, getLocationById, locations, updateLocation, updateDataAfterReading]);

  /**
   * Delete a location, and say what happens to the places inside it.
   *
   * §6.2: **never orphan, never decide silently.** `promote-to-grandparent`
   * moves the direct children up one level -- to this location's own parent, or
   * to the top level when it had none -- before the record goes; each child's
   * own subtree travels with it untouched, because only the edge that pointed
   * at the deleted location is broken.
   *
   * `delete-subtree` stays the default only because it is what every caller
   * written before this question existed already does. Every caller that asks
   * passes a strategy explicitly.
   */
  const deleteLocation = useCallback(async (
    locationId: string,
    childStrategy: LocationChildStrategy = 'delete-subtree'
  ): Promise<void> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to delete a location');
    }

    const location = getLocationById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    if (childStrategy === 'promote-to-grandparent') {
      const grandparentId = location.parentId || '';
      const directChildren = locations.filter(loc => loc.parentId === locationId);

      // The children are re-homed *before* the parent goes. The other order
      // leaves a window in which a reader loading the campaign sees children
      // pointing at an id that no longer resolves -- the dangling-parent state
      // #303 catalogued, created deliberately by the fix for orphaning.
      for (const child of directChildren) {
        await updateData(child.id, { parentId: grandparentId });
      }

      await deleteData(locationId);
      // After the document: a failure can then only orphan the file.
      if (location.image) discardImage(location.image.path);
      return;
    }

    // Every descendant, deepest first: the ordering bug #010 was filed about,
    // unchanged. What changed is that the walk now carries a visited set and a
    // depth cap -- the recursion it replaces had neither, so a parent cycle
    // meant deleting a location never returned.
    const childrenIds = descendantIdsDeepestFirst(locations, locationId);

    // Sequential (rather than Promise.all) execution is required here: it is the
    // only way to guarantee descendants are actually removed from the database
    // before their ancestors. This trades throughput (N round trips instead of
    // one batch) for that guarantee.
    for (const id of childrenIds) {
      await deleteData(id);
    }

    // Then delete the parent location
    await deleteData(locationId);

    // Every deleted place's picture, once all the documents are gone.
    for (const id of [...childrenIds, locationId]) {
      const image = getLocationById(id)?.image;
      if (image) discardImage(image.path);
    }
  }, [user, activeGroupId, activeCampaignId, getLocationById, locations, deleteData, updateData]);

  // Ids issued during this session but not yet reflected in `locations`. Two
  // locations can be created back-to-back within a single `act()` / event
  // handler before the first create has re-rendered this provider -- a
  // collision check against `getLocationById` alone would miss that first id
  // and silently let the second create overwrite it. This ref is the second
  // source of truth `isTaken` below consults, alongside the loaded list.
  const issuedIds = useRef<Set<string>>(new Set());

  // Create a new location
  const createLocation = useCallback(async (locationData: DomainData<Location>): Promise<string> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to create a location');
    }

    // Generate a location ID from the name, disambiguating on collision --
    // including with a location another session wrote that the listener has
    // not delivered yet (#1402).
    const locationId = await createWithUniqueEntityId({
      name: locationData.name,
      issuedIds: issuedIds.current,
      isLoaded: (candidateId) => Boolean(getLocationById(candidateId)),
      write: (candidateId) => addData({ ...locationData, id: candidateId }, candidateId)
    });

    return locationId;
  }, [user, activeGroupId, activeCampaignId, getLocationById, addData]);

  const value: LocationContextValue = {
    locations,
    isLoading: loading,
    // Trailing `|| null` normalizes the type. The real `useFirebaseData` declares
    // `useState<string | null>(null)`, so `writeError` is never `undefined` in
    // production -- but suites that mock the hook return an object with no `error`
    // key at all, which makes this expression `undefined` and violates the
    // `string | null` contract consumers rely on. Cheap to keep, and it means the
    // contract holds regardless of how the hook is supplied.
    error: error || writeError || null,
    getLocationById,
    getLocationsByType,
    getLocationsByStatus,
    getChildLocations,
    getParentLocation,
    updateLocation,
    moveLocation,
    updateLocationNote,
    updateLocationStatus,
    updateLocationsStatus,
    deleteLocation,
    createLocation,
    refreshLocations,
    hasRequiredContext
  };

  return (
    <LocationDemandProvider value={demand.retain}>
      <LocationContext.Provider value={value}>
        {children}
      </LocationContext.Provider>
    </LocationDemandProvider>
  );
};

export const useLocations = (options: ListReaderOptions = {}) => {
  useLocationDemand(options.subscribe ?? true);
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocations must be used within a LocationProvider');
  }
  return context;
};