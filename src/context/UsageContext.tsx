// src/context/UsageContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { UsageStatus } from '../types/usage';
import EntityExtractionService from '../services/firebase/ai/EntityExtractionService';

interface UsageContextValue {
  usageStatus: UsageStatus | null;
  isLoadingUsage: boolean;
  isUsageLimitExceeded: boolean;
  contactInfo: {
    message: string;
    contactUrl: string;
    prefilledSubject: string;
  } | null;
  refreshUsageStatus: () => Promise<void>;
  updateUsageStatus: (status: UsageStatus) => void;
  setUsageLimitExceededWithInfo: (status: UsageStatus, info: { message: string; contactUrl: string; prefilledSubject: string; }) => void;  // ← Add this line
  clearUsageStatus: () => void;
  isExtractionAvailable: () => boolean;
  hasUsageData: boolean;
  isUnlimited: boolean;
  hasCustomLimit: boolean;
}

const UsageContext = createContext<UsageContextValue | undefined>(undefined);

export const UsageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [isUsageLimitExceeded, setIsUsageLimitExceeded] = useState(false);
  const [contactInfo, setContactInfo] = useState<{
    message: string;
    contactUrl: string;
    prefilledSubject: string;
  } | null>(null);
  
  const entityService = EntityExtractionService.getInstance();
  const hasLoadedUsage = useRef(false);

  /**
   * Refresh usage status from server
   */
  const refreshUsageStatus = useCallback(async () => {
    setIsLoadingUsage(true);
    try {
      const status = await entityService.fetchUsageStatus();
      if (status) {
        setUsageStatus(status);
        setIsUsageLimitExceeded(status.limitExceeded);
        hasLoadedUsage.current = true;
      }
    } catch (error) {
      console.error('Error refreshing usage status:', error);
    } finally {
      setIsLoadingUsage(false);
    }
  }, [entityService]);

  /**
   * Update usage status (called after successful extractions)
   */
  const updateUsageStatus = useCallback((status: UsageStatus) => {
    setUsageStatus(status);
    setIsUsageLimitExceeded(status.limitExceeded);
    
    // Clear any existing contact info if limit is no longer exceeded
    if (!status.limitExceeded) {
      setContactInfo(null);
    }
  }, []);

  /**
   * Set usage limit exceeded state with contact info
   */
  const setUsageLimitExceededWithInfo = useCallback((
    status: UsageStatus, 
    info: { message: string; contactUrl: string; prefilledSubject: string; }
  ) => {
    setUsageStatus(status);
    setIsUsageLimitExceeded(true);
    setContactInfo(info);
  }, []);

  /**
   * Clear usage status
   */
  const clearUsageStatus = useCallback(() => {
    setUsageStatus(null);
    setIsUsageLimitExceeded(false);
    setContactInfo(null);
    hasLoadedUsage.current = false;
    entityService.clearUsageCache();
  }, [entityService]);

  /**
   * Check if extraction is available (not at limit)
   */
  const isExtractionAvailable = useCallback((): boolean => {
    if (!usageStatus) return true; // Allow if we don't have status yet
    if (usageStatus.usage.isUnlimited) return true; // Always allow for unlimited users
    return !usageStatus.limitExceeded;
  }, [usageStatus]);

  // Load initial usage status
  useEffect(() => {
    if (!hasLoadedUsage.current && !isLoadingUsage) {
      refreshUsageStatus();
    }
  }, [refreshUsageStatus, isLoadingUsage]);

    const value: UsageContextValue = {
    usageStatus,
    isLoadingUsage,
    isUsageLimitExceeded,
    contactInfo,
    refreshUsageStatus,
    updateUsageStatus,
    setUsageLimitExceededWithInfo,
    clearUsageStatus,
    isExtractionAvailable,
    hasUsageData: !!usageStatus,
    isUnlimited: usageStatus?.usage.isUnlimited ?? false,
    hasCustomLimit: !!usageStatus?.usage.customLimit,
    };

  // Expose the setUsageLimitExceededWithInfo method for extraction errors
  (value as any).setUsageLimitExceededWithInfo = setUsageLimitExceededWithInfo;

  return (
    <UsageContext.Provider value={value}>
      {children}
    </UsageContext.Provider>
  );
};

export const useUsageContext = () => {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error('useUsageContext must be used within UsageProvider');
  }
  return context;
};