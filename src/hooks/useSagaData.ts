// src/hooks/useSagaData.ts
import { useState, useEffect, useCallback } from 'react';
import { SagaData } from '../types/saga';
import { useFirestore } from '../context/firebase';
import { useAuth, useGroups, useCampaigns } from '../context/firebase';

/**
 * Hook for managing saga data fetching and state with proper group/campaign context
 * @returns Object containing saga data, loading state, error state, and refresh function
 */
export const useSagaData = () => {
  const [saga, setSaga] = useState<SagaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getDocument, setDocument, updateDocument } = useFirestore();
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();

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
   * Save saga data to Firebase
   */
  const saveSaga = useCallback(async (sagaData: SagaData) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      if (!activeCampaignId) {
        throw new Error('No active campaign selected');
      }
      
      await setDocument('saga', 'sagaData', sagaData);
      setSaga(sagaData);
      return true;
    } catch (err) {
      console.error('Error saving saga:', err);
      setError('Failed to save saga data');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setDocument, activeGroupId, activeCampaignId]);

  /**
   * Update saga data in Firebase
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
      
      await updateDocument('saga', 'sagaData', updates);
      setSaga(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Error updating saga:', err);
      setError('Failed to update saga data');
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateDocument, activeGroupId, activeCampaignId]);

  // Load saga on mount and when group/campaign changes
  useEffect(() => {
    fetchSaga();
  }, [fetchSaga, activeGroupId, activeCampaignId]);

  return {
    saga,
    loading,
    error,
    fetchSaga,
    saveSaga,
    updateSaga,
    hasRequiredContext: !!activeGroupId && !!activeCampaignId
  };
};

export default useSagaData;