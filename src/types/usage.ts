// src/types/usage.ts

/**
 * Time period for usage tracking
 */
export type UsagePeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Usage data for a specific time period
 */
export interface PeriodUsage {
  /** Current usage count for this period */
  count: number;
  /** Timestamp when this period last reset */
  lastReset: string; // ISO string
  /** Maximum allowed for this period */
  limit: number;
}

/**
 * Complete usage tracking data for entity extraction
 */
export interface EntityExtractionUsage {
  /** Daily usage tracking */
  daily: PeriodUsage;
  /** Weekly usage tracking */
  weekly: PeriodUsage;
  /** Monthly usage tracking */
  monthly: PeriodUsage;
  /** Custom limit override (set by admin) */
  customLimit?: number;
  /** Whether user has unlimited access (set by admin) */
  isUnlimited?: boolean;
  /** Last extraction timestamp */
  lastExtraction?: string;
}

/**
 * Usage status returned from the server
 */
export interface UsageStatus {
  /** Current usage data */
  usage: EntityExtractionUsage;
  /** Whether any limit has been exceeded */
  limitExceeded: boolean;
  /** Which limit was exceeded (if any) */
  exceededPeriod?: UsagePeriod;
  /** When the next reset will occur */
  nextReset: {
    daily: string;
    weekly: string;
    monthly: string;
  };
}

/**
 * Default usage limits configuration
 */
export const DEFAULT_USAGE_LIMITS = {
  daily: 10,
  weekly: 30,
  monthly: 100
} as const;

/**
 * Usage limit error response
 */
export interface UsageLimitError {
  error: string;
  code: 'USAGE_LIMIT_EXCEEDED';
  usage: UsageStatus;
  contactInfo: {
    message: string;
    contactUrl: string;
    prefilledSubject: string;
  };
}