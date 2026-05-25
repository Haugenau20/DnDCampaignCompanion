// src/services/firebase/data/__tests__/DocumentService.test.ts

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
      // Attribution getDoc for user profile
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
