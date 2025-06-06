// src/hooks/useEntityExtractor.ts
import { useState, useCallback } from 'react';
import { ExtractedEntity } from '../types/note';
import EntityExtractionService, { UsageLimitExceededError } from '../services/firebase/ai/EntityExtractionService';
import { useUsageContext } from '../context/UsageContext';

/**
 * Simplified hook for entity extraction - usage state now managed by UsageContext
 */
export const useEntityExtractor = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const entityService = EntityExtractionService.getInstance();
  
  // Get usage state and functions from context
  const usageContext = useUsageContext();
  const { 
    usageStatus,
    isLoadingUsage,
    isUsageLimitExceeded,
    contactInfo,
    refreshUsageStatus,
    updateUsageStatus,
    setUsageLimitExceededWithInfo,
    clearUsageStatus,
    isExtractionAvailable,
    hasUsageData,
    isUnlimited,
    hasCustomLimit
  } = usageContext;

  /**
   * Extract entities from note content with usage tracking
   */
  const extractWithOpenAI = useCallback(async (content: string): Promise<ExtractedEntity[]> => {
    setIsExtracting(true);
    setError(null);
    
    try {
      // Validate content before making the call
      if (!content || content.trim().length === 0) {
        throw new Error('Content is required for entity extraction');
      }

      if (content.length > 10000) {
        throw new Error('Content is too long (maximum 10,000 characters)');
      }

      // Extract entities - this will update usage in the service
      const entities = await entityService.extractEntities(content);
      
      // Update shared usage status from the service after successful extraction
      const newUsageStatus = entityService.getCurrentUsage();
      if (newUsageStatus) {
        updateUsageStatus(newUsageStatus);
      }

      return entities;
    } catch (err) {
      if (err instanceof UsageLimitExceededError) {
        // Handle usage limit exceeded - update shared context
        setUsageLimitExceededWithInfo(err.usage, err.contactInfo);
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
  }, [entityService, updateUsageStatus, setUsageLimitExceededWithInfo]);

  /**
   * Extract entities from arbitrary content (not tied to a note)
   */
  const extractFromContent = useCallback(async (content: string): Promise<ExtractedEntity[]> => {
    setIsExtracting(true);
    setError(null);
    
    try {
      // Validate content before making the call
      if (!content || content.trim().length === 0) {
        throw new Error('Content is required for entity extraction');
      }

      if (content.length > 10000) {
        throw new Error('Content is too long (maximum 10,000 characters)');
      }

      // Extract entities - usage will only increment when OpenAI is called
      const entities = await entityService.extractEntities(content);
      
      // Update shared usage status from the service after successful extraction
      const newUsageStatus = entityService.getCurrentUsage();
      if (newUsageStatus) {
        updateUsageStatus(newUsageStatus);
      }

      return entities;
    } catch (err) {
      if (err instanceof UsageLimitExceededError) {
        // Handle usage limit exceeded - update shared context
        setUsageLimitExceededWithInfo(err.usage, err.contactInfo);
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
  }, [entityService, updateUsageStatus, setUsageLimitExceededWithInfo]);

  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get usage percentage for display (based on daily usage)
   */
  const getUsagePercentage = useCallback((): number => {
    if (!usageStatus) return 0;
    if (usageStatus.usage.isUnlimited) return 0; // Unlimited users show 0%
    
    const { daily } = usageStatus.usage;
    const dailyLimit = usageStatus.usage.customLimit ?? daily.limit;
    return Math.min((daily.count / dailyLimit) * 100, 100);
  }, [usageStatus]);

  /**
   * Get remaining extractions for today
   */
  const getRemainingExtractions = useCallback((): number => {
    if (!usageStatus) return 0;
    if (usageStatus.usage.isUnlimited) return Infinity;
    
    const { daily } = usageStatus.usage;
    const dailyLimit = usageStatus.usage.customLimit ?? daily.limit;
    return Math.max(0, dailyLimit - daily.count);
  }, [usageStatus]);

  return {
    // Extraction functions
    extractWithOpenAI,
    extractFromContent,
    
    // Local state (extraction-specific)
    isExtracting,
    error,
    resetError,
    
    // Usage state (from context)
    usageStatus,
    isLoadingUsage,
    isUsageLimitExceeded,
    contactInfo,
    refreshUsageStatus,
    clearUsageCache: clearUsageStatus,
    isExtractionAvailable,
    getUsagePercentage,
    getRemainingExtractions,
    
    // Usage display helpers (from context)
    hasUsageData,
    isUnlimited,
    hasCustomLimit,
    
    // Loading state for UI
    isReady: hasUsageData && !isLoadingUsage
  };
};