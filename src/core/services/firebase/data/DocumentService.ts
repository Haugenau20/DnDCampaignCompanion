// src/core/services/firebase/data/DocumentService.ts
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
  writeBatch,
  onSnapshot,
  runTransaction,
  Unsubscribe
} from 'firebase/firestore';
import BaseFirebaseService from '../core/BaseFirebaseService';
import { ContentAttribution } from '../../../types/common';
import { buildCreationAttribution, buildModificationAttribution } from '../../../attribution';
import { DocumentAlreadyExistsError } from './DocumentAlreadyExistsError';
import { createDocumentIfAbsent } from './createDocumentIfAbsent';

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
   * The group a collection belongs to, read from its path: the group the
   * write lands in, and so the profile its attribution must come from. Taken
   * from the path rather than the active group, which a switch can change
   * while a write is in flight (T082).
   *
   * @param collectionRef The collection being written
   * @returns The group's id
   */
  private groupOf(collectionRef: { path: string }): string {
    const [root, groupId] = collectionRef.path.split('/');
    if (root === 'groups' && groupId) {
      return groupId;
    }
    const activeGroupId = this.getActiveGroupId();
    if (!activeGroupId) {
      throw new Error('No active group selected');
    }
    return activeGroupId;
  }

  /**
   * Get attribution metadata for document creation
   * Includes the active character information at creation time
   * @param groupId The group the document is written in
   * @returns Attribution metadata object
   */
  private async getCreationAttribution(groupId: string): Promise<Partial<ContentAttribution>> {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    try {
      // The user's username and active character, cached across writes
      const userProfile = await this.cachedGroupProfile(groupId, userId);

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      return buildCreationAttribution({ uid: userId, activeGroupUserProfile: userProfile });
    } catch (error) {
      console.error('Error getting attribution metadata:', error);
      throw error;
    }
  }
  
  /**
   * Get attribution metadata for document modification
   * Includes the active character information at modification time
   * @param groupId The group the document is written in
   * @returns Attribution metadata object
   */
  private async getModificationAttribution(groupId: string): Promise<Partial<ContentAttribution>> {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    try {
      // The user's username and active character, cached across writes
      const userProfile = await this.cachedGroupProfile(groupId, userId);

      if (!userProfile) {
        throw new Error('User profile not found');
      }

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
   * explicit `id` (e.g. one derived by slugifying a name), this method creates
   * the document only if nothing is there, in one transaction, and otherwise
   * throws {@link DocumentAlreadyExistsError} — the write-layer guard against
   * the class of bugs where two different inputs slugify to the same id and
   * the second create quietly overwrites the first (#002/#004/#009/#012),
   * including when two members create at the same moment (T081). Re-keying an
   * *existing* document under a new id on purpose must keep going through
   * `setDocument`, not this method.
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
    // Resolved before anything is awaited, so a group or campaign switch while
    // this create is in flight cannot move it (T082).
    const collectionRef = this.getCollectionRef(collectionName);
    const groupId = this.groupOf(collectionRef);

    /** The document with its creation attribution. */
    const withAttribution = async (): Promise<DocumentData> => ({
      ...data,
      ...(await this.getCreationAttribution(groupId))
    });

    if (!id) {
      // A generated id is fresh, so nothing can be there to overwrite.
      const docRef = doc(collectionRef);
      await setDoc(docRef, await withAttribution());
      return docRef.id;
    }

    // An explicit id was supplied (usually derived from a name) - refuse
    // rather than overwrite an existing document. The check and the write are
    // one transaction: as two steps, two members creating the same name at
    // once both passed the check and one record silently replaced the other
    // (T081). Attribution is fetched only once the id is known to be free, so
    // a collision fails fast without requiring a valid user profile.
    const created = await createDocumentIfAbsent(this.db, doc(collectionRef, id), withAttribution);
    if (!created) {
      // A typed error (same developer message as before) so callers that
      // derived the id from a name can pick the next free one (#1402).
      throw new DocumentAlreadyExistsError(collectionName, id);
    }

    return id;
  }

  /**
   * Create or update a document without attribution metadata
   * Use createDocument or updateDocumentWithAttribution for automatic attribution
   *
   * @param options `{ merge: true }` writes only the fields in `data`, nested
   *   maps included, creating the document if it does not exist -- an upsert
   *   of a patch, where `updateDocument` would fail with NOT_FOUND.
   */
  public async setDocument<T extends Record<string, any>>(
    collectionName: string,
    documentId: string,
    data: T,
    options?: { merge: boolean }
  ): Promise<void> {
    const collectionRef = this.getCollectionRef(collectionName);
    const docRef = doc(collectionRef, documentId);
    if (options) {
      await setDoc(docRef, data as DocumentData, options);
    } else {
      await setDoc(docRef, data as DocumentData);
    }
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
    // The target is resolved before the attribution read is awaited. It was
    // resolved after it, so switching campaign while that read was out sent
    // the edit to a same-id record in the other campaign (T082).
    const collectionRef = this.getCollectionRef(collectionName);
    const docRef = doc(collectionRef, documentId) as DocumentReference<T>;

    // Get modification attribution metadata with character information
    const attributionMetadata = await this.getModificationAttribution(this.groupOf(collectionRef));

    // Combine data with attribution metadata
    const fullData = {
      ...data,
      ...attributionMetadata
    };

    await updateDoc(docRef, fullData as Partial<DocumentData>);
  }

  /**
   * Update one document from a decision made on documents read in the same
   * transaction, with modification attribution.
   *
   * For a write whose validity depends on other records -- a location's new
   * parent must not already sit inside it. Checked against a list read
   * earlier, two members can each make a move that is valid alone and
   * together form a cycle (DATA-006). Here Firestore notices if anything
   * `decide` read changed before the commit and runs `decide` again against
   * what was committed, so the second move sees the first.
   *
   * `decide` reads by id from the same collection and returns the fields to
   * write; throwing refuses the write. It may run more than once. A query
   * cannot take part: a transaction reads documents, not lists.
   *
   * Needs the server: offline, the transaction fails rather than queueing.
   *
   * @param collectionName Collection name or full path
   * @param documentId The document to update; it must exist
   * @param decide Reads what it needs and returns the fields to write
   */
  public async updateDocumentAfterReading<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    decide: (read: (id: string) => Promise<(T & { id: string }) | undefined>) => Promise<Partial<T>>
  ): Promise<void> {
    // Resolved before any await, as in `updateDocumentWithAttribution` (T082).
    const collectionRef = this.getCollectionRef(collectionName);
    const attributionMetadata = await this.getModificationAttribution(this.groupOf(collectionRef));

    await runTransaction(this.db, async (transaction) => {
      const read = async (id: string) => {
        const snapshot = await transaction.get(doc(collectionRef, id));
        return snapshot.exists() ? ({ ...(snapshot.data() as T), id: snapshot.id }) : undefined;
      };
      const fields = await decide(read);
      transaction.update(doc(collectionRef, documentId), {
        ...fields,
        ...attributionMetadata
      } as Partial<DocumentData>);
    });
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
   * Listen to every document in a collection (T032).
   *
   * Takes an explicit collection path rather than a bare name: a listener
   * outlives the moment it was opened, so it must not resolve its group and
   * campaign from this service's mutable active ids. The caller builds the
   * path from the same state it renders.
   *
   * The first call to `onNext` carries the whole collection; later calls
   * follow every change, including this client's own writes, which arrive
   * before the write's promise resolves (latency compensation).
   *
   * @param collectionPath Full collection path, e.g. `groups/g/campaigns/c/npcs`
   * @param onNext Receives the collection's documents on every change
   * @param onError Receives a listener failure; the listener is closed after it
   * @param constraints Query constraints to apply
   * @returns Function that closes the listener
   */
  public subscribeToCollection<T>(
    collectionPath: string,
    onNext: (documents: T[]) => void,
    onError: (error: Error) => void,
    constraints: QueryConstraint[] = []
  ): Unsubscribe {
    const q = query(collection(this.db, collectionPath), ...constraints);
    return onSnapshot(
      q,
      (snapshot) => {
        onNext(snapshot.docs.map(document => ({
          id: document.id,
          ...document.data()
        } as T)));
      },
      onError
    );
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