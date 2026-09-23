// src/core/services/firebase/group/__tests__/InvitationService.test.ts

/**
 * Tests for InvitationService
 *
 * All Firebase SDK calls are mocked, and so is UserService, which
 * InvitationService depends on. Joining a group is a Cloud Function call
 * (`redeemInvitation`, T052), so these tests pin what is sent to it; what it
 * does with that is pinned by `firebase/functions/test/redeemInvitation.test.ts`.
 */

// ─── Shared mock fns ─────────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockCallable = jest.fn();
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
  httpsCallable: (_functions: unknown, name: string) => (data: unknown) => mockCallable(name, data),
}));

jest.mock('@/core/services/firebase/config/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test' },
  useEmulators: false,
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
}));

jest.mock('@/core/services/firebase/core/ServiceRegistry', () => {
  const registry = new Map<string, any>([
    ['userService', mockUserServiceInstance],
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

jest.mock('@/core/services/firebase/user/UserService', () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => mockUserServiceInstance) },
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
    ]);
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
      setDoc: function() { return (mockSetDoc as Function).apply(null, arguments); },
      updateDoc: function() { return (mockUpdateDoc as Function).apply(null, arguments); },
      deleteDoc: function() { return (mockDeleteDoc as Function).apply(null, arguments); },
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
      httpsCallable: (_functions: unknown, name: string) => (data: unknown) => mockCallable(name, data),
    }));
    jest.doMock('@/core/services/firebase/config/firebaseConfig', () => ({
      firebaseConfig: { apiKey: 'test', projectId: 'test' },
      useEmulators: false,
      emulatorHost: 'localhost',
      emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
    }));

    [mockGetDoc, mockSetDoc, mockUpdateDoc, mockDeleteDoc, mockGetDocs,
     mockCallable, mockCreateUserWithEmailAndPassword,
     mockIsUserAdmin, mockIsUsernameAvailableInGroup
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

    // T013: a token lapses 14 days after it is minted.
    test('should write an expiry 14 days after creation', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockSetDoc.mockResolvedValueOnce(undefined);
      const svc = InvitationService.getInstance();
      await svc.generateGroupRegistrationToken('g1');
      const written = mockSetDoc.mock.calls[0][1];
      expect(written.expiresAt).toBeInstanceOf(Date);
      expect(written.expiresAt.getTime() - written.createdAt.getTime()).toBe(
        14 * 24 * 60 * 60 * 1000
      );
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
        query: jest.fn(), where: jest.fn(), limit: jest.fn(), collectionGroup: jest.fn(),
      }));
      jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
      jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
      jest.doMock('firebase/functions', () => ({
        getFunctions: jest.fn(() => ({})),
        connectFunctionsEmulator: jest.fn(),
      }));
      jest.doMock('@/core/services/firebase/config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test' },
        useEmulators: false, emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));
      const reg = new Map<string, any>([
        ['userService', mockUserServiceInstance],
      ]);
      jest.doMock('@/core/services/firebase/core/ServiceRegistry', () => ({
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

    test('should return isValid=false when token has expired', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { used: false, expiresAt: new Date(Date.now() - 1000) })
      );
      const svc = InvitationService.getInstance();
      const result = await svc.validateRegistrationToken('expired-token');
      expect(result.isValid).toBe(false);
    });

    test('should read a Timestamp-shaped expiry as Firestore returns it', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      const expired = { toDate: () => new Date(Date.now() - 1000) };
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false, expiresAt: expired }));
      const svc = InvitationService.getInstance();
      expect((await svc.validateRegistrationToken('expired-token')).isValid).toBe(false);
    });

    test('should return isValid=true for an unexpired token', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { used: false, expiresAt: new Date(Date.now() + 60_000) })
      );
      const svc = InvitationService.getInstance();
      expect((await svc.validateRegistrationToken('live-token')).isValid).toBe(true);
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

    test('should convert a stored expiry Timestamp to a Date', async () => {
      const expiry = new Date('2026-10-07T12:00:00.000Z');
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockGetDocs.mockResolvedValueOnce(
        makeQuerySnapshot([
          { exists: () => true, data: () => ({ used: false, expiresAt: { toDate: () => expiry } }), id: 't1' },
        ] as any)
      );
      const svc = InvitationService.getInstance();
      const tokens = await svc.getGroupRegistrationTokens('g1');
      expect(tokens[0].expiresAt).toBe(expiry);
    });

    // `validateRegistrationToken` looks a token up as a **document id**, so the
    // value handed out here has to be that id. The document also stores a
    // `token` field; generation writes the two identically, but nothing
    // enforces it -- and where they diverge, spreading the document data over
    // `token: doc.id` silently hands out a value no lookup can ever resolve.
    // A share link built from it points at an invitation that does not exist.
    test('should return the document id even when a stored token field disagrees', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockGetDocs.mockResolvedValueOnce(
        makeQuerySnapshot([
          {
            exists: () => true,
            data: () => ({ token: 'stale-value', used: false, createdAt: null, usedAt: null }),
            id: 'the-real-doc-id',
          },
        ])
      );
      const svc = InvitationService.getInstance();
      const tokens = await svc.getGroupRegistrationTokens('g1');
      expect(tokens[0].token).toBe('the-real-doc-id');
    });
  });

  // ─── updateGroupRegistrationTokenNotes ────────────────────────────────────

  describe('updateGroupRegistrationTokenNotes', () => {
    test('should throw when user is not admin', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(false);
      const svc = InvitationService.getInstance();
      await expect(
        svc.updateGroupRegistrationTokenNotes('g1', 'tok', 'For Boromir')
      ).rejects.toThrow('Only group admins can update registration tokens');
    });

    test('should write the note when user is admin', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      const svc = InvitationService.getInstance();
      await svc.updateGroupRegistrationTokenNotes('g1', 'tok', 'For Boromir');
      expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
        notes: 'For Boromir',
      });
    });

    // An admin edit must never be able to resurrect a spent invitation, so the
    // payload carries one field and nothing else.
    test('should write only the note, never the used flags', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      const svc = InvitationService.getInstance();
      await svc.updateGroupRegistrationTokenNotes('g1', 'tok', 'x');
      const payload = mockUpdateDoc.mock.calls[0][1];
      expect(Object.keys(payload)).toEqual(['notes']);
    });

    test('should allow clearing the note', async () => {
      mockIsUserAdmin.mockResolvedValueOnce(true);
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      const svc = InvitationService.getInstance();
      await svc.updateGroupRegistrationTokenNotes('g1', 'tok', '');
      expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), { notes: '' });
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

    test('should redeem the token through the Cloud Function, writing nothing itself (T052)', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      // validateRegistrationToken → valid
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false }));
      mockCallable.mockResolvedValueOnce({ data: { success: true, groupId: 'g1' } });

      const svc = InvitationService.getInstance();
      await svc.joinGroupWithToken('valid-token', 'NewUser');
      expect(mockCallable).toHaveBeenCalledWith('redeemInvitation', {
        groupId: 'g1',
        token: 'valid-token',
        username: 'NewUser',
      });
      // Membership and the spent token are the function's to write; a client
      // write to either is exactly what the rules now refuse.
      expect(mockUpdateDoc).not.toHaveBeenCalled();
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    test("should surface the function's refusal", async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false }));
      mockCallable.mockRejectedValueOnce(new Error('This invitation has already been used. Ask for a new link.'));

      const svc = InvitationService.getInstance();
      await expect(svc.joinGroupWithToken('valid-token', 'NewUser')).rejects.toThrow(
        'This invitation has already been used'
      );
    });
  });

  describe('joinGroupWithToken — expiry (T013)', () => {
    test('should refuse an expired token and join nothing', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { used: false, expiresAt: new Date(Date.now() - 1000) })
      );
      const svc = InvitationService.getInstance();
      await expect(svc.joinGroupWithToken('expired-token', 'User')).rejects.toThrow(
        'Invalid or expired invitation token'
      );
      expect(mockCallable).not.toHaveBeenCalled();
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

    test('should create the Auth user, then redeem the token as that user', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      // validateRegistrationToken → valid
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false }));
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(true);
      const fakeUser = { uid: 'new-uid', delete: jest.fn() };
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
      mockCallable.mockResolvedValueOnce({ data: { success: true, groupId: 'g1' } });

      const svc = InvitationService.getInstance();
      const user = await svc.signUpWithToken('valid-token', 'a@b.com', 'pass', 'NewUser');
      expect(user).toBe(fakeUser);
      expect(mockCallable).toHaveBeenCalledWith('redeemInvitation', {
        groupId: 'g1',
        token: 'valid-token',
        username: 'NewUser',
      });
      // The global profile is created by the function; a client may no
      // longer create it (it could otherwise carry `isAdmin: true`).
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(fakeUser.delete).not.toHaveBeenCalled();
    });

    test('should delete the new Auth user when redemption fails', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false }));
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(true);
      const fakeUser = { uid: 'new-uid', delete: jest.fn().mockResolvedValueOnce(undefined) };
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
      mockCallable.mockRejectedValueOnce(new Error('redemption failed'));

      const svc = InvitationService.getInstance();
      await expect(
        svc.signUpWithToken('valid-token', 'a@b.com', 'pass', 'NewUser')
      ).rejects.toThrow('redemption failed');
      expect(fakeUser.delete).toHaveBeenCalledTimes(1);
    });

    test('should refuse an expired token on the provided-groupId path, before creating any account', async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { used: false, expiresAt: new Date(Date.now() - 1000) })
      );
      const svc = InvitationService.getInstance();
      await expect(
        svc.signUpWithToken('expired-token', 'a@b.com', 'pass', 'User', 'provided-group')
      ).rejects.toThrow('Invalid or expired invitation token');
      expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test('should refuse an expired token on the URL path, before creating any account', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?groupId=g1' },
      });
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { used: false, expiresAt: new Date(Date.now() - 1000) })
      );
      const svc = InvitationService.getInstance();
      await expect(
        svc.signUpWithToken('expired-token', 'a@b.com', 'pass', 'User')
      ).rejects.toThrow('Invalid or expired invitation token');
      expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test('should use provided groupId and verify token directly', async () => {
      // groupId provided explicitly — verifies token directly without URL
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { used: false })); // direct doc check
      mockIsUsernameAvailableInGroup.mockResolvedValueOnce(true);
      const fakeUser = { uid: 'uid-222', delete: jest.fn() };
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
      mockCallable.mockResolvedValueOnce({ data: { success: true, groupId: 'provided-group' } });

      const svc = InvitationService.getInstance();
      const user = await svc.signUpWithToken('token-xyz', 'a@b.com', 'pass', 'User', 'provided-group');
      expect(user).toBe(fakeUser);
      expect(mockCallable).toHaveBeenCalledWith('redeemInvitation', expect.objectContaining({
        groupId: 'provided-group',
        token: 'token-xyz',
      }));
    });
  });
});

export {};
