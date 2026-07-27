// src/features/storytelling/sagas/types.ts
import { ContentAttribution } from 'core/types/common';

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

/**
 * The domain fields a caller supplies when saving a saga.
 *
 * Attribution metadata (`created*` / `modified*` / `dateAdded` / `dateModified`) is
 * computed exclusively by `useSagaData` (see bug #1203) — a page or component must
 * never construct those fields itself.
 */
export type SagaContentInput = Pick<SagaData, 'title' | 'content' | 'lastUpdated' | 'version'>;

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