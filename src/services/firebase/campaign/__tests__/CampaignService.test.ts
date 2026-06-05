// src/services/firebase/campaign/__tests__/CampaignService.test.ts

/**
 * Tests for CampaignService
 *
 * All Firebase SDK calls are mocked.  UserService is also mocked.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
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
    }));
    jest.doMock('../../config/firebaseConfig', () => ({
      firebaseConfig: { apiKey: 'test', projectId: 'test' },
      useEmulators: false,
      emulatorHost: 'localhost',
      emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
    }));

    [mockGetDoc, mockGetDocs, mockSetDoc, mockUpdateDoc,
     mockGetGroupUserProfile, mockUpdateGroupUserProfile].forEach(m => m.mockReset());

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
      // uniqueness check → not exists
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      mockSetDoc.mockResolvedValueOnce(undefined);
      mockUpdateGroupUserProfile.mockResolvedValueOnce(undefined);

      const svc = CampaignService.getInstance();
      const id = await svc.createCampaign('g1', 'My Campaign');
      expect(typeof id).toBe('string');
      expect(id).toBe('my-campaign');
    });

    test('should append timestamp to campaign ID when a duplicate exists', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));

      mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'member' });
      // uniqueness check → exists (duplicate!)
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { name: 'My Campaign' }));
      mockSetDoc.mockResolvedValueOnce(undefined);
      mockUpdateGroupUserProfile.mockResolvedValueOnce(undefined);

      const svc = CampaignService.getInstance();
      const id = await svc.createCampaign('g1', 'My Campaign');
      expect(id).toContain('my-campaign-');
      expect(id).toContain(`${Date.now()}`);

      jest.useRealTimers();
    });

    test('should set the active campaign after creation', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'member' });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      mockSetDoc.mockResolvedValueOnce(undefined);
      mockUpdateGroupUserProfile.mockResolvedValueOnce(undefined);

      const svc = CampaignService.getInstance();
      await svc.createCampaign('g1', 'Campaign Name');
      expect(svc.getActiveCampaignId()).not.toBeNull();
    });

    test('should generate slug-format campaign IDs from name', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce({ userId: 'campaign-user', role: 'member' });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      mockSetDoc.mockResolvedValueOnce(undefined);
      mockUpdateGroupUserProfile.mockResolvedValueOnce(undefined);

      const svc = CampaignService.getInstance();
      const id = await svc.createCampaign('g1', 'The Dark Rising!');
      expect(id).toBe('the-dark-rising');
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
});

export {};
