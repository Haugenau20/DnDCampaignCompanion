// src/services/firebase/group/__tests__/GroupService.test.ts

/**
 * Tests for GroupService
 *
 * All Firebase SDK calls are mocked.  UserService is also mocked
 * because GroupService depends on it via ServiceRegistry.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockRunTransaction = jest.fn();
const mockHttpsCallable = jest.fn();
const mockCollection = jest.fn((_db: any, ...segs: string[]) => ({ path: segs.join('/') }));
const mockDoc = jest.fn((_db_or_ref: any, ...segs: string[]) => ({
  path: segs.join('/'),
  id: segs[segs.length - 1] || 'generated-id',
}));

const mockIsUsernameAvailableInGroup = jest.fn();
const mockUserServiceInstance = {
  isUsernameAvailableInGroup: mockIsUsernameAvailableInGroup,
  getGroupUserProfile: jest.fn(),
};

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
  collection: function() { return (mockCollection as Function).apply(null, arguments); },
  doc: function() { return (mockDoc as Function).apply(null, arguments); },
  getDoc: function() { return (mockGetDoc as Function).apply(null, arguments); },
  getDocs: function() { return (mockGetDocs as Function).apply(null, arguments); },
  runTransaction: function() { return (mockRunTransaction as Function).apply(null, arguments); },
  query: jest.fn(),
  where: jest.fn(),
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: { uid: 'current-user', email: 'u@test.com' } })),
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
  const registry = new Map<string, any>();
  registry.set('userService', mockUserServiceInstance);
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

const AUTH_UID = 'current-user';

function makeDocSnapshot(exists: boolean, data: Record<string, any> = {}, id = 'doc-id') {
  return { exists: () => exists, data: () => data, id };
}

function makeQuerySnapshot(docs: ReturnType<typeof makeDocSnapshot>[]) {
  return { docs };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('GroupService', () => {
  let GroupService: typeof import('../GroupService').default;

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
      runTransaction: function() { return (mockRunTransaction as Function).apply(null, arguments); },
      query: jest.fn(),
      where: jest.fn(),
    }));
    jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
    jest.doMock('firebase/auth', () => ({
      getAuth: jest.fn(() => ({ currentUser: { uid: AUTH_UID, email: 'u@test.com' } })),
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

    [mockGetDoc, mockGetDocs, mockRunTransaction, mockIsUsernameAvailableInGroup,
     mockHttpsCallable].forEach(m => m.mockReset());
    (mockUserServiceInstance.getGroupUserProfile as jest.Mock).mockReset();

    GroupService = require('../GroupService').default;
  });

  // ─── getInstance ────────────────────────────────────────────────────────────

  describe('getInstance', () => {
    test('should return a GroupService instance', () => {
      expect(GroupService.getInstance()).toBeDefined();
    });

    test('should be a singleton', () => {
      expect(GroupService.getInstance()).toBe(GroupService.getInstance());
    });
  });

  // ─── createGroup ────────────────────────────────────────────────────────────

  describe('createGroup', () => {
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
        runTransaction: function() { return (mockRunTransaction as Function).apply(null, arguments); },
        query: jest.fn(),
        where: jest.fn(),
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
        useEmulators: false,
        emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));
      const reg = new Map<string, any>([['userService', mockUserServiceInstance]]);
      jest.doMock('../../core/ServiceRegistry', () => ({
        __esModule: true,
        default: {
          getInstance: jest.fn(() => ({
            get: (name: string) => { if (!reg.has(name)) throw new Error(`Service '${name}' not found`); return reg.get(name); },
            register: (name: string, svc: any) => reg.set(name, svc),
            has: (name: string) => reg.has(name),
          })),
        },
      }));
      const GS = require('../GroupService').default;
      await expect(GS.getInstance().createGroup('My Group')).rejects.toThrow('Not authenticated');
    });

    test('should call runTransaction and return a group ID', async () => {
      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: (tx: any) => any) => {
        const tx = {
          set: jest.fn(),
          update: jest.fn(),
          get: jest.fn().mockResolvedValue(
            makeDocSnapshot(true, { username: 'TestAdmin', groups: [] })
          ),
        };
        await cb(tx);
      });

      const svc = GroupService.getInstance();
      const groupId = await svc.createGroup('My Group', 'A test group');
      expect(typeof groupId).toBe('string');
      expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    });

    test('should set the active group after creation', async () => {
      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: (tx: any) => any) => {
        const tx = {
          set: jest.fn(),
          update: jest.fn(),
          get: jest.fn().mockResolvedValue(
            makeDocSnapshot(true, { username: 'Admin', groups: [] })
          ),
        };
        await cb(tx);
      });

      const svc = GroupService.getInstance();
      await svc.createGroup('My Group');
      expect(svc.getActiveGroupId()).not.toBeNull();
    });
  });

  // ─── getGroups ──────────────────────────────────────────────────────────────

  describe('getGroups', () => {
    test('should return empty array when user is not authenticated', async () => {
      // Simulate no currentUser by having mockGetDoc fail early
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
        runTransaction: function() { return (mockRunTransaction as Function).apply(null, arguments); },
        query: jest.fn(), where: jest.fn(),
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
      const GS = require('../GroupService').default;
      const groups = await GS.getInstance().getGroups();
      expect(groups).toEqual([]);
    });

    test('should return empty array when user document does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      const svc = GroupService.getInstance();
      const groups = await svc.getGroups();
      expect(groups).toEqual([]);
    });

    test('should return groups for the user', async () => {
      // First getDoc: user profile
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { groups: ['g1', 'g2'] })
      );
      // Second getDoc: group g1
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { name: 'Group 1' }, 'g1'));
      // Third getDoc: group g2
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { name: 'Group 2' }, 'g2'));

      const svc = GroupService.getInstance();
      const groups = await svc.getGroups();
      expect(groups).toHaveLength(2);
      expect(groups[0].id).toBe('g1');
    });

    test('should skip groups whose document does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { groups: ['g1', 'g-missing'] }));
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { name: 'Group 1' }, 'g1'));
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false)); // g-missing not found

      const svc = GroupService.getInstance();
      const groups = await svc.getGroups();
      expect(groups).toHaveLength(1);
    });
  });

  // ─── getGroupUsers ──────────────────────────────────────────────────────────

  describe('getGroupUsers', () => {
    test('should throw when user is not a member', async () => {
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false)); // user not in group
      const svc = GroupService.getInstance();
      await expect(svc.getGroupUsers('g1')).rejects.toThrow('You are not a member of this group');
    });

    test('should return users list when user is a member', async () => {
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { role: 'admin' })); // membership
      mockGetDocs.mockResolvedValueOnce(
        makeQuerySnapshot([
          makeDocSnapshot(true, { username: 'Admin', role: 'admin', joinedAt: null }, 'uid-1'),
        ])
      );
      const svc = GroupService.getInstance();
      const users = await svc.getGroupUsers('g1');
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('Admin');
    });
  });

  // ─── removeUserFromGroup ────────────────────────────────────────────────────

  describe('removeUserFromGroup', () => {
    test('should call the Cloud Function httpsCallable', async () => {
      const mockCallable = jest.fn().mockResolvedValueOnce({ data: 'ok' });
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      const svc = GroupService.getInstance();
      await svc.removeUserFromGroup('g1', 'uid-to-remove');
      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'removeUserFromGroup');
      expect(mockCallable).toHaveBeenCalledWith({ groupId: 'g1', userId: 'uid-to-remove' });
    });

    test('should throw when the cloud function throws', async () => {
      const mockCallable = jest.fn().mockRejectedValueOnce(new Error('function error'));
      mockHttpsCallable.mockReturnValueOnce(mockCallable);
      const svc = GroupService.getInstance();
      await expect(svc.removeUserFromGroup('g1', 'uid-x')).rejects.toThrow('function error');
    });
  });

  // ─── joinGroup ──────────────────────────────────────────────────────────────

  describe('joinGroup', () => {
    test('should throw when user is already a member of the group', async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { groups: ['g1'] }) // user already in g1
      );
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(true);

      const svc = GroupService.getInstance();
      await expect(svc.joinGroup('g1', 'NewUser')).rejects.toThrow(
        'You are already a member of this group'
      );
    });

    test('should throw when username is not available', async () => {
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { groups: ['g2'] }));
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(false); // taken

      const svc = GroupService.getInstance();
      await expect(svc.joinGroup('g1', 'TakenName')).rejects.toThrow(
        'Username is already taken in this group'
      );
    });

    test('should run a transaction when joining succeeds', async () => {
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { groups: ['g2'] }));
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(true);
      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: (tx: any) => any) => {
        const tx = {
          set: jest.fn(),
          update: jest.fn(),
          get: jest.fn().mockResolvedValue(
            makeDocSnapshot(true, { groups: ['g2'] })
          ),
        };
        await cb(tx);
      });

      const svc = GroupService.getInstance();
      await svc.joinGroup('g1', 'NewUser');
      expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    });

    test('should set the active group after joining', async () => {
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { groups: [] }));
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(true);
      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: (tx: any) => any) => {
        const tx = {
          set: jest.fn(),
          update: jest.fn(),
          get: jest.fn().mockResolvedValue(makeDocSnapshot(true, { groups: [] })),
        };
        await cb(tx);
      });

      const svc = GroupService.getInstance();
      await svc.joinGroup('group-joined', 'NewUser');
      expect(svc.getActiveGroupId()).toBe('group-joined');
    });
  });
});
