// src/services/firebase/data/DocumentService.ts
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    QueryConstraint, 
    DocumentData, 
    WithFieldValue, 
    DocumentReference,
    writeBatch
  } from 'firebase/firestore';
  import BaseFirebaseService from '../core/BaseFirebaseService';
  
  /**
   * DocumentService provides generic CRUD operations for Firestore documents
   * with automatic group and campaign context handling
   */
  class DocumentService extends BaseFirebaseService {
    private static instance: DocumentService;
  
    private constructor() {
      super();
    }
  
    /**
     * Get singleton instance of DocumentService
     */
    public static getInstance(): DocumentService {
      if (!DocumentService.instance) {
        DocumentService.instance = new DocumentService();
      }
      return DocumentService.instance;
    }
    
    /**
     * Get collection reference with group/campaign context
     * @param collectionName Name of the collection to access
     * @returns Firestore collection reference with proper path
     */
    private getCollectionRef(collectionName: string) {
      const activeGroupId = this.getActiveGroupId();
      const activeCampaignId = this.getActiveCampaignId();
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      if (activeCampaignId) {
        // Campaign-specific collections
        return collection(
          this.db,
          'groups',
          activeGroupId,
          'campaigns',
          activeCampaignId,
          collectionName
        );
      } else {
        // Group-level collections
        return collection(
          this.db,
          'groups',
          activeGroupId,
          collectionName
        );
      }
    }
  
    /**
     * Create or update a document in a collection with group/campaign context
     */
    public async setDocument<T extends Record<string, any>>(
        collectionName: string,
        documentId: string,
        data: T
      ): Promise<void> {
        const collectionRef = this.getCollectionRef(collectionName);
        const docRef = doc(collectionRef, documentId);
        await setDoc(docRef, data as DocumentData);
      }
  
    /**
     * Update specific fields in a document with group/campaign context
     */
    public async updateDocument<T extends DocumentData>(
      collectionName: string,
      documentId: string,
      data: Partial<WithFieldValue<T>>
    ): Promise<void> {
      const collectionRef = this.getCollectionRef(collectionName);
      const docRef = doc(collectionRef, documentId) as DocumentReference<T>;
      await updateDoc(docRef, data as Partial<DocumentData>);
    }
  
    /**
     * Get a document by ID with or without group/campaign context
     * @param collectionName Name of the collection to access
     * @param documentId ID of the document to retrieve
     * @param requireContext Whether to require group/campaign context (default: true)
     * @returns Document data or null if not found
     */
    public async getDocument<T>(
      collectionName: string,
      documentId: string,
      requireContext: boolean = true
    ): Promise<T | null> {
      try {
        // Special case for global collections (like 'users')
        if (collectionName === 'users' || !requireContext) {
          // Access these collections directly without group/campaign context
          const docRef = doc(this.db, collectionName, documentId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            return { ...docSnap.data(), id: docSnap.id } as T;
          }
          
          return null;
        }
        
        // For collections that require group/campaign context
        const collectionRef = this.getCollectionRef(collectionName);
        const docRef = doc(collectionRef, documentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return { ...docSnap.data(), id: docSnap.id } as T;
        }
        
        return null;
      } catch (error) {
        console.error(`Error getting document ${documentId} from ${collectionName}:`, error);
        return null;
      }
    }
  
    /**
     * Get all documents in a collection with group/campaign context
     */
    public async getCollection<T>(
      collectionName: string,
      constraints: QueryConstraint[] = []
    ): Promise<T[]> {
      try {
        const collectionRef = this.getCollectionRef(collectionName);
        const q = query(collectionRef, ...constraints);
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as T));
      } catch (error) {
        // If no active group, return empty array
        if (error instanceof Error && error.message === 'No active group selected') {
          console.warn('No active group selected for collection:', collectionName);
          return [];
        }
        
        console.error(`Error getting collection ${collectionName}:`, error);
        return [];
      }
    }
  
    /**
     * Delete a document with group/campaign context
     */
    public async deleteDocument(
      collectionName: string,
      documentId: string
    ): Promise<void> {
      const collectionRef = this.getCollectionRef(collectionName);
      const docRef = doc(collectionRef, documentId);
      await deleteDoc(docRef);
    }
  
    /**
     * Query documents in a collection with group/campaign context
     */
    public async queryDocuments<T>(
      collectionName: string,
      field: string,
      operator: '==' | '!=' | '>' | '<' | '>=' | '<=',
      value: any
    ): Promise<T[]> {
      try {
        const collectionRef = this.getCollectionRef(collectionName);
        const q = query(collectionRef, where(field, operator, value));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as T));
      } catch (error) {
        // If no active group, return empty array
        if (error instanceof Error && error.message === 'No active group selected') {
          console.warn('No active group selected for query:', collectionName);
          return [];
        }
        
        console.error(`Error querying collection ${collectionName}:`, error);
        return [];
      }
    }
  
    /**
     * Perform batch operations with group/campaign context
     * @param operations Array of operations to perform
     */
    public async batchOperations(operations: {
      type: 'set' | 'update' | 'delete';
      collection: string;
      id: string;
      data?: any;
    }[]): Promise<void> {
      const batch = writeBatch(this.db);
      
      for (const op of operations) {
        const collectionRef = this.getCollectionRef(op.collection);
        const docRef = doc(collectionRef, op.id);
        
        switch (op.type) {
          case 'set':
            batch.set(docRef, op.data);
            break;
          case 'update':
            batch.update(docRef, op.data);
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      }
      
      await batch.commit();
    }
  }
  
  export default DocumentService;