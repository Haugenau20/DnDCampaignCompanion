// src/services/firebase/auth/__tests__/AuthService.test.ts

/**
 * Tests for AuthService
 *
 * Mocks: firebase/auth, firebase/firestore, UserService dependency.
 * localStorage is available in jsdom.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCurrentUser: any = { uid: 'user-123', email: 'test@example.com' };
const mockAuth: any = { currentUser: null };

const mockSignInWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();
const mockSetPersistence = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn((_db: any, ...segs: string[]) => ({ path: segs.join('/') }));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth),
  connectAuthEmulator: jest.fn(),
  signInWithEmailAndPassword: (a: any, b: any, c: any) => mockSignInWithEmailAndPassword(a, b, c),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: (a: any) => mockSignOut(a),
  setPersistence: (a: any, b: any) => mockSetPersistence(a, b),
  browserLocalPersistence: 'LOCAL',
  browserSessionPersistence: 'SESSION',
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
  doc: (a: any, ...rest: string[]) => mockDoc(a, ...rest),
  getDoc: (a: any) => mockGetDoc(a),
  updateDoc: (a: any, b: any) => mockUpdateDoc(a, b),
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  connectFunctionsEmulator: jest.fn(),
}));

jest.mock('@/services/firebase/config/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test' },
  useEmulators: false,
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
  SESSION_DURATION: 86400000,
  REMEMBER_ME_DURATION: 2592000000,
  INACTIVITY_TIMEOUT: 86400000,
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeDocSnapshot(exists: boolean, data: Record<string, any> = {}) {
  return { exists: () => exists, data: () => data };
}

// Mock UserService at the module level
const mockGetGroupUserProfile = jest.fn();
const mockUserServiceInstance = { getGroupUserProfile: mockGetGroupUserProfile };

jest.mock('@/features/user-management/profiles/services/UserService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => mockUserServiceInstance),
  },
}));

// Mock ServiceRegistry so AuthService constructor can get 'userService'
jest.mock('@/services/firebase/core/ServiceRegistry', () => {
  const registry = new Map<string, any>();
  registry.set('userService', mockUserServiceInstance);
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

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let AuthService: typeof import('../AuthService').default;

  const SESSION_DURATION = 86400000;
  const REMEMBER_ME_DURATION = 2592000000;
  const INACTIVITY_TIMEOUT = 86400000;

  beforeEach(() => {
    jest.resetModules();

    // Re-apply mocks after resetModules
    jest.doMock('firebase/auth', () => ({
      getAuth: jest.fn(() => mockAuth),
      connectAuthEmulator: jest.fn(),
      signInWithEmailAndPassword: (a: any, b: any, c: any) => mockSignInWithEmailAndPassword(a, b, c),
      createUserWithEmailAndPassword: jest.fn(),
      signOut: (a: any) => mockSignOut(a),
      setPersistence: (a: any, b: any) => mockSetPersistence(a, b),
      browserLocalPersistence: 'LOCAL',
      browserSessionPersistence: 'SESSION',
    }));
    jest.doMock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => ({})),
      connectFirestoreEmulator: jest.fn(),
      doc: (a: any, ...rest: string[]) => mockDoc(a, ...rest),
      getDoc: (a: any) => mockGetDoc(a),
      updateDoc: (a: any, b: any) => mockUpdateDoc(a, b),
    }));
    jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
    jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
    jest.doMock('firebase/functions', () => ({
      getFunctions: jest.fn(() => ({})),
      connectFunctionsEmulator: jest.fn(),
    }));
    jest.doMock('@/services/firebase/config/firebaseConfig', () => ({
      firebaseConfig: { apiKey: 'test', projectId: 'test' },
      useEmulators: false,
      emulatorHost: 'localhost',
      emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      SESSION_DURATION,
      REMEMBER_ME_DURATION,
      INACTIVITY_TIMEOUT,
    }));
    jest.doMock('@/features/user-management/profiles/services/UserService', () => ({
      __esModule: true,
      default: { getInstance: jest.fn(() => mockUserServiceInstance) },
    }));

    const registry = new Map<string, any>([['userService', mockUserServiceInstance]]);
    jest.doMock('@/services/firebase/core/ServiceRegistry', () => ({
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

    mockSignInWithEmailAndPassword.mockReset();
    mockSignOut.mockReset();
    mockSetPersistence.mockReset();
    mockGetDoc.mockReset();
    mockUpdateDoc.mockReset();
    mockGetGroupUserProfile.mockReset();
    mockAuth.currentUser = null;

    localStorage.clear();

    AuthService = require('../AuthService').default;
  });

  // ─── getInstance ────────────────────────────────────────────────────────────

  describe('getInstance', () => {
    test('should return an AuthService instance', () => {
      const svc = AuthService.getInstance();
      expect(svc).toBeDefined();
    });

    test('should return the same instance (singleton)', () => {
      const a = AuthService.getInstance();
      const b = AuthService.getInstance();
      expect(a).toBe(b);
    });
  });

  // ─── getCurrentUserId ───────────────────────────────────────────────────────

  describe('getCurrentUserId', () => {
    test('should return null when no user is signed in', () => {
      mockAuth.currentUser = null;
      const svc = AuthService.getInstance();
      expect(svc.getCurrentUserId()).toBeNull();
    });

    test('should return uid when a user is signed in', () => {
      mockAuth.currentUser = { uid: 'uid-abc' };
      const svc = AuthService.getInstance();
      expect(svc.getCurrentUserId()).toBe('uid-abc');
    });
  });

  // ─── getUser ────────────────────────────────────────────────────────────────

  describe('getUser', () => {
    test('should return null when no user is signed in', () => {
      mockAuth.currentUser = null;
      expect(AuthService.getInstance().getUser()).toBeNull();
    });

    test('should return the user object when signed in', () => {
      mockAuth.currentUser = mockCurrentUser;
      expect(AuthService.getInstance().getUser()).toBe(mockCurrentUser);
    });
  });

  // ─── updateLastActivity ─────────────────────────────────────────────────────

  describe('updateLastActivity', () => {
    test('should update lastActivityAt in localStorage sessionInfo', () => {
      const sessionInfo = {
        createdAt: 1000,
        expiresAt: 9999999,
        lastActivityAt: 1000,
        rememberMe: false,
      };
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
      const before = Date.now();
      AuthService.getInstance().updateLastActivity();
      const stored = JSON.parse(localStorage.getItem('sessionInfo')!);
      expect(stored.lastActivityAt).toBeGreaterThanOrEqual(before);
    });

    test('should do nothing when sessionInfo is absent', () => {
      expect(() => AuthService.getInstance().updateLastActivity()).not.toThrow();
    });

    test('should handle corrupted sessionInfo gracefully', () => {
      localStorage.setItem('sessionInfo', 'not-json');
      expect(() => AuthService.getInstance().updateLastActivity()).not.toThrow();
    });
  });

  // ─── checkSessionExpired ────────────────────────────────────────────────────

  describe('checkSessionExpired', () => {
    test('should return false when no sessionInfo is stored', () => {
      expect(AuthService.getInstance().checkSessionExpired()).toBe(false);
    });

    test('should return true when the session has passed its absolute expiresAt', () => {
      const sessionInfo = {
        createdAt: 0,
        expiresAt: 1, // in the past
        lastActivityAt: Date.now(),
        rememberMe: false,
      };
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
      expect(AuthService.getInstance().checkSessionExpired()).toBe(true);
    });

    test('should return true when the session has been inactive beyond INACTIVITY_TIMEOUT', () => {
      const sessionInfo = {
        createdAt: 0,
        expiresAt: Date.now() + REMEMBER_ME_DURATION,
        lastActivityAt: Date.now() - INACTIVITY_TIMEOUT - 1000, // inactive too long
        rememberMe: true,
      };
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
      expect(AuthService.getInstance().checkSessionExpired()).toBe(true);
    });

    test('should return false for a valid, active session', () => {
      const sessionInfo = {
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION,
        lastActivityAt: Date.now(),
        rememberMe: false,
      };
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
      expect(AuthService.getInstance().checkSessionExpired()).toBe(false);
    });

    test('should return false and not throw for corrupted sessionInfo', () => {
      localStorage.setItem('sessionInfo', 'corrupted!');
      expect(AuthService.getInstance().checkSessionExpired()).toBe(false);
    });
  });

  // ─── signOut ────────────────────────────────────────────────────────────────

  describe('signOut', () => {
    test('should call firebaseSignOut and clear localStorage', async () => {
      localStorage.setItem('sessionInfo', JSON.stringify({ some: 'data' }));
      mockSignOut.mockResolvedValueOnce(undefined);
      const svc = AuthService.getInstance();
      svc.setActiveGroup('g1');
      svc.setActiveCampaign('c1');

      await svc.signOut();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('sessionInfo')).toBeNull();
    });

    test('should clear active group and campaign after signOut', async () => {
      mockSignOut.mockResolvedValueOnce(undefined);
      const svc = AuthService.getInstance();
      svc.setActiveGroup('group-x');
      svc.setActiveCampaign('campaign-x');

      await svc.signOut();

      expect(svc.getActiveGroupId()).toBeNull();
      expect(svc.getActiveCampaignId()).toBeNull();
    });
  });

  // ─── renewSession ───────────────────────────────────────────────────────────

  describe('renewSession', () => {
    test('should throw when no user is authenticated', async () => {
      mockAuth.currentUser = null;
      const svc = AuthService.getInstance();
      await expect(svc.renewSession()).rejects.toThrow('No authenticated user');
    });

    test('should write new sessionInfo to localStorage when user is authenticated', async () => {
      mockAuth.currentUser = { uid: 'uid-1' };
      mockSetPersistence.mockResolvedValueOnce(undefined);
      const svc = AuthService.getInstance();
      const before = Date.now();

      await svc.renewSession(false);

      const stored = JSON.parse(localStorage.getItem('sessionInfo')!);
      expect(stored.createdAt).toBeGreaterThanOrEqual(before);
      expect(stored.rememberMe).toBe(false);
      expect(stored.expiresAt).toBeGreaterThan(stored.createdAt);
    });

    test('should use REMEMBER_ME_DURATION when rememberMe=true', async () => {
      mockAuth.currentUser = { uid: 'uid-1' };
      mockSetPersistence.mockResolvedValueOnce(undefined);
      const svc = AuthService.getInstance();
      await svc.renewSession(true);

      const stored = JSON.parse(localStorage.getItem('sessionInfo')!);
      expect(stored.rememberMe).toBe(true);
      expect(stored.expiresAt - stored.createdAt).toBe(REMEMBER_ME_DURATION);
    });

    test('should continue even if setPersistence throws', async () => {
      mockAuth.currentUser = { uid: 'uid-1' };
      mockSetPersistence.mockRejectedValueOnce(new Error('persistence error'));
      const svc = AuthService.getInstance();
      // Should not propagate the persistence error
      await expect(svc.renewSession()).resolves.toBeUndefined();
    });
  });

  // ─── signIn ─────────────────────────────────────────────────────────────────

  describe('signIn', () => {
    test('should throw when Firebase sign-in fails', async () => {
      mockSetPersistence.mockResolvedValueOnce(undefined);
      mockSignInWithEmailAndPassword.mockRejectedValueOnce(new Error('invalid password'));
      const svc = AuthService.getInstance();
      await expect(svc.signIn('a@b.com', 'wrong')).rejects.toThrow('invalid password');
    });

    test('should return the user on successful sign-in', async () => {
      const fakeUser = { uid: 'uid-signed-in' };
      mockSetPersistence.mockResolvedValueOnce(undefined);
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
      // updateDoc for lastLogin
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      // getDoc for user profile (no activeGroupId)
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { email: 'a@b.com', groups: [] }));

      const svc = AuthService.getInstance();
      const user = await svc.signIn('a@b.com', 'password');
      expect(user).toBe(fakeUser);
    });

    test('should store sessionInfo in localStorage on successful sign-in', async () => {
      const fakeUser = { uid: 'uid-signed-in' };
      mockSetPersistence.mockResolvedValueOnce(undefined);
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { email: 'a@b.com', groups: [] }));

      const svc = AuthService.getInstance();
      await svc.signIn('a@b.com', 'pass');
      const stored = JSON.parse(localStorage.getItem('sessionInfo')!);
      expect(stored).toHaveProperty('createdAt');
      expect(stored).toHaveProperty('expiresAt');
      expect(stored.rememberMe).toBe(false);
    });

    test('should set active group and campaign when userData has activeGroupId', async () => {
      const fakeUser = { uid: 'uid-grp' };
      mockSetPersistence.mockResolvedValueOnce(undefined);
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
      mockUpdateDoc.mockResolvedValueOnce(undefined);
      // user profile with activeGroupId
      mockGetDoc.mockResolvedValueOnce(
        makeDocSnapshot(true, { email: 'a@b.com', activeGroupId: 'group-1' })
      );
      // getGroupUserProfile call → no activeCampaignId
      mockGetGroupUserProfile.mockResolvedValueOnce({ activeCampaignId: null });

      const svc = AuthService.getInstance();
      await svc.signIn('a@b.com', 'pass');
      expect(svc.getActiveGroupId()).toBe('group-1');
    });
  });
});

export {};
