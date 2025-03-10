// types/saga.ts

/**
 * Interface for the saga data structure
 */
export interface SagaData {
    /** Title of the saga */
    title: string;
    /** The complete saga narrative */
    content: string;
    /** Last updated timestamp */
    lastUpdated: string;
    /** Version number of the saga */
    version: string;
  }