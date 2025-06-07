// src/types/saga.ts
import { Entity, DomainData, EntityContextValue } from './common';

/**
 * Domain data for Saga - this is what forms collect and submit
 * No system metadata, no ID - pure domain information only
 */
export interface SagaDomainData {
  /** Title of the saga */
  title: string;
  /** The complete saga narrative */
  content: string;
  /** Version number of the saga */
  version: string;
}

/**
 * Complete Saga entity with system metadata
 * This is what contexts store and manage
 */
export interface SagaData extends Entity<SagaDomainData> {
  // Explicit domain data properties for TypeScript
  title: string;
  content: string;
  version: string;
}

/**
 * Type alias for clean form data
 */
export type SagaFormData = DomainData<SagaData>;

/**
 * Extended context methods specific to Saga
 */
export interface SagaContextMethods {
  /** Get the saga */
  getSaga: () => Promise<SagaData | null>;
  /** Check if has required context */
  hasRequiredContext: boolean;
}

/**
 * Extended state for saga context (saga is singleton)
 */
export interface SagaContextState {
  /** The saga data */
  saga: SagaData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Complete Saga context value
 */
export interface SagaContextValue extends SagaContextState, SagaContextMethods {
  /** Update the saga with clean domain data */
  update: (data: SagaFormData) => Promise<SagaData>;
}