// src/core/services/firebase/data/DocumentService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
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
import { ContentAttribution } from '../../../types/common';
import { buildCreationAttribution, buildModificationAttribution } from '../../../attribution';

/**
 * DocumentService provides generic CRUD operations for Firestore documents
 * with automatic group and campaign context handling and attribution metadata
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
   * Get collection reference - handles different path formats
   * @param collectionPath Full collection path or collection name
   * @returns Firestore collection reference with proper path
   */
  private getCollectionRef(collectionPath: string) {
    // If path already contains '/', it's a full path - use directly
    if (collectionPath.includes('/')) {
      return collection(this.db, collectionPath);
    }
    
    // Otherwise, construct path with group/campaign context
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
        collectionPath
      );
    } else {
      // Group-level collections
      return collection(
        this.db,
        'groups',
        activeGroupId,
        collectionPath
      );
    }
  }

  /**
   * Get attribution metadata for document creation
   * Includes the active character information at creation time
   * @returns Attribution metadata object
   */
  private async getCreationAttribution(): Promise<Partial<ContentAttribution>> {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    try {
      // Get active group ID
      const activeGroupId = this.getActiveGroupId();
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }

      // Get user profile to find username and active character
      const userProfileRef = doc(this.db, 'groups', activeGroupId, 'users', userId);
      const userProfileDoc = await getDoc(userProfileRef);
      
      if (!userProfileDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userProfile = userProfileDoc.data();

      return buildCreationAttribution({ uid: userId, activeGroupUserProfile: userProfile });
    } catch (error) {
      console.error('Error getting attribution metadata:', error);
      throw error;
    }
  }
  
  /**
   * Get attribution metadata for document modification
   * Includes the active character information at modification time
   * @returns Attribution metadata object
   */
  private async getModificationAttribution(): Promise<Partial<ContentAttribution>> {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    try {
      // Get active group ID
      const activeGroupId = this.getActiveGroupId();
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }

      // Get user profile to find username and active character
      const userProfileRef = doc(this.db, 'groups', activeGroupId, 'users', userId);
      const userProfileDoc = await getDoc(userProfileRef);
      
      if (!userProfileDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userProfile = userProfileDoc.data();

      return buildModificationAttribution({ uid: userId, activeGroupUserProfile: userProfile });
    } catch (error) {
      console.error('Error getting modification attribution:', error);
      throw error;
    }
  }

  /**
   * Create a new document with attribution metadata including character information
   *
   * `setDoc` (used below) is a full overwrite: if `id` names a document that
   * already exists, that document is silently destroyed. When no `id` is
   * supplied, a fresh Firestore-generated id is used and collision is
   * impossible, so no check is needed. When the caller *does* supply an
   * explicit `id` (e.g. one derived by slugifying a name), this method reads
   * the document first and refuses to proceed if it already exists — this is
   * the write-layer guard against the class of bugs where two different
   * inputs slugify to the same id and the second create quietly overwrites
   * the first (#002/#004/#009/#012). Re-keying an *existing* document under a
   * new id on purpose must keep going through `setDocument`, not this method.
   *
   * @param collectionName Collection name or full path
   * @param data Document data
   * @param id Optional document ID (generated if not provided)
   * @returns ID of the created document
   */
  public async createDocument<T extends Record<string, any>>(
    collectionName: string,
    data: T,
    id?: string
  ): Promise<string> {
    // Create document reference
    const collectionRef = this.getCollectionRef(collectionName);
    let docId = id;

    if (!docId) {
      // Generate a new document ID
      docId = doc(collectionRef).id;
    } else {
      // An explicit id was supplied - guard against silently overwriting an
      // existing document. Checked before fetching attribution so a
      // collision fails fast without requiring a valid user profile.
      const existingSnap = await getDoc(doc(collectionRef, docId));
      if (existingSnap.exists()) {
        throw new Error(
          `Cannot create document: a document with id "${docId}" already exists in collection "${collectionName}". ` +
          `createDocument never overwrites an existing document - use updateDocumentWithAttribution to modify it, ` +
          `or setDocument if this is a deliberate re-key.`
        );
      }
    }

    // Get attribution metadata with character information
    const attributionMetadata = await this.getCreationAttribution();

    const docRef = doc(collectionRef, docId);

    // Combine data with attribution metadata
    const fullData = {
      ...data,
      ...attributionMetadata
    };

    // Save document
    await setDoc(docRef, fullData as DocumentData);

    return docId;
  }

  /**
   * Create or update a document without attribution metadata
   * Use createDocument or updateDocumentWithAttribution for automatic attribution
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
   * Update specific fields in a document with attribution metadata
   * @param collectionName Collection name or full path
   * @param documentId ID of the document to update
   * @param data Partial data to update
   * @returns Promise that resolves when update is complete
   */
  public async updateDocumentWithAttribution<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: Partial<WithFieldValue<T>>
  ): Promise<void> {
    // Get modification attribution metadata with character information
    const attributionMetadata = await this.getModificationAttribution();
    
    // Combine data with attribution metadata
    const fullData = {
      ...data,
      ...attributionMetadata
    };
    
    // Update document
    const collectionRef = this.getCollectionRef(collectionName);
    const docRef = doc(collectionRef, documentId) as DocumentReference<T>;
    await updateDoc(docRef, fullData as Partial<DocumentData>);
  }

  /**
   * Update specific fields in a document without attribution metadata
   * Use updateDocumentWithAttribution for automatic attribution
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
   * @param collectionName Collection name or full path
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
      if (!requireContext || (collectionName === 'users' && !collectionName.includes('/'))) {
        // Access these collections directly without group/campaign context
        const docRef = doc(this.db, collectionName, documentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return { ...docSnap.data(), id: docSnap.id } as T;
        }
        
        return null;
      }
      
      // For collections that require group/campaign context or use full paths
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
   * @param collectionName Collection name or full path
   * @param constraints Query constraints to apply
   * @returns Array of documents
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
   * Server-side count of the documents in a collection.
   *
   * Uses `getCountFromServer`, which bills one read regardless of how many
   * documents the collection holds and never transfers a single document
   * body -- the same aggregation-query shape
   * `CampaignService.getCampaignCounts` already relies on. Unlike
   * `getCollection`, a rejected count is not swallowed into an empty
   * result: the caller decides what a failed count means (typically:
   * "leave this clause out"), so the promise is left to reject.
   *
   * @param path Collection name or full path -- resolved the same way as
   *   every other method here, via `getCollectionRef`. A path containing
   *   `/` (e.g. `"groups/g1/users/u1/notes"`) is used exactly as written.
   * @returns The number of documents in the collection.
   */
  public async getCollectionCount(path: string): Promise<number> {
    const collectionRef = this.getCollectionRef(path);
    const snapshot = await getCountFromServer(collectionRef);
    return snapshot.data().count;
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
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'array-contains',
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