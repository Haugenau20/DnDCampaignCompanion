// src/features/storytelling/sagas/hooks/useSagaData.ts
import { useState, useEffect, useCallback } from 'react';
import { SagaData, SagaContentInput } from '../types';
import { useFirestore } from 'features/user-management';
import { useAuth, useGroups, useCampaigns, useUser } from 'features/user-management';
import { useCampaignContextStatus } from 'shared/hooks/useCampaignContextStatus';
import { buildCreationAttribution, buildModificationAttribution } from 'core/attribution';

/**
 * Hook for managing saga data fetching and state with proper group/campaign context
 *
 * Owns all write-side attribution for the saga document (see bug #1203): callers
 * supply only the domain fields (`SagaContentInput`) and this hook computes
 * `created*` / `modified*` metadata via `core/attribution`, never the page.
 * @returns Object containing saga data, loading state, error state, and refresh function
 */
export const useSagaData = () => {
  const [saga, setSaga] = useState<SagaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getDocument, setDocument, updateDocument } = useFirestore();
  const { user } = useAuth();
  const { activeGroupUserProfile } = useUser();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { isResolving, hasRequiredContext, missingContext } = useCampaignContextStatus();

  /**
   * Fetch saga from Firebase with appropriate group/campaign context
   */
  const fetchSaga = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!activeGroupId) {
        setSaga(null);
        setLoading(false);
        return null;
      }
      
      if (!activeCampaignId) {
        // If group is selected but no campaign, return null
        setSaga(null);
        setLoading(false);
        return null;
      }
      
      const data = await getDocument<SagaData>('saga', 'sagaData');
      setSaga(data);
      return data;
    } catch (err) {
      console.error('Error fetching saga:', err);
      setError('Failed to load saga data');
      setSaga(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getDocument, activeGroupId, activeCampaignId]);

  /**
   * Save saga data to Firebase.
   *
   * `setDocument` is an upsert, so this single method must cover both creation and
   * modification: if a saga document already exists (it already carries `createdBy`),
   * this save is a modification and the original `created*` fields are preserved by
   * spreading the existing saga before the incoming update; otherwise this is the
   * first save and full creation attribution is written.
   *
   * The cached `saga` state is trusted only when it already has `createdBy` — if it
   * doesn't (e.g. the initial `fetchSaga` failed or hasn't resolved a real document),
   * this re-confirms directly against Firestore before deciding, since guessing "no
   * saga exists" incorrectly would silently overwrite the real creator/creation date.
   */
  const saveSaga = useCallback(async (sagaData: SagaContentInput) => {
    setLoading(true);
    setError(null);

    try {
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }

      if (!activeCampaignId) {
        throw new Error('No active campaign selected');
      }

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Cached state can be null even when a document exists (the initial fetch may
      // have failed), so confirm before treating this as a first save — guessing wrong
      // overwrites the original author (bug #1203).
      const existing = saga?.createdBy
        ? saga
        : await getDocument<SagaData>('saga', 'sagaData');

      const fullSagaData: SagaData = existing?.createdBy
        ? {
            ...existing,
            ...sagaData,
            ...buildModificationAttribution({ uid: user.uid, activeGroupUserProfile }),
          }
        : {
            ...sagaData,
            ...buildCreationAttribution({ uid: user.uid, activeGroupUserProfile }),
          };

      await setDocument('saga', 'sagaData', fullSagaData);
      setSaga(fullSagaData);
      return true;
    } catch (err) {
      console.error('Error saving saga:', err);
      setError('Failed to save saga data');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setDocument, getDocument, activeGroupId, activeCampaignId, user, activeGroupUserProfile, saga]);

  /**
   * Update saga data in Firebase.
   *
   * Always writes modification attribution only — it never touches `created*`
   * fields, so the original author and creation date are preserved.
   */
  const updateSaga = useCallback(async (updates: Partial<SagaData>) => {
    setLoading(true);
    setError(null);

    try {
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }

      if (!activeCampaignId) {
        throw new Error('No active campaign selected');
      }

      if (!user) {
        throw new Error('Not authenticated');
      }

      const fullUpdates: Partial<SagaData> = {
        ...updates,
        ...buildModificationAttribution({ uid: user.uid, activeGroupUserProfile }),
      };

      await updateDocument('saga', 'sagaData', fullUpdates);
      setSaga(prev => prev ? { ...prev, ...fullUpdates } : null);
      return true;
    } catch (err) {
      console.error('Error updating saga:', err);
      setError('Failed to update saga data');
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateDocument, activeGroupId, activeCampaignId, user, activeGroupUserProfile]);

  // Load saga on mount and when group/campaign changes
  useEffect(() => {
    fetchSaga();
  }, [fetchSaga, activeGroupId, activeCampaignId]);

  return {
    saga,
    // Folds in `isResolving` (bug #1413) -- see useNPCData's identical fold
    // in campaign-entities for why this can't just be `useGroups().loading`.
    loading: Boolean(loading) || isResolving,
    error,
    fetchSaga,
    saveSaga,
    updateSaga,
    hasRequiredContext,
    missingContext
  };
};

export default useSagaData;