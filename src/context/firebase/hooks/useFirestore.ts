// src/context/firebase/hooks/useFirestore.ts
import { useCallback } from 'react';
import { QueryConstraint } from 'firebase/firestore';
import { useFirebaseContext } from '../FirebaseContext';
import firebaseServices from '../../../services/firebase';

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

  return {
    getDocument,
    getCollection,
    setDocument,
    updateDocument,
    deleteDocument,
    queryDocuments,
    batchOperations
  };
}