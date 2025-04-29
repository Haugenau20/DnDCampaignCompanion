// src/types/saga.ts
import { ContentAttribution } from './common';

/**
 * Interface for the saga data structure
 */
export interface SagaData extends ContentAttribution {
  /** Title of the saga */
  title: string;
  /** The complete saga narrative */
  content: string;
  /** Last updated timestamp */
  lastUpdated: string;
  /** Version number of the saga */
  version: string;
}

// Context types
export interface SagaContextState {
  saga: SagaData | null;
  isLoading: boolean;
  error: string | null;
}

export interface SagaContextValue extends SagaContextState {
  updateSaga: (sagaData: Partial<SagaData>) => Promise<void>;
  getSaga: () => Promise<SagaData | null>;
  hasRequiredContext: boolean;
}