// src/hooks/useFirebaseData.ts
import { useState, useCallback, useEffect } from 'react';
import { useFirestore } from '../context/firebase';
import { AUTH_STATE_CHANGED_EVENT } from '../context/firebase';

interface UseFirebaseDataOptions<T> {
  collection: string;
  idField?: keyof T;
}

export function useFirebaseData<T extends Record<string, any>>(
  options: UseFirebaseDataOptions<T>
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { 
    getCollection, 
    setDocument, 
    updateDocument, 
    deleteDocument 
  } = useFirestore();

  const getData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedData = await getCollection<T>(options.collection);
      setData(fetchedData);
      return fetchedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Error fetching data:', errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [options.collection, getCollection]);

  // Add useEffect to fetch data on mount
  useEffect(() => {
    getData();
  }, [getData]);

  // Add listener for auth state changes to refresh data
  useEffect(() => {
    const handleAuthStateChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{authenticated: boolean}>;
      
      // Clear data immediately on sign out
      if (!customEvent.detail.authenticated) {
        setData([]);
      }
      
      // Refresh data on both sign in and sign out
      getData();
    };

    window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    
    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    };
  }, [getData]);

  const addData = useCallback(async (newData: T, documentId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const id = documentId || 
                (options.idField ? newData[options.idField] as string : crypto.randomUUID());
                
      await setDocument(options.collection, id, newData);
      setData(prevData => [...prevData, { ...newData, id }]);
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options.collection, options.idField, setDocument]);

  const updateData = useCallback(async (id: string, updatedData: Partial<T>) => {
    setLoading(true);
    setError(null);
    try {
      await updateDocument(options.collection, id, updatedData);
      setData(prevData => 
        prevData.map(item => 
          'id' in item && item.id === id ? { ...item, ...updatedData } : item
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options.collection, updateDocument]);

  const deleteData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteDocument(options.collection, id);
      setData(prevData => prevData.filter(item => 'id' in item && item.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options.collection, deleteDocument]);

  return {
    data,
    loading,
    error,
    getData,
    addData,
    updateData,
    deleteData,
    setDocument: addData // Backward compatibility
  };
}