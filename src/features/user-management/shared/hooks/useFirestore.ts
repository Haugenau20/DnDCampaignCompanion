// src/context/firebase/hooks/useFirestore.ts
import { useCallback } from 'react';
import { QueryConstraint } from 'firebase/firestore';
import { useFirebaseContext } from 'features/user-management/auth/context/FirebaseContext';
import firebaseServices from 'core/services/firebase';

export function useFirestore() {
  const { setError } = useFirebaseContext();

  // Get document 
  const getDocument = useCallback(async <T>(
    collectionName: string,
    documentId: string,
    requireContext: boolean = true
  ): Promise<T | null> => {
    try {
      return await firebaseServices.document.getDocument<T>(
        collectionName, 
        documentId, 
        requireContext
      );
    } catch (err) {
      console.error(`Error getting document ${documentId}:`, err);
      return null;
    }
  }, []);

  // Get collection
  const getCollection = useCallback(async <T>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> => {
    try {
      return await firebaseServices.document.getCollection<T>(collectionName, constraints);
    } catch (err) {
      console.error(`Error getting collection ${collectionName}:`, err);
      return [];
    }
  }, []);

  // Set document
  const setDocument = useCallback(async <T>(
    collectionName: string,
    documentId: string,
    data: T
  ): Promise<void> => {
    try {
      setError(null);
      // Use type assertion to make this work with any type
      await firebaseServices.document.setDocument(collectionName, documentId, data as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set document');
      throw err;
    }
  }, [setError]);

  // Update document
  const updateDocument = useCallback(async <T>(
    collectionName: string,
    documentId: string,
    data: Partial<T>
  ): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.document.updateDocument(collectionName, documentId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document');
      throw err;
    }
  }, [setError]);

  // Create document with attribution metadata
  const createDocument = useCallback(async <T>(
    collectionName: string,
    data: T,
    id?: string
  ): Promise<string> => {
    try {
      setError(null);
      // Use type assertion to make this work with any type
      return await firebaseServices.document.createDocument(collectionName, data as any, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
      throw err;
    }
  }, [setError]);

  // Update document with attribution metadata
  const updateDocumentWithAttribution = useCallback(async <T>(
    collectionName: string,
    documentId: string,
    data: Partial<T>
  ): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.document.updateDocumentWithAttribution(collectionName, documentId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document');
      throw err;
    }
  }, [setError]);

  // Update one document from a decision made inside a transaction
  const updateDocumentAfterReading = useCallback(async <T>(
    collectionName: string,
    documentId: string,
    decide: (read: (id: string) => Promise<(T & { id: string }) | undefined>) => Promise<Partial<T>>
  ): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.document.updateDocumentAfterReading<any>(collectionName, documentId, decide);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document');
      throw err;
    }
  }, [setError]);

  // Update several documents from a decision made inside a transaction (T088)
  const updateDocumentsAfterReading = useCallback(async <T>(
    collectionName: string,
    decide: (read: (id: string) => Promise<(T & { id: string }) | undefined>) => Promise<Array<{ id: string; data: Partial<T> }>>
  ): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.document.updateDocumentsAfterReading<any>(collectionName, decide);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update documents');
      throw err;
    }
  }, [setError]);

  // The documents whose field matches, from the server, never the cache (T088)
  const queryFromServer = useCallback(async <T>(
    collectionName: string,
    field: string,
    value: unknown
  ): Promise<Array<T & { id: string }>> => {
    try {
      setError(null);
      return await firebaseServices.document.queryFromServer<T>(collectionName, field, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query documents');
      throw err;
    }
  }, [setError]);

  // Create one document and update others, in one transaction
  const createDocumentWithUpdates = useCallback(async <T, S>(
    collectionName: string,
    id: string,
    sourceCollection: string,
    decide: (read: (id: string) => Promise<(S & { id: string }) | undefined>) => Promise<{
      create: T;
      updates: Array<{ id: string; data: Partial<S> }>;
      /** Notes to create in the same commit (T133); see `DocumentService`. */
      notes?: Array<{ under: 'created' | { updated: string }; id: string; data: Record<string, unknown> }>;
    }>
  ): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.document.createDocumentWithUpdates<any, any>(
        collectionName, id, sourceCollection, decide
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
      throw err;
    }
  }, [setError]);

  // Delete document
  const deleteDocument = useCallback(async (
    collectionName: string,
    documentId: string
  ): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.document.deleteDocument(collectionName, documentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
      throw err;
    }
  }, [setError]);

  // Query documents
  const queryDocuments = useCallback(async <T>(
    collectionName: string,
    field: string,
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=',
    value: any
  ): Promise<T[]> => {
    try {
      return await firebaseServices.document.queryDocuments<T>(
        collectionName, 
        field, 
        operator, 
        value
      );
    } catch (err) {
      console.error(`Error querying ${collectionName}:`, err);
      return [];
    }
  }, []);

  // Batch operations
  const batchOperations = useCallback(async (operations: {
    type: 'set' | 'update' | 'delete';
    collection: string;
    id: string;
    data?: any;
  }[]): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.document.batchOperations(operations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform batch operations');
      throw err;
    }
  }, [setError]);

  // Listen to a collection by its full path. No error state is set here: a
  // listener's failure belongs to the one consumer that opened it.
  const subscribeToCollection = useCallback(<T>(
    collectionPath: string,
    onNext: (documents: T[]) => void,
    onError: (error: Error) => void,
    constraints: QueryConstraint[] = []
  ) => {
    return firebaseServices.document.subscribeToCollection<T>(
      collectionPath,
      onNext,
      onError,
      constraints
    );
  }, []);

  return {
    getDocument,
    getCollection,
    subscribeToCollection,
    setDocument,
    updateDocument,
    createDocument,
    updateDocumentWithAttribution,
    updateDocumentAfterReading,
    updateDocumentsAfterReading,
    queryFromServer,
    createDocumentWithUpdates,
    deleteDocument,
    queryDocuments,
    batchOperations
  };
}