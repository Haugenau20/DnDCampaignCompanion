// src/features/collaboration/entity-extraction/context/UsageContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { UsageStatus } from '../types';
import EntityExtractionService from '../services/EntityExtractionService';
import { useAuth } from 'features/user-management';

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
  const { user } = useAuth();
  /** uid whose usage has already been fetched -- see the load effect below. */
  const loadedForUid = useRef<string | null>(null);

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
      }
      // Nothing to mark here: the load effect below claims the uid BEFORE
      // calling, so a null or thrown response cannot retrigger it (bug #650).
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
    // Release the uid claim so the next signed-in user (or the same one after
    // a manual limit increase) is fetched afresh.
    loadedForUid.current = null;
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

  /**
   * Load usage once per signed-in user.
   *
   * This used to fire on mount and guard itself with a plain boolean. But
   * `fetchUsageStatus` reads `auth.currentUser`, which is still null on the
   * first render while Firebase restores the session — so that fetch returned
   * null WITHOUT ever calling `getUsageStatus`, flipped the guard, and never
   * tried again. Usage therefore stayed empty for the whole session unless a
   * scan happened to populate it from its own response, which is why the
   * usage meter appeared only after someone's first scan.
   *
   * Keying on the uid fixes that and is still loop-proof: the ref is set
   * BEFORE the call, so a response of null cannot retrigger it (bug #650).
   * A different uid — a genuine account switch — legitimately refetches.
   */
  useEffect(() => {
    const uid = user?.uid ?? null;
    if (!uid || loadedForUid.current === uid) return;

    loadedForUid.current = uid;
    refreshUsageStatus();
  }, [user?.uid, refreshUsageStatus]);

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