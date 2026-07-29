// src/core/services/firebase/data/__tests__/DocumentService.test.ts

/**
 * Tests for DocumentService
 *
 * DocumentService wraps Firestore with group/campaign context and
 * attribution metadata.  All Firebase SDK calls are mocked.
 */

// ─── Firestore SDK mocks ──────────────────────────────────────────────────────

const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockQuery = jest.fn((_ref: any, ...args: any[]) => ({ ref: _ref, constraints: args }));
const mockWhere = jest.fn((...args: any[]) => ({ type: 'where', args }));
const mockWriteBatch = jest.fn();
const mockCollection = jest.fn((_db: any, path: string, ...segs: string[]) => ({
  path: [path, ...segs].join('/'),
}));
const mockDoc = jest.fn((_db_or_ref: any, ...segs: string[]) => ({
  path: segs.join('/'),
  id: segs[segs.length - 1] || 'auto-id',
}));

// Batch mock
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatchObj = {
  set: mockBatchSet,
  update: mockBatchUpdate,
  delete: mockBatchDelete,
  commit: mockBatchCommit,
};

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
  // Using apply to avoid TS2556 strict-mode spread errors
  collection: function() { return (mockCollection as Function).apply(null, arguments); },
  doc: function() { return (mockDoc as Function).apply(null, arguments); },
  getDoc: function() { return (mockGetDoc as Function).apply(null, arguments); },
  getDocs: function() { return (mockGetDocs as Function).apply(null, arguments); },
  setDoc: function() { return (mockSetDoc as Function).apply(null, arguments); },
  updateDoc: function() { return (mockUpdateDoc as Function).apply(null, arguments); },
  deleteDoc: function() { return (mockDeleteDoc as Function).apply(null, arguments); },
  query: function() { return (mockQuery as Function).apply(null, arguments); },
  where: function() { return (mockWhere as Function).apply(null, arguments); },
  writeBatch: function() { return (mockWriteBatch as Function).apply(null, arguments); },
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: { uid: 'user-doc-test' } })),
  connectAuthEmulator: jest.fn(),
}));
jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  connectFunctionsEmulator: jest.fn(),
}));
jest.mock('../../config/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test' },
  useEmulators: false,
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
}));

// Mock ServiceRegistry so DocumentService can be constructed directly
jest.mock('../../core/ServiceRegistry', () => {
  const registry = new Map<string, any>();
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => ({
        get: (name: string) => {
          if (!registry.has(name)) throw new Error(`Service '${name}' not found in registry`);
          return registry.get(name);
        },
        register: (name: string, svc: any) => registry.set(name, svc),
        has: (name: string) => registry.has(name),
      })),
    },
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDocSnapshot(exists: boolean, data: Record<string, any> = {}, id = 'doc-id') {
  return { exists: () => exists, data: () => data, id };
}

function makeQuerySnapshot(docs: ReturnType<typeof makeDocSnapshot>[]) {
  return { docs };
}

/**
 * Asserts that `value` is a string in ISO 8601 format (e.g. produced by
 * `new Date().toISOString()`), without pinning to an exact instant.
 */
function expectIso8601String(value: unknown) {
  expect(typeof value).toBe('string');
  expect(value as string).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('DocumentService', () => {
  let DocumentService: typeof import('../DocumentService').default;
  const AUTH_MOCK = { currentUser: { uid: 'user-doc-test' } };

  beforeEach(() => {
    jest.resetModules();

    jest.doMock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => ({})),
      connectFirestoreEmulator: jest.fn(),
      collection: function() { return (mockCollection as Function).apply(null, arguments); },
      doc: function() { return (mockDoc as Function).apply(null, arguments); },
      getDoc: function() { return (mockGetDoc as Function).apply(null, arguments); },
      getDocs: function() { return (mockGetDocs as Function).apply(null, arguments); },
      setDoc: function() { return (mockSetDoc as Function).apply(null, arguments); },
      updateDoc: function() { return (mockUpdateDoc as Function).apply(null, arguments); },
      deleteDoc: function() { return (mockDeleteDoc as Function).apply(null, arguments); },
      query: function() { return (mockQuery as Function).apply(null, arguments); },
      where: function() { return (mockWhere as Function).apply(null, arguments); },
      writeBatch: function() { return (mockWriteBatch as Function).apply(null, arguments); },
    }));
    jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
    jest.doMock('firebase/auth', () => ({
      getAuth: jest.fn(() => AUTH_MOCK),
      connectAuthEmulator: jest.fn(),
    }));
    jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
    jest.doMock('firebase/functions', () => ({
      getFunctions: jest.fn(() => ({})),
      connectFunctionsEmulator: jest.fn(),
    }));
    jest.doMock('../../config/firebaseConfig', () => ({
      firebaseConfig: { apiKey: 'test', projectId: 'test' },
      useEmulators: false,
      emulatorHost: 'localhost',
      emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
    }));

    const registry = new Map<string, any>();
    jest.doMock('../../core/ServiceRegistry', () => ({
      __esModule: true,
      default: {
        getInstance: jest.fn(() => ({
          get: (name: string) => {
            if (!registry.has(name)) throw new Error(`Service '${name}' not found in registry`);
            return registry.get(name);
          },
          register: (name: string, svc: any) => registry.set(name, svc),
          has: (name: string) => registry.has(name),
        })),
      },
    }));

    [mockSetDoc, mockUpdateDoc, mockDeleteDoc, mockGetDoc, mockGetDocs,
     mockBatchSet, mockBatchUpdate, mockBatchDelete, mockBatchCommit].forEach(m => m.mockReset());
    mockWriteBatch.mockReturnValue(mockBatchObj);
    mockBatchCommit.mockResolvedValue(undefined);

    DocumentService = require('../DocumentService').default;
  });

  // ─── getInstance ────────────────────────────────────────────────────────────

  describe('getInstance', () => {
    test('should return a DocumentService instance', () => {
      expect(DocumentService.getInstance()).toBeDefined();
    });

    test('should be a singleton', () => {
      expect(DocumentService.getInstance()).toBe(DocumentService.getInstance());
    });
  });

  // ─── getDocument – global path (requireContext=false) ────────────────────────

  describe('getDocument', () => {
    test('should return null when document does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      const result = await svc.getDocument('users', 'uid-1', false);
      expect(result).toBeNull();
    });

    test('should return document data with id when exists (requireContext=false)', async () => {
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { email: 'a@b.com' }, 'uid-1'));
      const svc = DocumentService.getInstance();
      const result = await svc.getDocument<{ email: string; id: string }>('users', 'uid-1', false);
      expect(result?.email).toBe('a@b.com');
      expect(result?.id).toBe('uid-1');
    });

    test('should return null and not throw on Firestore error', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('network error'));
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      const result = await svc.getDocument('npcs', 'n1');
      expect(result).toBeNull();
    });
  });

  // ─── getCollection ─────────────────────────────────────────────────────────

  describe('getCollection', () => {
    test('should return empty array when no active group is set', async () => {
      const svc = DocumentService.getInstance();
      svc.setActiveGroup(null);
      const result = await svc.getCollection('npcs');
      expect(result).toEqual([]);
    });

    test('should return mapped documents when query succeeds', async () => {
      mockGetDocs.mockResolvedValueOnce(
        makeQuerySnapshot([
          makeDocSnapshot(true, { name: 'Gandalf' }, 'n1'),
          makeDocSnapshot(true, { name: 'Frodo' }, 'n2'),
        ])
      );
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      const docs = await svc.getCollection<{ id: string; name: string }>('npcs');
      expect(docs).toHaveLength(2);
      expect(docs[0].id).toBe('n1');
      expect(docs[0].name).toBe('Gandalf');
    });

    test('should return empty array and not throw on Firestore error', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('network error'));
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      const result = await svc.getCollection('npcs');
      expect(result).toEqual([]);
    });
  });

  // ─── setDocument ──────────────────────────────────────────────────────────

  describe('setDocument', () => {
    test('should call Firestore setDoc', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.setDocument('npcs', 'n1', { name: 'Gandalf' });
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    test('should throw when no active group is set', async () => {
      const svc = DocumentService.getInstance();
      svc.setActiveGroup(null);
      await expect(svc.setDocument('npcs', 'n1', { name: 'Gandalf' })).rejects.toThrow(
        'No active group selected'
      );
    });

    test('should overwrite an existing document without any existence check (the deliberate re-key path StoryContext relies on)', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');

      await svc.setDocument('chapters', 'chapter-1', { title: 'First' });
      await svc.setDocument('chapters', 'chapter-1', { title: 'Second' });

      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      // The collision guard added to createDocument must not apply here.
      expect(mockGetDoc).not.toHaveBeenCalled();
    });
  });

  // ─── updateDocument ─────────────────────────────────────────────────────────

  describe('updateDocument', () => {
    test('should call Firestore updateDoc', async () => {
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.updateDocument('npcs', 'n1', { name: 'Aragorn' });
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });
  });

  // ─── deleteDocument ─────────────────────────────────────────────────────────

  describe('deleteDocument', () => {
    test('should call Firestore deleteDoc', async () => {
      mockDeleteDoc.mockResolvedValueOnce(undefined);
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.deleteDocument('npcs', 'n1');
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });

    test('should throw when no active group is set', async () => {
      const svc = DocumentService.getInstance();
      svc.setActiveGroup(null);
      await expect(svc.deleteDocument('npcs', 'n1')).rejects.toThrow(
        'No active group selected'
      );
    });
  });

  // ─── queryDocuments ─────────────────────────────────────────────────────────

  describe('queryDocuments', () => {
    test('should return empty array when no active group', async () => {
      const svc = DocumentService.getInstance();
      svc.setActiveGroup(null);
      const result = await svc.queryDocuments('npcs', 'name', '==', 'Gandalf');
      expect(result).toEqual([]);
    });

    test('should return mapped results on success', async () => {
      mockGetDocs.mockResolvedValueOnce(
        makeQuerySnapshot([makeDocSnapshot(true, { name: 'Gandalf' }, 'n1')])
      );
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      const result = await svc.queryDocuments<{ id: string; name: string }>(
        'npcs', 'name', '==', 'Gandalf'
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Gandalf');
    });

    test('should return empty array on Firestore error', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('query error'));
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      const result = await svc.queryDocuments('npcs', 'name', '==', 'x');
      expect(result).toEqual([]);
    });
  });

  // ─── batchOperations ────────────────────────────────────────────────────────

  describe('batchOperations', () => {
    test('should call batch.commit after applying operations', async () => {
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.batchOperations([
        { type: 'set', collection: 'npcs', id: 'n1', data: { name: 'Gandalf' } },
        { type: 'update', collection: 'npcs', id: 'n2', data: { name: 'Frodo' } },
        { type: 'delete', collection: 'npcs', id: 'n3' },
      ]);
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
      expect(mockBatchDelete).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
  });

  // ─── createDocument (attribution) ───────────────────────────────────────────

  describe('createDocument', () => {
    test('should throw when user is not authenticated', async () => {
      // Simulate unauthenticated state
      jest.resetModules();
      jest.doMock('firebase/auth', () => ({
        getAuth: jest.fn(() => ({ currentUser: null })),
        connectAuthEmulator: jest.fn(),
      }));
      jest.doMock('firebase/firestore', () => ({
        getFirestore: jest.fn(() => ({})),
        connectFirestoreEmulator: jest.fn(),
        collection: function() { return (mockCollection as Function).apply(null, arguments); },
        doc: function() { return (mockDoc as Function).apply(null, arguments); },
        getDoc: function() { return (mockGetDoc as Function).apply(null, arguments); },
        getDocs: function() { return (mockGetDocs as Function).apply(null, arguments); },
        setDoc: function() { return (mockSetDoc as Function).apply(null, arguments); },
        updateDoc: function() { return (mockUpdateDoc as Function).apply(null, arguments); },
        deleteDoc: function() { return (mockDeleteDoc as Function).apply(null, arguments); },
        query: function() { return (mockQuery as Function).apply(null, arguments); },
        where: function() { return (mockWhere as Function).apply(null, arguments); },
        writeBatch: function() { return (mockWriteBatch as Function).apply(null, arguments); },
      }));
      jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
      jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
      jest.doMock('firebase/functions', () => ({
        getFunctions: jest.fn(() => ({})),
        connectFunctionsEmulator: jest.fn(),
      }));
      jest.doMock('../../config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test' },
        useEmulators: false,
        emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));
      const registry = new Map<string, any>();
      jest.doMock('../../core/ServiceRegistry', () => ({
        __esModule: true,
        default: {
          getInstance: jest.fn(() => ({
            get: (name: string) => { if (!registry.has(name)) throw new Error(`Service '${name}' not found`); return registry.get(name); },
            register: (name: string, svc: any) => registry.set(name, svc),
            has: (name: string) => registry.has(name),
          })),
        },
      }));
      const DS = require('../DocumentService').default;
      const svc = DS.getInstance();
      svc.setActiveGroup('g1');
      await expect(svc.createDocument('npcs', { name: 'Gandalf' })).rejects.toThrow(
        'Not authenticated'
      );
    });

    test('should call setDoc when creating with an explicit id', async () => {
      // 1st getDoc: collision-guard existence check -> not found
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      // 2nd getDoc: attribution getDoc for user profile
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { username: 'Bilbo', activeCharacterId: null, characters: [] })
      );
      mockSetDoc.mockResolvedValueOnce(undefined);

      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      const id = await svc.createDocument('npcs', { name: 'Gandalf' }, 'explicit-id');
      expect(id).toBe('explicit-id');
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    test('should throw when user profile not found during createDocument', async () => {
      // getDoc for user profile → not found
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await expect(svc.createDocument('npcs', { name: 'Gandalf' })).rejects.toThrow(
        'User profile not found'
      );
    });

    // ─── attribution content ────────────────────────────────────────────────

    test('should write full creation attribution onto the document, preserving caller data', async () => {
      // 1st getDoc: collision-guard existence check -> not found
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      // 2nd getDoc: attribution getDoc for user profile
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, {
          username: 'Bilbo',
          activeCharacterId: 'char-1',
          characters: [
            { id: 'char-1', name: 'Frodo' },
            { id: 'char-2', name: 'Sam' },
          ],
        })
      );
      mockSetDoc.mockResolvedValueOnce(undefined);

      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.createDocument('npcs', { name: 'Gandalf', race: 'Maia' }, 'explicit-id');

      const [, data] = mockSetDoc.mock.calls[0];

      // caller's own data fields survive
      expect(data.name).toBe('Gandalf');
      expect(data.race).toBe('Maia');

      // created* fields
      expect(data.createdBy).toBe('user-doc-test');
      expect(data.createdByUsername).toBe('Bilbo');
      expect(data.createdByCharacterId).toBe('char-1');
      expect(data.createdByCharacterName).toBe('Frodo');
      expectIso8601String(data.dateAdded);

      // creation also stamps modified* (creation and initial modification are
      // the same event)
      expect(data.modifiedBy).toBe('user-doc-test');
      expect(data.modifiedByUsername).toBe('Bilbo');
      expect(data.modifiedByCharacterId).toBe('char-1');
      expect(data.modifiedByCharacterName).toBe('Frodo');
      expectIso8601String(data.dateModified);
      expect(data.dateModified).toBe(data.dateAdded);
    });

    test('should null both character-name fields when the profile has no activeCharacterId', async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { username: 'Bilbo', characters: [] })
      );
      mockSetDoc.mockResolvedValueOnce(undefined);

      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.createDocument('npcs', { name: 'Gandalf' });

      const [, data] = mockSetDoc.mock.calls[0];
      expect(data.createdByCharacterId).toBeNull();
      expect(data.createdByCharacterName).toBeNull();
      expect(data.modifiedByCharacterId).toBeNull();
      expect(data.modifiedByCharacterName).toBeNull();
    });

    test('should keep the character id but null the character name when activeCharacterId matches no entry in characters[]', async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, {
          username: 'Bilbo',
          activeCharacterId: 'char-missing',
          characters: [{ id: 'char-1', name: 'Frodo' }],
        })
      );
      mockSetDoc.mockResolvedValueOnce(undefined);

      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.createDocument('npcs', { name: 'Gandalf' });

      const [, data] = mockSetDoc.mock.calls[0];
      expect(data.createdByCharacterId).toBe('char-missing');
      expect(data.createdByCharacterName).toBeNull();
      expect(data.modifiedByCharacterId).toBe('char-missing');
      expect(data.modifiedByCharacterName).toBeNull();
    });

    test('should default the username to an empty string when the profile has no username', async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { activeCharacterId: null, characters: [] })
      );
      mockSetDoc.mockResolvedValueOnce(undefined);

      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.createDocument('npcs', { name: 'Gandalf' });

      const [, data] = mockSetDoc.mock.calls[0];
      expect(data.createdByUsername).toBe('');
      expect(data.modifiedByUsername).toBe('');
    });
  });

  // ─── createDocument collision guard ─────────────────────────────────────────
  // setDoc is a full overwrite. When an explicit id is supplied and it already
  // names a document, createDocument must refuse rather than silently destroy
  // the existing document (the mechanism behind bugs #002/#004/#009/#012).

  describe('createDocument collision guard', () => {
    test('should create successfully when the explicit id is free', async () => {
      // 1st getDoc: existence check -> not found
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      // 2nd getDoc: attribution profile fetch
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { username: 'Bilbo', activeCharacterId: null, characters: [] })
      );
      mockSetDoc.mockResolvedValueOnce(undefined);

      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      const id = await svc.createDocument('npcs', { name: 'Gandalf' }, 'free-id');

      expect(id).toBe('free-id');
      expect(mockGetDoc).toHaveBeenCalledTimes(2);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    test('should throw a clear, actionable error naming the collection and id, and never call setDoc, when the explicit id is already taken', async () => {
      // Existence check finds a document already there. Since the guard
      // short-circuits before fetching attribution, only one getDoc call
      // should ever happen.
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { name: 'Existing NPC' }, 'taken-id')
      );

      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');

      let caughtError: Error | null = null;
      try {
        await svc.createDocument('npcs', { name: 'Gandalf' }, 'taken-id');
      } catch (e) {
        caughtError = e as Error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toContain('taken-id');
      expect(caughtError!.message).toContain('npcs');
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });

    test('should leave the auto-generated-id path unaffected: no existence check runs when id is omitted', async () => {
      // Only one getDoc call expected: the attribution profile fetch. If the
      // guard incorrectly ran for the auto-id path, this would be 2.
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { username: 'Bilbo', activeCharacterId: null, characters: [] })
      );
      mockSetDoc.mockResolvedValueOnce(undefined);

      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      const id = await svc.createDocument('npcs', { name: 'Gandalf' });

      expect(id).toBeDefined();
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });
  });

  // ─── updateDocumentWithAttribution ──────────────────────────────────────────

  describe('updateDocumentWithAttribution', () => {
    test('should call updateDoc after getting modification attribution', async () => {
      // Attribution getDoc
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { username: 'Frodo', activeCharacterId: null })
      );
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.updateDocumentWithAttribution('npcs', 'n1', { name: 'Frodo' });
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    test('should include modifiedBy in the update call', async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { username: 'Sam', activeCharacterId: null })
      );
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.updateDocumentWithAttribution('npcs', 'n1', { name: 'Sam' });
      const [, updateData] = mockUpdateDoc.mock.calls[0];
      expect(updateData).toHaveProperty('modifiedBy', 'user-doc-test');
    });

    // ─── attribution content ────────────────────────────────────────────────

    test('should write the full modification attribution, preserving caller data, and never write created* fields', async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, {
          username: 'Sam',
          activeCharacterId: 'char-2',
          characters: [
            { id: 'char-1', name: 'Frodo' },
            { id: 'char-2', name: 'Samwise' },
          ],
        })
      );
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      await svc.updateDocumentWithAttribution('npcs', 'n1', {
        name: 'Samwise Gamgee',
        race: 'Hobbit',
      });

      const [, data] = mockUpdateDoc.mock.calls[0];

      // caller's own data fields survive
      expect(data.name).toBe('Samwise Gamgee');
      expect(data.race).toBe('Hobbit');

      // full modified* set
      expect(data.modifiedBy).toBe('user-doc-test');
      expect(data.modifiedByUsername).toBe('Sam');
      expect(data.modifiedByCharacterId).toBe('char-2');
      expect(data.modifiedByCharacterName).toBe('Samwise');
      expectIso8601String(data.dateModified);

      // updates must never overwrite creation attribution (bug #1203)
      expect(data).not.toHaveProperty('createdBy');
      expect(data).not.toHaveProperty('createdByUsername');
      expect(data).not.toHaveProperty('createdByCharacterId');
      expect(data).not.toHaveProperty('createdByCharacterName');
      expect(data).not.toHaveProperty('dateAdded');
    });
  });

  // ─── collection path construction ───────────────────────────────────────────

  describe('collection path construction', () => {
    test('should use full path directly when collection name contains "/"', async () => {
      mockGetDocs.mockResolvedValueOnce(makeQuerySnapshot([]));
      const svc = DocumentService.getInstance();
      // Full path — should not require group context
      await svc.getCollection('groups/g1/campaigns');
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        'groups/g1/campaigns'
      );
    });

    test('should include campaignId in path when activeCampaignId is set', async () => {
      mockGetDocs.mockResolvedValueOnce(makeQuerySnapshot([]));
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      svc.setActiveCampaign('c1');
      await svc.getCollection('npcs');
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        'groups', 'g1', 'campaigns', 'c1', 'npcs'
      );
    });

    test('should use group-level path when no activeCampaignId', async () => {
      mockGetDocs.mockResolvedValueOnce(makeQuerySnapshot([]));
      const svc = DocumentService.getInstance();
      svc.setActiveGroup('g1');
      svc.setActiveCampaign(null);
      await svc.getCollection('npcs');
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        'groups', 'g1', 'npcs'
      );
    });
  });
});

export {};
