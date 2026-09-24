// src/core/services/firebase/group/__tests__/GroupService.test.ts

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
const mockUpdateDoc = jest.fn();
const mockHttpsCallable = jest.fn();

// Distinguishes BaseFirebaseService's regioned getFunctions(app, 'europe-west1')
// call (made once, at construction) from a bare getFunctions() call made from
// inside a method -- the defect this suite guards against.
const REGIONED_FUNCTIONS_INSTANCE = { __label: 'regioned-functions' };
const mockGetFunctions = jest.fn((...args: any[]) =>
  args[1] === 'europe-west1' ? REGIONED_FUNCTIONS_INSTANCE : { __label: 'bare-functions' }
);
const mockCollection = jest.fn((_db: any, ...segs: string[]) => ({ path: segs.join('/') }));
const mockDoc = jest.fn((_db_or_ref: any, ...segs: string[]) => ({
  path: segs.join('/'),
  id: segs[segs.length - 1] || 'generated-id',
}));

const mockIsUsernameAvailableInGroup = jest.fn();
const mockIsUserAdmin = jest.fn();
const mockUserServiceInstance = {
  isUsernameAvailableInGroup: mockIsUsernameAvailableInGroup,
  isUserAdmin: mockIsUserAdmin,
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
  updateDoc: function() { return (mockUpdateDoc as Function).apply(null, arguments); },
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
  getFunctions: function() { return (mockGetFunctions as Function).apply(null, arguments); },
  connectFunctionsEmulator: jest.fn(),
  httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
}));

jest.mock('@/core/services/firebase/config/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test' },
  useEmulators: false,
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
}));

jest.mock('@/core/services/firebase/core/ServiceRegistry', () => {
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
    jest.doMock('@/core/services/firebase/core/ServiceRegistry', () => ({
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
      updateDoc: function() { return (mockUpdateDoc as Function).apply(null, arguments); },
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
      getFunctions: function() { return (mockGetFunctions as Function).apply(null, arguments); },
      connectFunctionsEmulator: jest.fn(),
      httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
    }));
    jest.doMock('@/core/services/firebase/config/firebaseConfig', () => ({
      firebaseConfig: { apiKey: 'test', projectId: 'test' },
      useEmulators: false,
      emulatorHost: 'localhost',
      emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
    }));

    [mockGetDoc, mockGetDocs, mockRunTransaction, mockIsUsernameAvailableInGroup,
     mockHttpsCallable, mockUpdateDoc, mockIsUserAdmin].forEach(m => m.mockReset());
    mockGetFunctions.mockClear();
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
      jest.doMock('@/core/services/firebase/config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test' },
        useEmulators: false,
        emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));
      const reg = new Map<string, any>([['userService', mockUserServiceInstance]]);
      jest.doMock('@/core/services/firebase/core/ServiceRegistry', () => ({
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

    // These two tests were written against the client-side `runTransaction`
    // implementation and were retargeted -- not deleted -- when group creation
    // moved into the `createGroup` Cloud Function for bug #1409. Edited under the
    // repository owner's explicit authorisation (2026-07-30).
    //
    // Why each changed, recorded because "a test was updated to pass" is exactly
    // the shape this project treats as suspicious:
    //
    //  - The first asserted `mockRunTransaction).toHaveBeenCalledTimes(1)`. That
    //    is a MECHANISM assertion on a helper deliberately removed from the path,
    //    and its old name ("should call runTransaction") encoded the mechanism
    //    too. Retargeted to the mechanism that replaced it; the behavioural half
    //    of the test -- that an id comes back -- is unchanged.
    //  - The second asserted `getActiveGroupId()).not.toBeNull()`, which is still
    //    correct and is left BYTE-IDENTICAL. Only its arrangement was stale: it
    //    mocked `runTransaction` rather than the callable. That is a fixture
    //    repair, not a specification change.
    //
    // Neither assertion was weakened to accommodate the new code.

    test('should call the createGroup Cloud Function and return a group ID', async () => {
      const mockCallable = jest.fn().mockResolvedValueOnce({
        data: { success: true, groupId: 'my-group-id' },
      });
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      const svc = GroupService.getInstance();
      const groupId = await svc.createGroup('My Group', 'A test group');
      expect(typeof groupId).toBe('string');
      expect(mockCallable).toHaveBeenCalledTimes(1);
    });

    test('should set the active group after creation', async () => {
      const mockCallable = jest.fn().mockResolvedValueOnce({
        data: { success: true, groupId: 'my-group-id' },
      });
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      const svc = GroupService.getInstance();
      await svc.createGroup('My Group');
      expect(svc.getActiveGroupId()).not.toBeNull();
    });

    // Bug #1409: group-profile creation moved server-side (the `createGroup`
    // Cloud Function) so production Firestore rules can deny clients that
    // write to `groups/{groupId}/users/{userId}` on create entirely -- a
    // member could otherwise delete their own group profile (permitted, as
    // "leave group") and recreate it with an escalated role. These tests
    // cover the callable-based contract; see docs/testing/bug-tracking/
    // 1409-member-can-escalate-to-group-admin.md.

    test("uses the service's regioned Functions instance, not a fresh getFunctions()", async () => {
      // A bare getFunctions() resolves us-central1, where nothing is
      // deployed -- which is how group creation could fail in production
      // while every other callable worked.
      const svc = GroupService.getInstance();
      mockGetFunctions.mockClear();
      mockHttpsCallable.mockReturnValueOnce(
        jest.fn().mockResolvedValueOnce({ data: { success: true, groupId: 'new-group-id' } })
      );

      await svc.createGroup('My Group');

      expect(mockGetFunctions).not.toHaveBeenCalled();
      expect(mockHttpsCallable).toHaveBeenCalledWith(REGIONED_FUNCTIONS_INSTANCE, 'createGroup');
    });

    test('should call the createGroup Cloud Function with name and description', async () => {
      const mockCallable = jest.fn().mockResolvedValueOnce({
        data: { success: true, groupId: 'new-group-id' },
      });
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      const svc = GroupService.getInstance();
      const groupId = await svc.createGroup('My Group', 'A test group');

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'createGroup');
      expect(mockCallable).toHaveBeenCalledWith({ name: 'My Group', description: 'A test group' });
      expect(groupId).toBe('new-group-id');
    });

    test('should set the active group to the ID returned by the Cloud Function', async () => {
      const mockCallable = jest.fn().mockResolvedValueOnce({
        data: { success: true, groupId: 'returned-group-id' },
      });
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      const svc = GroupService.getInstance();
      await svc.createGroup('My Group');

      expect(svc.getActiveGroupId()).toBe('returned-group-id');
    });

    test('should throw when the cloud function throws', async () => {
      const mockCallable = jest.fn().mockRejectedValueOnce(new Error('invalid-argument'));
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      const svc = GroupService.getInstance();
      await expect(svc.createGroup('')).rejects.toThrow('invalid-argument');
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
      jest.doMock('@/core/services/firebase/config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test' },
        useEmulators: false, emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));
      const reg = new Map<string, any>([['userService', mockUserServiceInstance]]);
      jest.doMock('@/core/services/firebase/core/ServiceRegistry', () => ({
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

  // ─── updateGroup (T036) ──────────────────────────────────────────────────────

  describe('setGroupCrest (T021)', () => {
    const crest = {
      path: 'groups/g1/crest/a.webp',
      url: 'https://example/a',
      width: 10,
      height: 10,
      uploadedBy: AUTH_UID,
      uploadedAt: '2026-09-24T12:00:00.000Z',
    };

    test('writes the crest, and only the crest, to the group document', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      await GroupService.getInstance().setGroupCrest('g1', crest);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'groups/g1' }),
        { crest }
      );
    });

    test('clears the crest with null', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      await GroupService.getInstance().setGroupCrest('g1', null);
      expect(mockUpdateDoc.mock.calls[0][1]).toEqual({ crest: null });
    });

    test('refuses a non-admin without writing', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(false);
      await expect(GroupService.getInstance().setGroupCrest('g1', crest)).rejects.toThrow(
        'Only group admins can change the crest'
      );
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('updateGroup', () => {
    test('writes the trimmed name and description to the group document', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      const svc = GroupService.getInstance();
      await svc.updateGroup('g1', { name: '  The Company  ', description: ' Nine walkers ' });
      expect(mockIsUserAdmin).toHaveBeenCalledWith('g1', AUTH_UID);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'groups/g1' }),
        { name: 'The Company', description: 'Nine walkers' }
      );
    });

    test('writes only name and description, never createdBy or createdAt', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      const svc = GroupService.getInstance();
      await svc.updateGroup('g1', { name: 'X', createdBy: 'intruder' } as any);
      expect(Object.keys(mockUpdateDoc.mock.calls[0][1]).sort()).toEqual(['description', 'name']);
    });

    test('clears the description when none is given', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      const svc = GroupService.getInstance();
      await svc.updateGroup('g1', { name: 'The Company' });
      expect(mockUpdateDoc.mock.calls[0][1]).toEqual({ name: 'The Company', description: '' });
    });

    test('refuses a blank name without writing', async () => {
      const svc = GroupService.getInstance();
      await expect(svc.updateGroup('g1', { name: '   ' })).rejects.toThrow('A group needs a name');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    test('refuses a non-admin without writing', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(false);
      const svc = GroupService.getInstance();
      await expect(svc.updateGroup('g1', { name: 'X' })).rejects.toThrow(
        'Only group admins can edit the group'
      );
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  // ─── removeUserFromGroup ────────────────────────────────────────────────────

  describe('removeUserFromGroup', () => {
    test("uses the service's regioned Functions instance, not a fresh getFunctions()", async () => {
      const mockCallable = jest.fn().mockResolvedValueOnce({ data: 'ok' });
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      // Construct the singleton first -- this is the ONE legitimate call to
      // getFunctions(app, 'europe-west1'), made by BaseFirebaseService itself.
      const svc = GroupService.getInstance();
      mockGetFunctions.mockClear();
      mockHttpsCallable.mockClear();
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      await svc.removeUserFromGroup('g1', 'uid-to-remove');

      // The method itself must not call getFunctions() again -- that is
      // exactly the bare, wrongly-regioned call this fix removes.
      expect(mockGetFunctions).not.toHaveBeenCalled();
      // httpsCallable must have received the same instance the constructor
      // registered, not a fresh (and differently regioned) one.
      expect(mockHttpsCallable).toHaveBeenCalledWith(REGIONED_FUNCTIONS_INSTANCE, 'removeUserFromGroup');
    });

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

  // ─── setMemberRole ──────────────────────────────────────────────────────────

  // The role change and its last-admin guard live in the `setMemberRole` Cloud
  // Function (T034/T035), pinned by firebase/functions/test/setMemberRole.test.ts.
  // What belongs here is that the client sends it there, and nowhere else.
  describe('setMemberRole', () => {
    test("calls setMemberRole on the service's regioned Functions instance", async () => {
      const svc = GroupService.getInstance();
      mockGetFunctions.mockClear();
      const mockCallable = jest.fn().mockResolvedValueOnce({ data: { success: true } });
      mockHttpsCallable.mockReturnValueOnce(mockCallable);

      await svc.setMemberRole('g1', 'uid-frodo', 'admin');

      expect(mockGetFunctions).not.toHaveBeenCalled();
      expect(mockHttpsCallable).toHaveBeenCalledWith(REGIONED_FUNCTIONS_INSTANCE, 'setMemberRole');
      expect(mockCallable).toHaveBeenCalledWith({ groupId: 'g1', userId: 'uid-frodo', role: 'admin' });
    });

    test('never writes the role itself', async () => {
      mockHttpsCallable.mockReturnValueOnce(jest.fn().mockResolvedValueOnce({ data: { success: true } }));
      const svc = GroupService.getInstance();
      await svc.setMemberRole('g1', 'uid-frodo', 'member');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    test("surfaces the function's refusal", async () => {
      mockHttpsCallable.mockReturnValueOnce(
        jest.fn().mockRejectedValueOnce(new Error("You are this group's only admin."))
      );
      const svc = GroupService.getInstance();
      await expect(svc.setMemberRole('g1', 'uid-gandalf', 'member')).rejects.toThrow('only admin');
    });
  });
});

export {};
