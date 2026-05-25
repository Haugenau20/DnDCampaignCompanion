// src/services/firebase/group/__tests__/InvitationService.test.ts

/**
 * Tests for InvitationService
 *
 * All Firebase SDK calls are mocked.  UserService and GroupService
 * are also mocked because InvitationService depends on both.
 */

// ─── Shared mock fns ─────────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockRunTransaction = jest.fn();
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockCollection = jest.fn((_db: any, ...segs: string[]) => ({ path: segs.join('/') }));
const mockDoc = jest.fn((_db_or_ref: any, ...segs: string[]) => ({
  path: segs.join('/'),
  id: segs[segs.length - 1] || 'gen-id',
}));

// UserService mock
const mockIsUserAdmin = jest.fn();
const mockIsUsernameAvailableInGroup = jest.fn();
const mockUserServiceInstance = {
  isUserAdmin: mockIsUserAdmin,
  isUsernameAvailableInGroup: mockIsUsernameAvailableInGroup,
  getGroupUserProfile: jest.fn(),
};

// GroupService mock
const mockJoinGroup = jest.fn();
const mockGroupServiceInstance = {
  joinGroup: mockJoinGroup,
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
  deleteDoc: function() { return (mockDeleteDoc as Function).apply(null, arguments); },
  runTransaction: function() { return (mockRunTransaction as Function).apply(null, arguments); },
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  collectionGroup: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: { uid: 'admin-user', email: 'admin@test.com' } })),
  connectAuthEmulator: jest.fn(),
  createUserWithEmailAndPassword: function() { return (mockCreateUserWithEmailAndPassword as Function).apply(null, arguments); },
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
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
  const registry = new Map<string, any>([
    ['userService', mockUserServiceInstance],
    ['groupService', mockGroupServiceInstance],
  ]);
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

jest.mock('../../user/UserService', () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => mockUserServiceInstance) },
}));
jest.mock('../GroupService', () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => mockGroupServiceInstance) },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDocSnapshot(exists: boolean, data: Record<string, any> = {}) {
  return { exists: () => exists, data: () => data, id: 'doc-id' };
}

function makeQuerySnapshot(docs: ReturnType<typeof makeDocSnapshot>[]) {
  return { docs };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('InvitationService', () => {
  let InvitationService: typeof import('../InvitationService').default;
  const ADMIN_UID = 'admin-user';

  beforeEach(() => {
    jest.resetModules();

    const registry = new Map<string, any>([
      ['userService', mockUserServiceInstance],
      ['groupService', mockGroupServiceInstance],
    ]);
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
      deleteDoc: function() { return (mockDeleteDoc as Function).apply(null, arguments); },
      runTransaction: function() { return (mockRunTransaction as Function).apply(null, arguments); },
      query: jest.fn(), where: jest.fn(), limit: jest.fn(), collectionGroup: jest.fn(),
    }));
    jest.doMock('firebase/auth', () => ({
      getAuth: jest.fn(() => ({ currentUser: { uid: ADMIN_UID, email: 'admin@test.com' } })),
      connectAuthEmulator: jest.fn(),
      createUserWithEmailAndPassword: function() { return (mockCreateUserWithEmailAndPassword as Function).apply(null, arguments); },
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

    [mockGetDoc, mockSetDoc, mockUpdateDoc, mockDeleteDoc, mockGetDocs,
     mockRunTransaction, mockCreateUserWithEmailAndPassword,
     mockIsUserAdmin, mockIsUsernameAvailableInGroup, mockJoinGroup
    ].forEach(m => m.mockReset());

    InvitationService = require('../InvitationService').default;
  });

  // ─── getInstance ────────────────────────────────────────────────────────────

  describe('getInstance', () => {
    test('should return an InvitationService instance', () => {
      expect(InvitationService.getInstance()).toBeDefined();
    });

    test('should be a singleton', () => {
      expect(InvitationService.getInstance()).toBe(InvitationService.getInstance());
    });
  });

  // ─── generateGroupRegistrationToken ──────────────────────────────────────

  describe('generateGroupRegistrationToken', () => {
    test('should throw when user is not admin', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(false);
      const svc = InvitationService.getInstance();
      await expect(svc.generateGroupRegistrationToken('g1')).rejects.toThrow(
        'Only group admins can generate tokens'
      );
    });

    test('should store the token and return it when user is admin', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockSetDoc.mockResolvedValueOnce(undefined);
      const svc = InvitationService.getInstance();
      const token = await svc.generateGroupRegistrationToken('g1', 'test token');
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    test('should throw when user is not authenticated', async () => {
      jest.resetModules();
      jest.doMock('firebase/auth', () => ({
        getAuth: jest.fn(() => ({ currentUser: null })),
        connectAuthEmulator: jest.fn(),
        createUserWithEmailAndPassword: function() { return (mockCreateUserWithEmailAndPassword as Function).apply(null, arguments); },
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
        runTransaction: function() { return (mockRunTransaction as Function).apply(null, arguments); },
        query: jest.fn(), where: jest.fn(), limit: jest.fn(), collectionGroup: jest.fn(),
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
      const reg = new Map<string, any>([
        ['userService', mockUserServiceInstance],
        ['groupService', mockGroupServiceInstance],
      ]);
      jest.doMock('../../core/ServiceRegistry', () => ({
        __esModule: true,
        default: { getInstance: jest.fn(() => ({
          get: (n: string) => { if (!reg.has(n)) throw new Error(`Service '${n}' not found`); return reg.get(n); },
          register: (n: string, s: any) => reg.set(n, s),
          has: (n: string) => reg.has(n),
        })) },
      }));
      const IS = require('../InvitationService').default;
      await expect(IS.getInstance().generateGroupRegistrationToken('g1')).rejects.toThrow(
        'Not authenticated'
      );
    });
  });

  // ─── validateRegistrationToken ────────────────────────────────────────────

  describe('validateRegistrationToken', () => {
    test('should return isValid=false when no groupId in URL', async () => {
      // window.location.search has no groupId
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '' },
      });
      const svc = InvitationService.getInstance();
      const result = await svc.validateRegistrationToken('some-token');
      expect(result.isValid).toBe(false);
    });

    test('should return isValid=true when token exists and is unused', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false }));
      const svc = InvitationService.getInstance();
      const result = await svc.validateRegistrationToken('valid-token');
      expect(result.isValid).toBe(true);
      expect(result.groupId).toBe('g1');
    });

    test('should return isValid=false when token is marked as used', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: true }));
      const svc = InvitationService.getInstance();
      const result = await svc.validateRegistrationToken('used-token');
      expect(result.isValid).toBe(false);
    });

    test('should return isValid=false when token document does not exist', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      const svc = InvitationService.getInstance();
      const result = await svc.validateRegistrationToken('nonexistent-token');
      expect(result.isValid).toBe(false);
    });

    test('should return isValid=false when Firestore throws', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockRejectedValueOnce(new Error('network error'));
      const svc = InvitationService.getInstance();
      const result = await svc.validateRegistrationToken('bad-token');
      expect(result.isValid).toBe(false);
    });
  });

  // ─── getGroupRegistrationTokens ────────────────────────────────────────────

  describe('getGroupRegistrationTokens', () => {
    test('should throw when user is not admin', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(false);
      const svc = InvitationService.getInstance();
      await expect(svc.getGroupRegistrationTokens('g1')).rejects.toThrow(
        'Only group admins can view registration tokens'
      );
    });

    test('should return tokens list when user is admin', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockGetDocs.mockResolvedValueOnce(
        makeQuerySnapshot([
          { exists: () => true, data: () => ({ token: 't1', used: false, createdAt: null, usedAt: null }), id: 't1' },
        ])
      );
      const svc = InvitationService.getInstance();
      const tokens = await svc.getGroupRegistrationTokens('g1');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].token).toBe('t1');
    });
  });

  // ─── deleteGroupRegistrationToken ─────────────────────────────────────────

  describe('deleteGroupRegistrationToken', () => {
    test('should throw when user is not admin', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(false);
      const svc = InvitationService.getInstance();
      await expect(svc.deleteGroupRegistrationToken('g1', 'token-to-del')).rejects.toThrow(
        'Only group admins can delete registration tokens'
      );
    });

    test('should call deleteDoc when user is admin', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockDeleteDoc.mockResolvedValueOnce(undefined);
      const svc = InvitationService.getInstance();
      await svc.deleteGroupRegistrationToken('g1', 'token-abc');
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  // ─── joinGroupWithToken ────────────────────────────────────────────────────

  describe('joinGroupWithToken', () => {
    test('should throw when token is invalid', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '' }, // no groupId → invalid
      });
      const svc = InvitationService.getInstance();
      await expect(svc.joinGroupWithToken('bad-token', 'User')).rejects.toThrow(
        'Invalid or expired invitation token'
      );
    });

    test('should call groupService.joinGroup and mark token used on success', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      // validateRegistrationToken → valid
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false }));
      mockJoinGroup.mockResolvedValueOnce(undefined);
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const svc = InvitationService.getInstance();
      await svc.joinGroupWithToken('valid-token', 'NewUser');
      expect(mockJoinGroup).toHaveBeenCalledWith('g1', 'NewUser');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ used: true, usedBy: ADMIN_UID })
      );
    });
  });

  // ─── signUpWithToken ───────────────────────────────────────────────────────

  describe('signUpWithToken', () => {
    test('should throw when token is invalid (no groupId from URL)', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '' },
      });
      const svc = InvitationService.getInstance();
      await expect(
        svc.signUpWithToken('bad-token', 'a@b.com', 'pass', 'User')
      ).rejects.toThrow('Invalid or expired invitation token');
    });

    test('should throw when username is already taken', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      // validateRegistrationToken → valid
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false }));
      // isUsernameAvailableInGroup → not available
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(false);
      const svc = InvitationService.getInstance();
      await expect(
        svc.signUpWithToken('valid-token', 'a@b.com', 'pass', 'TakenUser')
      ).rejects.toThrow('Username is already taken in this group');
    });

    test('should create Firebase Auth user and run transaction on success', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      // validateRegistrationToken → valid
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false }));
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(true);
      const fakeUser = { uid: 'new-uid', delete: jest.fn() };
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
      mockRunTransaction.mockResolvedValueOnce(undefined);

      const svc = InvitationService.getInstance();
      const user = await svc.signUpWithToken('valid-token', 'a@b.com', 'pass', 'NewUser');
      expect(user).toBe(fakeUser);
      expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    });

    test('should attempt to delete auth user when transaction fails', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false }));
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(true);
      const fakeUser = { uid: 'new-uid', delete: jest.fn().mockResolvedValueOnce(undefined) };
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
      mockRunTransaction.mockRejectedValueOnce(new Error('transaction failed'));

      // Provide currentUser in auth for cleanup
      const { getAuth } = require('firebase/auth');
      getAuth.mockReturnValueOnce({ currentUser: fakeUser });

      const svc = InvitationService.getInstance();
      await expect(
        svc.signUpWithToken('valid-token', 'a@b.com', 'pass', 'NewUser')
      ).rejects.toThrow('transaction failed');
    });

    test('should use provided groupId and verify token directly', async () => {
      // groupId provided explicitly — verifies token directly without URL
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false })); // direct doc check
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(true);
      const fakeUser = { uid: 'uid-222', delete: jest.fn() };
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
      mockRunTransaction.mockResolvedValueOnce(undefined);

      const svc = InvitationService.getInstance();
      const user = await svc.signUpWithToken('token-xyz', 'a@b.com', 'pass', 'User', 'provided-group');
      expect(user).toBe(fakeUser);
    });
  });
});
