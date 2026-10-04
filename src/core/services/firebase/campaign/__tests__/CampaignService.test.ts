// src/core/services/firebase/campaign/__tests__/CampaignService.test.ts

/**
 * Tests for CampaignService
 *
 * All Firebase SDK calls are mocked.  UserService is also mocked.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

import { createFakeFirestore, readBarrier } from '@/test-utils/fake-firestore-transactions';

// The transactional store behind `runTransaction`; fresh for every test.
let mockFirestoreStore = createFakeFirestore();

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockGetCountFromServer = jest.fn();
const mockHttpsCallable = jest.fn();
const mockCollection = jest.fn((_db: any, ...segs: string[]) => ({ path: segs.join('/') }));
const mockDoc = jest.fn((_db_or_ref: any, ...segs: string[]) => ({
  path: segs.join('/'),
  id: segs[segs.length - 1] || 'gen-id',
}));

const mockGetGroupUserProfile = jest.fn();
const mockUpdateGroupUserProfile = jest.fn();
const mockUserServiceInstance = {
  getGroupUserProfile: mockGetGroupUserProfile,
  updateGroupUserProfile: mockUpdateGroupUserProfile,
};

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
  collection: function() { return (mockCollection as Function).apply(null, arguments); },
  doc: function() { return (mockDoc as Function).apply(null, arguments); },
  getDoc: function() { return (mockGetDoc as Function).apply(null, arguments); },
  getDocs: function() { return (mockGetDocs as Function).apply(null, arguments); },
  setDoc: function() { return (mockSetDoc as Function).apply(null, arguments); },
  updateDoc: function() { return (mockUpdateDoc as Function).apply(null, arguments); },
  getCountFromServer: function() { return (mockGetCountFromServer as Function).apply(null, arguments); },
  runTransaction: function() { return (mockFirestoreStore.runTransaction as Function).apply(null, arguments); },
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: { uid: 'campaign-user' } })),
  connectAuthEmulator: jest.fn(),
}));
jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  connectFunctionsEmulator: jest.fn(),
  httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
}));

jest.mock('../../config/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test' },
  useEmulators: false,
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
}));

jest.mock('../../core/ServiceRegistry', () => {
  const registry = new Map<string, any>([['userService', mockUserServiceInstance]]);
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => ({
        get: (name: string) => {
          if (!registry.has(name)) throw new Error(`Service '${name}' not found`);
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

describe('CampaignService', () => {
  let CampaignService: typeof import('../CampaignService').default;

  beforeEach(() => {
    jest.resetModules();

    const registry = new Map<string, any>([['userService', mockUserServiceInstance]]);
    jest.doMock('../../core/ServiceRegistry', () => ({
      __esModule: true,
      default: {
        getInstance: jest.fn(() => ({
          get: (name: string) => {
            if (!registry.has(name)) throw new Error(`Service '${name}' not found`);
            return registry.get(name);
          },
          register: (name: string, svc: any) => registry.set(name, svc),
          has: (name: string) => registry.has(name),
        })),
      },
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
      getCountFromServer: function() { return (mockGetCountFromServer as Function).apply(null, arguments); },
      runTransaction: function() { return (mockFirestoreStore.runTransaction as Function).apply(null, arguments); },
    }));
    jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
    jest.doMock('firebase/auth', () => ({
      getAuth: jest.fn(() => ({ currentUser: { uid: 'campaign-user' } })),
      connectAuthEmulator: jest.fn(),
    }));
    jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
    jest.doMock('firebase/functions', () => ({
      getFunctions: jest.fn(() => ({})),
      connectFunctionsEmulator: jest.fn(),
      httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
    }));
    jest.doMock('../../config/firebaseConfig', () => ({
      firebaseConfig: { apiKey: 'test', projectId: 'test' },
      useEmulators: false,
      emulatorHost: 'localhost',
      emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
    }));

    [mockGetDoc, mockGetDocs, mockSetDoc, mockUpdateDoc, mockGetCountFromServer, mockHttpsCallable,
     mockGetGroupUserProfile, mockUpdateGroupUserProfile].forEach(m => m.mockReset());
    mockFirestoreStore = createFakeFirestore();

    CampaignService = require('../CampaignService').default;
  });

  // ─── getInstance ────────────────────────────────────────────────────────────

  describe('getInstance', () => {
    test('should return a CampaignService instance', () => {
      expect(CampaignService.getInstance()).toBeDefined();
    });

    test('should be a singleton', () => {
      expect(CampaignService.getInstance()).toBe(CampaignService.getInstance());
    });
  });

  // ─── createCampaign ─────────────────────────────────────────────────────────

  describe('createCampaign', () => {
    test('should throw when user is not authenticated', async () => {
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
      }));
      jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
      jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
      jest.doMock('firebase/functions', () => ({
        getFunctions: jest.fn(() => ({})),
        connectFunctionsEmulator: jest.fn(),
        httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
      }));
      jest.doMock('../../config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test' },
        useEmulators: false, emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));
      const reg = new Map<string, any>([['userService', mockUserServiceInstance]]);
      jest.doMock('../../core/ServiceRegistry', () => ({
        __esModule: true,
        default: { getInstance: jest.fn(() => ({
          get: (n: string) => { if (!reg.has(n)) throw new Error(`Service '${n}' not found`); return reg.get(n); },
          register: (n: string, s: any) => reg.set(n, s),
          has: (n: string) => reg.has(n),
        })) },
      }));
      const CS = require('../CampaignService').default;
      await expect(CS.getInstance().createCampaign('g1', 'My Campaign')).rejects.toThrow(
        'Not authenticated'
      );
    });

    test('should throw when user is not a member of the group', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce(null);
      const svc = CampaignService.getInstance();
      await expect(svc.createCampaign('g1', 'My Campaign')).rejects.toThrow(
        'You are not a member of this group'
      );
    });

    test('should return campaign ID when creation succeeds (no duplicate)', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'member' });
      mockUpdateGroupUserProfile.mockResolvedValueOnce(undefined);

      const svc = CampaignService.getInstance();
      const id = await svc.createCampaign('g1', 'My Campaign');
      expect(id).toBe('my-campaign');
      expect(mockFirestoreStore.read('groups/g1/campaigns/my-campaign')).toMatchObject({
        name: 'My Campaign',
        createdBy: 'campaign-user',
      });
    });

    test('should append timestamp to campaign ID when a duplicate exists, leaving the existing campaign alone', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
      try {
        mockFirestoreStore.seed('groups/g1/campaigns/my-campaign', { name: 'My Campaign', createdBy: 'someone' });
        mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'member' });
        mockUpdateGroupUserProfile.mockResolvedValueOnce(undefined);

        const svc = CampaignService.getInstance();
        const id = await svc.createCampaign('g1', 'My Campaign');
        expect(id).toBe(`my-campaign-${Date.now()}`);
        expect(mockFirestoreStore.read('groups/g1/campaigns/my-campaign')).toMatchObject({ createdBy: 'someone' });
        expect(mockFirestoreStore.read(`groups/g1/campaigns/${id}`)).toMatchObject({ createdBy: 'campaign-user' });
      } finally {
        jest.useRealTimers();
      }
    });

    test('should set the active campaign after creation', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'member' });
      mockUpdateGroupUserProfile.mockResolvedValueOnce(undefined);

      const svc = CampaignService.getInstance();
      const id = await svc.createCampaign('g1', 'Campaign Name');
      expect(svc.getActiveCampaignId()).toBe(id);
    });

    test('should generate slug-format campaign IDs from name', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'member' });
      mockUpdateGroupUserProfile.mockResolvedValueOnce(undefined);

      const svc = CampaignService.getInstance();
      const id = await svc.createCampaign('g1', 'The Dark Rising!');
      expect(id).toBe('the-dark-rising');
    });

    test('gives up, writing nothing, when every candidate id is taken', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
      try {
        // With the clock frozen, every timestamped candidate is the same id.
        mockFirestoreStore.seed('groups/g1/campaigns/my-campaign', { createdBy: 'someone' });
        mockFirestoreStore.seed(`groups/g1/campaigns/my-campaign-${Date.now()}`, { createdBy: 'someone' });
        mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'member' });

        const svc = CampaignService.getInstance();
        await expect(svc.createCampaign('g1', 'My Campaign')).rejects.toThrow(/free name/);
        expect(mockFirestoreStore.paths()).toHaveLength(2);
        expect(mockUpdateGroupUserProfile).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    // T081 (DATA-001). Two admins create a campaign of the same name at once,
    // both reading the slug before either writes. As a read then a write, both
    // took the slug and the second replaced the first campaign's metadata.
    test('two simultaneous creates of one name make two campaigns', async () => {
      const slugPath = 'groups/g1/campaigns/my-campaign';
      mockFirestoreStore = createFakeFirestore({ afterRead: readBarrier(2, slugPath) });
      mockGetDoc.mockImplementation((ref: any) => mockFirestoreStore.getDoc(ref));
      mockSetDoc.mockImplementation((ref: any, data: any) => mockFirestoreStore.setDoc(ref, data));
      mockGetGroupUserProfile.mockResolvedValue({ userId: 'campaign-user', role: 'admin' });
      mockUpdateGroupUserProfile.mockResolvedValue(undefined);

      const svc = CampaignService.getInstance();
      const ids = await Promise.all([
        svc.createCampaign('g1', 'My Campaign', 'first'),
        svc.createCampaign('g1', 'My Campaign', 'second'),
      ]);

      expect(new Set(ids).size).toBe(2);
      const descriptions = ids
        .map((id) => mockFirestoreStore.read(`groups/g1/campaigns/${id}`)!.description)
        .sort();
      expect(descriptions).toEqual(['first', 'second']);
    });
  });

  // ─── getCampaigns ───────────────────────────────────────────────────────────

  describe('getCampaigns', () => {
    test('should return empty array when user is not authenticated', async () => {
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
      }));
      jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
      jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
      jest.doMock('firebase/functions', () => ({
        getFunctions: jest.fn(() => ({})),
        connectFunctionsEmulator: jest.fn(),
        httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
      }));
      jest.doMock('../../config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test' },
        useEmulators: false, emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));
      const reg = new Map<string, any>([['userService', mockUserServiceInstance]]);
      jest.doMock('../../core/ServiceRegistry', () => ({
        __esModule: true,
        default: { getInstance: jest.fn(() => ({
          get: (n: string) => { if (!reg.has(n)) throw new Error(`Service '${n}' not found`); return reg.get(n); },
          register: (n: string, s: any) => reg.set(n, s),
          has: (n: string) => reg.has(n),
        })) },
      }));
      const CS = require('../CampaignService').default;
      const result = await CS.getInstance().getCampaigns('g1');
      expect(result).toEqual([]);
    });

    test('should return empty array when user is not a group member', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce(null);
      const svc = CampaignService.getInstance();
      const result = await svc.getCampaigns('g1');
      expect(result).toEqual([]);
    });

    test('should return campaigns list when user is a member', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'member' });
      mockGetDocs.mockResolvedValueOnce(
        makeQuerySnapshot([
          makeDocSnapshot(true, { name: 'Campaign 1', isActive: true }, 'c1'),
          makeDocSnapshot(true, { name: 'Campaign 2', isActive: false }, 'c2'),
        ])
      );
      const svc = CampaignService.getInstance();
      const campaigns = await svc.getCampaigns('g1');
      expect(campaigns).toHaveLength(2);
      expect(campaigns[0].id).toBe('c1');
      expect(campaigns[0].groupId).toBe('g1');
    });

    test('should return empty array when Firestore throws', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'member' });
      mockGetDocs.mockRejectedValueOnce(new Error('network error'));
      const svc = CampaignService.getInstance();
      const result = await svc.getCampaigns('g1');
      expect(result).toEqual([]);
    });

    // PERF-02: the membership check used to finish before the list was even
    // requested -- a whole extra round trip on every sign-in and reload.
    test('requests the campaign list without waiting for the membership check', async () => {
      let confirmMembership!: (profile: unknown) => void;
      mockGetGroupUserProfile.mockReturnValueOnce(
        new Promise(resolve => { confirmMembership = resolve; })
      );
      mockGetDocs.mockResolvedValueOnce(
        makeQuerySnapshot([makeDocSnapshot(true, { name: 'Campaign 1' }, 'c1')])
      );

      const result = CampaignService.getInstance().getCampaigns('g1');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockGetDocs).toHaveBeenCalledTimes(1);
      confirmMembership({ userId: 'campaign-user', role: 'member' });
      expect((await result).map((c: any) => c.id)).toEqual(['c1']);
    });

    test('returns nothing to a non-member even though the list was already requested', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce(null);
      mockGetDocs.mockResolvedValueOnce(
        makeQuerySnapshot([makeDocSnapshot(true, { name: 'Secret' }, 'c1')])
      );

      await expect(CampaignService.getInstance().getCampaigns('g1')).resolves.toEqual([]);
    });

    test("a non-member's refused list neither rejects nor goes unhandled", async () => {
      const unhandled = jest.fn();
      process.on('unhandledRejection', unhandled);
      try {
        mockGetGroupUserProfile.mockResolvedValueOnce(null);
        mockGetDocs.mockRejectedValueOnce(new Error('permission-denied'));

        await expect(CampaignService.getInstance().getCampaigns('g1')).resolves.toEqual([]);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(unhandled).not.toHaveBeenCalled();
      } finally {
        process.off('unhandledRejection', unhandled);
      }
    });
  });

  // ─── updateCampaign ─────────────────────────────────────────────────────────

  describe('updateCampaign', () => {
    test('should throw when user is not a member', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce(null);
      const svc = CampaignService.getInstance();
      await expect(svc.updateCampaign('g1', 'c1', { name: 'New Name' })).rejects.toThrow(
        'You are not a member of this group'
      );
    });

    test('should call updateDoc with the provided fields plus metadata', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'admin' });
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      const svc = CampaignService.getInstance();
      await svc.updateCampaign('g1', 'c1', { name: 'Updated Campaign' });
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const [, updateData] = mockUpdateDoc.mock.calls[0];
      expect(updateData.name).toBe('Updated Campaign');
      expect(updateData.modifiedBy).toBe('campaign-user');
      expect(updateData.dateModified).toBeDefined();
    });

    test('should throw when updateDoc fails', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'admin' });
      mockUpdateDoc.mockRejectedValueOnce(new Error('update failed'));
      const svc = CampaignService.getInstance();
      await expect(svc.updateCampaign('g1', 'c1', { name: 'x' })).rejects.toThrow('update failed');
    });
  });

  // ─── deleteCampaign ─────────────────────────────────────────────────────────

  describe('deleteCampaign', () => {
    test('should throw when user is not authenticated', async () => {
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
      }));
      jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
      jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
      jest.doMock('firebase/functions', () => ({
        getFunctions: jest.fn(() => ({})),
        connectFunctionsEmulator: jest.fn(),
        httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
      }));
      jest.doMock('../../config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test' },
        useEmulators: false, emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));
      const reg = new Map<string, any>([['userService', mockUserServiceInstance]]);
      jest.doMock('../../core/ServiceRegistry', () => ({
        __esModule: true,
        default: { getInstance: jest.fn(() => ({
          get: (n: string) => { if (!reg.has(n)) throw new Error(`Service '${n}' not found`); return reg.get(n); },
          register: (n: string, s: any) => reg.set(n, s),
          has: (n: string) => reg.has(n),
        })) },
      }));
      const CS = require('../CampaignService').default;
      await expect(CS.getInstance().deleteCampaign('g1', 'c1')).rejects.toThrow(
        'Not authenticated'
      );
    });

    test('should call the Cloud Function httpsCallable with groupId and campaignId', async () => {
      const mockCallable = jest.fn().mockResolvedValueOnce({ data: { success: true } });
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      const svc = CampaignService.getInstance();
      await svc.deleteCampaign('g1', 'c1');

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'deleteCampaign');
      expect(mockCallable).toHaveBeenCalledWith({ groupId: 'g1', campaignId: 'c1' });
    });

    test('should throw when the cloud function throws', async () => {
      const mockCallable = jest.fn().mockRejectedValueOnce(new Error('permission-denied'));
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      const svc = CampaignService.getInstance();
      await expect(svc.deleteCampaign('g1', 'c1')).rejects.toThrow('permission-denied');
    });
  });

  // ─── getCampaignCounts ──────────────────────────────────────────────────────

  describe('getCampaignCounts', () => {
    /** Shape getCountFromServer returns: snapshot.data().count */
    const countSnapshot = (count: number) => ({ data: () => ({ count }) });

    beforeEach(() => {
      mockGetGroupUserProfile.mockResolvedValue({ userId: 'campaign-user' });
    });

    test('counts chapters and NPCs for the named campaign', async () => {
      mockGetCountFromServer
        .mockResolvedValueOnce(countSnapshot(39))
        .mockResolvedValueOnce(countSnapshot(16));

      const svc = CampaignService.getInstance();
      const counts = await svc.getCampaignCounts('g1', 'c1');

      expect(counts).toEqual({ chapters: 39, npcs: 16 });
    });

    test('counts under the named campaign, not the active one', async () => {
      mockGetCountFromServer.mockResolvedValue(countSnapshot(0));

      const svc = CampaignService.getInstance();
      await svc.getCampaignCounts('g1', 'c1');

      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(), 'groups', 'g1', 'campaigns', 'c1', 'chapters'
      );
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(), 'groups', 'g1', 'campaigns', 'c1', 'npcs'
      );
    });

    test('refuses when the caller is not a member of the group', async () => {
      mockGetGroupUserProfile.mockResolvedValue(null);

      const svc = CampaignService.getInstance();
      await expect(svc.getCampaignCounts('g1', 'c1')).rejects.toThrow(
        'You are not a member of this group'
      );
      expect(mockGetCountFromServer).not.toHaveBeenCalled();
    });

    test('rejects when an aggregation fails', async () => {
      mockGetCountFromServer.mockRejectedValue(new Error('permission-denied'));

      // The caller decides what a missing count means. For the switcher it
      // means the row shows its name and no second line -- never an error.
      const svc = CampaignService.getInstance();
      await expect(svc.getCampaignCounts('g1', 'c1')).rejects.toThrow(
        'permission-denied'
      );
    });
  });
});

export {};
