// src/hooks/useEntityExtractor.ts
import { useState, useCallback, useEffect } from 'react';
import { ExtractedEntity } from '../types/note';
import { UsageStatus } from '../types/usage';
import EntityExtractionService, { UsageLimitExceededError } from '../services/firebase/ai/EntityExtractionService';
import { useNotes } from '../context/NoteContext';

/**
 * Enhanced hook for entity extraction with usage tracking and limit handling
 */
export const useEntityExtractor = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [isUsageLimitExceeded, setIsUsageLimitExceeded] = useState(false);
  const [contactInfo, setContactInfo] = useState<{
    message: string;
    contactUrl: string;
    prefilledSubject: string;
  } | null>(null);

  const { updateNote } = useNotes();
  const entityService = EntityExtractionService.getInstance();

  /**
   * Load current usage status on mount
   */
  useEffect(() => {
    const loadUsageStatus = async () => {
      try {
        const status = await entityService.fetchUsageStatus();
        if (status) {
          setUsageStatus(status);
          setIsUsageLimitExceeded(status.limitExceeded);
        }
      } catch (error) {
        console.error('Error loading usage status:', error);
      }
    };

    loadUsageStatus();
  }, [entityService]);

  /**
   * Extract entities from note content with usage tracking
   */
  const extractWithOpenAI = useCallback(async (content: string): Promise<ExtractedEntity[]> => {
    setIsExtracting(true);
    setError(null);
    setIsUsageLimitExceeded(false);
    setContactInfo(null);
    
    try {
      // Extract entities directly from content
      const entities = await entityService.extractEntities(content);
      
      // Update usage status from the service
      const newUsageStatus = entityService.getCurrentUsage();
      if (newUsageStatus) {
        setUsageStatus(newUsageStatus);
        setIsUsageLimitExceeded(newUsageStatus.limitExceeded);
      }

      return entities;
    } catch (err) {
      if (err instanceof UsageLimitExceededError) {
        // Handle usage limit exceeded
        setIsUsageLimitExceeded(true);
        setUsageStatus(err.usage);
        setContactInfo(err.contactInfo);
        setError(err.message);
        return [];
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to extract entities';
        setError(errorMessage);
        console.error('Entity extraction error:', err);
        return [];
      }
    } finally {
      setIsExtracting(false);
    }
  }, [entityService]);

  /**
   * Extract entities from arbitrary content (not tied to a note)
   */
  const extractFromContent = useCallback(async (content: string): Promise<ExtractedEntity[]> => {
    setIsExtracting(true);
    setError(null);
    setIsUsageLimitExceeded(false);
    setContactInfo(null);
    
    try {
      const entities = await entityService.extractEntities(content);
      
      // Update usage status from the service
      const newUsageStatus = entityService.getCurrentUsage();
      if (newUsageStatus) {
        setUsageStatus(newUsageStatus);
        setIsUsageLimitExceeded(newUsageStatus.limitExceeded);
      }

      return entities;
    } catch (err) {
      if (err instanceof UsageLimitExceededError) {
        // Handle usage limit exceeded
        setIsUsageLimitExceeded(true);
        setUsageStatus(err.usage);
        setContactInfo(err.contactInfo);
        setError(err.message);
        return [];
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to extract entities';
        setError(errorMessage);
        console.error('Entity extraction error:', err);
        return [];
      }
    } finally {
      setIsExtracting(false);
    }
  }, [entityService]);

  /**
   * Refresh usage status from server
   */
  const refreshUsageStatus = useCallback(async () => {
    try {
      const status = await entityService.fetchUsageStatus();
      if (status) {
        setUsageStatus(status);
        setIsUsageLimitExceeded(status.limitExceeded);
      }
    } catch (error) {
      console.error('Error refreshing usage status:', error);
    }
  }, [entityService]);

  /**
   * Clear usage cache (useful after manual limit increases)
   */
  const clearUsageCache = useCallback(() => {
    entityService.clearUsageCache();
    setUsageStatus(null);
    setIsUsageLimitExceeded(false);
    setContactInfo(null);
    setError(null);
  }, [entityService]);

  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
    setIsUsageLimitExceeded(false);
    setContactInfo(null);
  }, []);

  /**
   * Check if extraction is available (not at limit)
   */
  const isExtractionAvailable = useCallback((): boolean => {
    if (!usageStatus) return true; // Allow if we don't have status yet
    return !usageStatus.limitExceeded;
  }, [usageStatus]);

  /**
   * Get usage percentage for display
   */
  const getUsagePercentage = useCallback((): number => {
    if (!usageStatus) return 0;
    
    const { daily } = usageStatus.usage;
    const dailyLimit = usageStatus.usage.customLimit ?? daily.limit;
    return Math.min((daily.count / dailyLimit) * 100, 100);
  }, [usageStatus]);

  return {
    // Extraction functions
    extractWithOpenAI, // Now takes content directly: extractWithOpenAI(content)
    extractFromContent,
    
    // State
    isExtracting,
    error,
    usageStatus,
    isUsageLimitExceeded,
    contactInfo,
    
    // Utility functions
    refreshUsageStatus,
    clearUsageCache,
    resetError,
    isExtractionAvailable,
    getUsagePercentage,
    
    // Usage display helpers
    hasUsageData: !!usageStatus,
    isUnlimited: usageStatus?.usage.isUnlimited ?? false,
    hasCustomLimit: !!usageStatus?.usage.customLimit
  };
};