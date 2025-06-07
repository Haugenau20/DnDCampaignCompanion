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
import { ContentAttribution } from '../../../types/common';

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
      const username = userProfile.username || '';
      
      // Create attribution metadata with character information
      const now = new Date().toISOString();
      const attributionMetadata: Partial<ContentAttribution> = {
        createdBy: userId,
        createdByUsername: username,
        dateAdded: now,
        // Include character information
        createdByCharacterId: userProfile.activeCharacterId || null,
        createdByCharacterName: null // Will be set below if available
      };
      
      // If user has an active character, get its name
      if (userProfile.activeCharacterId && userProfile.characters) {
        const activeCharacter = userProfile.characters.find(
          (char: any) => char.id === userProfile.activeCharacterId
        );
        
        if (activeCharacter) {
          attributionMetadata.createdByCharacterName = activeCharacter.name;
        }
      }

      return attributionMetadata;
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
      const username = userProfile.username || '';
      
      // Create modification metadata with character information
      const now = new Date().toISOString();
      const attributionMetadata: Partial<ContentAttribution> = {
        modifiedBy: userId,
        modifiedByUsername: username,
        dateModified: now,
        // Include character information
        modifiedByCharacterId: userProfile.activeCharacterId || null,
        modifiedByCharacterName: null // Will be set below if available
      };
      
      // If user has an active character, get its name
      if (userProfile.activeCharacterId && userProfile.characters) {
        const activeCharacter = userProfile.characters.find(
          (char: any) => char.id === userProfile.activeCharacterId
        );
        
        if (activeCharacter) {
          attributionMetadata.modifiedByCharacterName = activeCharacter.name;
        }
      }

      return attributionMetadata;
    } catch (error) {
      console.error('Error getting modification attribution:', error);
      throw error;
    }
  }

  /**
   * Create a new document with attribution metadata including character information
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
    // Get attribution metadata with character information
    const attributionMetadata = await this.getCreationAttribution();
    
    // Create document reference
    const collectionRef = this.getCollectionRef(collectionName);
    let docId = id;
    
    if (!docId) {
      // Generate a new document ID
      docId = doc(collectionRef).id;
    }
    
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