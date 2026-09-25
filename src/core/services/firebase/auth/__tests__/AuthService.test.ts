// src/core/services/firebase/auth/__tests__/AuthService.test.ts

/**
 * Tests for AuthService
 *
 * Mocks: firebase/auth, firebase/firestore, UserService dependency.
 * localStorage is available in jsdom.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCurrentUser: any = { uid: 'user-123', email: 'test@example.com' };
const mockAuth: any = { currentUser: null };

const mockSendSignInLinkToEmail = jest.fn();
const mockIsSignInWithEmailLink = jest.fn();
const mockSignInWithEmailLink = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockLinkWithPopup = jest.fn();
const mockGetAdditionalUserInfo = jest.fn();
const mockDeleteUser = jest.fn();
const mockSetCustomParameters = jest.fn();
const mockSignInWithCustomToken = jest.fn();
const mockCallable = jest.fn();
const mockHttpsCallable = jest.fn((_fns: any, _name: string) => mockCallable);

/** The `firebase/auth` surface AuthService uses, for both mock registrations. */
const mockFirebaseAuthModule = () => ({
  getAuth: jest.fn(() => mockAuth),
  connectAuthEmulator: jest.fn(),
  sendSignInLinkToEmail: (a: any, b: any, c: any) => mockSendSignInLinkToEmail(a, b, c),
  isSignInWithEmailLink: (a: any, b: any) => mockIsSignInWithEmailLink(a, b),
  signInWithEmailLink: (a: any, b: any, c: any) => mockSignInWithEmailLink(a, b, c),
  signInWithPopup: (a: any, b: any) => mockSignInWithPopup(a, b),
  signInWithCustomToken: (a: any, b: any) => mockSignInWithCustomToken(a, b),
  linkWithPopup: (a: any, b: any) => mockLinkWithPopup(a, b),
  getAdditionalUserInfo: (a: any) => mockGetAdditionalUserInfo(a),
  deleteUser: (a: any) => mockDeleteUser(a),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    providerId: 'google.com',
    setCustomParameters: (p: any) => mockSetCustomParameters(p),
  })),
  signOut: (a: any) => mockSignOut(a),
  setPersistence: (a: any, b: any) => mockSetPersistence(a, b),
  browserLocalPersistence: 'LOCAL',
  browserSessionPersistence: 'SESSION',
});
const mockSignOut = jest.fn();
const mockSetPersistence = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn((_db: any, ...segs: string[]) => ({ path: segs.join('/') }));

jest.mock('firebase/auth', () => mockFirebaseAuthModule());

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
  httpsCallable: (a: any, b: string) => mockHttpsCallable(a, b),
}));

jest.mock('@/core/services/firebase/config/firebaseConfig', () => ({
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

jest.mock('@/core/services/firebase/user/UserService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => mockUserServiceInstance),
  },
}));

// Mock ServiceRegistry so AuthService constructor can get 'userService'
jest.mock('@/core/services/firebase/core/ServiceRegistry', () => {
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
    jest.doMock('firebase/auth', () => mockFirebaseAuthModule());
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
      httpsCallable: (a: any, b: string) => mockHttpsCallable(a, b),
    }));
    jest.doMock('@/core/services/firebase/config/firebaseConfig', () => ({
      firebaseConfig: { apiKey: 'test', projectId: 'test' },
      useEmulators: false,
      emulatorHost: 'localhost',
      emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      SESSION_DURATION,
      REMEMBER_ME_DURATION,
      INACTIVITY_TIMEOUT,
    }));
    jest.doMock('@/core/services/firebase/user/UserService', () => ({
      __esModule: true,
      default: { getInstance: jest.fn(() => mockUserServiceInstance) },
    }));

    const registry = new Map<string, any>([['userService', mockUserServiceInstance]]);
    jest.doMock('@/core/services/firebase/core/ServiceRegistry', () => ({
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

    [
      mockSendSignInLinkToEmail, mockIsSignInWithEmailLink, mockSignInWithEmailLink,
      mockSignInWithPopup, mockLinkWithPopup, mockGetAdditionalUserInfo,
      mockDeleteUser, mockSetCustomParameters, mockSignInWithCustomToken, mockCallable,
    ].forEach((mock) => mock.mockReset());
    mockSignOut.mockReset();
    mockHttpsCallable.mockClear();
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

  // ─── Passwordless sign-in ───────────────────────────────────────────────────
  //
  // Replaces the `signIn(email, password)` suite. Password sign-in was removed
  // on purpose (T022): accounts sign in by magic link or Google, and are
  // created only from an invitation. The session and profile bookkeeping that
  // suite asserted is unchanged and is asserted again below, through the new
  // entrances.

  describe('sendSignInLink', () => {
    test('sends a link that the app itself handles, to the given URL', async () => {
      mockSendSignInLinkToEmail.mockResolvedValueOnce(undefined);
      const svc = AuthService.getInstance();
      await svc.sendSignInLink('a@b.com', 'http://app/auth/link?next=%2Fnpcs');
      expect(mockSendSignInLinkToEmail).toHaveBeenCalledWith(mockAuth, 'a@b.com', {
        url: 'http://app/auth/link?next=%2Fnpcs',
        handleCodeInApp: true,
      });
    });

    test('remembers the address and the session choice in this browser', async () => {
      mockSendSignInLinkToEmail.mockResolvedValueOnce(undefined);
      const svc = AuthService.getInstance();
      await svc.sendSignInLink('a@b.com', 'http://app/auth/link', true);
      expect(svc.getPendingEmailSignIn()).toEqual({ email: 'a@b.com', rememberMe: true });
    });

    test('remembers nothing when sending fails', async () => {
      mockSendSignInLinkToEmail.mockRejectedValueOnce(new Error('quota'));
      const svc = AuthService.getInstance();
      await expect(svc.sendSignInLink('a@b.com', 'http://app/auth/link')).rejects.toThrow('quota');
      expect(svc.getPendingEmailSignIn()).toBeNull();
    });
  });

  describe('getPendingEmailSignIn', () => {
    test('is null when nothing was sent', () => {
      expect(AuthService.getInstance().getPendingEmailSignIn()).toBeNull();
    });

    test('is null, not a throw, when the stored value is unreadable', () => {
      localStorage.setItem('pendingEmailSignIn', '{not json');
      expect(AuthService.getInstance().getPendingEmailSignIn()).toBeNull();
    });
  });

  describe('isSignInLink', () => {
    test('asks Firebase about the given URL', () => {
      mockIsSignInWithEmailLink.mockReturnValueOnce(true);
      expect(AuthService.getInstance().isSignInLink('http://app/auth/link?oobCode=x')).toBe(true);
      expect(mockIsSignInWithEmailLink).toHaveBeenCalledWith(mockAuth, 'http://app/auth/link?oobCode=x');
    });
  });

  describe('completeSignInLink', () => {
    test('signs in with the link and forgets the pending address', async () => {
      const fakeUser = { uid: 'uid-link' };
      localStorage.setItem('pendingEmailSignIn', JSON.stringify({ email: 'a@b.com', rememberMe: false }));
      mockSignInWithEmailLink.mockResolvedValueOnce({ user: fakeUser });
      mockGetAdditionalUserInfo.mockReturnValueOnce({ isNewUser: false });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { groups: [] }));

      const svc = AuthService.getInstance();
      const result = await svc.completeSignInLink('a@b.com', 'http://app/auth/link?oobCode=x');

      expect(mockSignInWithEmailLink).toHaveBeenCalledWith(mockAuth, 'a@b.com', 'http://app/auth/link?oobCode=x');
      expect(result).toEqual({ user: fakeUser, isNewUser: false });
      expect(svc.getPendingEmailSignIn()).toBeNull();
    });

    test('sets persistence from rememberMe before signing in', async () => {
      mockSignInWithEmailLink.mockResolvedValueOnce({ user: { uid: 'u' } });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      const svc = AuthService.getInstance();

      await svc.completeSignInLink('a@b.com', 'link', true);

      expect(mockSetPersistence).toHaveBeenCalledWith(mockAuth, 'LOCAL');
      expect(mockSetPersistence.mock.invocationCallOrder[0])
        .toBeLessThan(mockSignInWithEmailLink.mock.invocationCallOrder[0]);
    });

    test('keeps the pending address when the link is refused', async () => {
      localStorage.setItem('pendingEmailSignIn', JSON.stringify({ email: 'a@b.com', rememberMe: false }));
      mockSignInWithEmailLink.mockRejectedValueOnce(new Error('INVITE_REQUIRED'));
      const svc = AuthService.getInstance();
      await expect(svc.completeSignInLink('a@b.com', 'link')).rejects.toThrow('INVITE_REQUIRED');
      expect(svc.getPendingEmailSignIn()).toEqual({ email: 'a@b.com', rememberMe: false });
    });
  });

  describe('signing in from another device', () => {
    test('startDeviceSignIn opens a request through the callable', async () => {
      const request = { requestId: 'r1', secret: 's', code: '0471', expiresAt: 1 };
      mockCallable.mockResolvedValueOnce({ data: request });
      const svc = AuthService.getInstance();

      await expect(svc.startDeviceSignIn('a@b.com')).resolves.toEqual(request);
      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'startDeviceSignIn');
      expect(mockCallable).toHaveBeenCalledWith({ email: 'a@b.com' });
    });

    test('claimDeviceSignIn sends the id and secret, never the code', async () => {
      mockCallable.mockResolvedValueOnce({ data: { status: 'pending' } });
      const svc = AuthService.getInstance();

      await expect(
        svc.claimDeviceSignIn({ requestId: 'r1', secret: 's', code: '0471', expiresAt: 1 } as any)
      ).resolves.toEqual({ status: 'pending' });
      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'claimDeviceSignIn');
      expect(mockCallable).toHaveBeenCalledWith({ requestId: 'r1', secret: 's' });
    });

    test('lookUpDeviceSignIn asks the callable for the address of the request', async () => {
      mockCallable.mockResolvedValueOnce({ data: { email: 'a@b.com' } });
      const svc = AuthService.getInstance();

      await expect(svc.lookUpDeviceSignIn('r1')).resolves.toBe('a@b.com');
      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'lookUpDeviceSignIn');
      expect(mockCallable).toHaveBeenCalledWith({ requestId: 'r1' });
    });

    test('signInWithDeviceToken signs in with the token, after setting persistence', async () => {
      const fakeUser = { uid: 'uid-device' };
      localStorage.setItem('pendingEmailSignIn', JSON.stringify({ email: 'a@b.com', rememberMe: true }));
      mockSignInWithCustomToken.mockResolvedValueOnce({ user: fakeUser });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      const svc = AuthService.getInstance();

      const result = await svc.signInWithDeviceToken('tok', true);

      expect(mockSignInWithCustomToken).toHaveBeenCalledWith(mockAuth, 'tok');
      expect(mockSetPersistence).toHaveBeenCalledWith(mockAuth, 'LOCAL');
      expect(mockSetPersistence.mock.invocationCallOrder[0])
        .toBeLessThan(mockSignInWithCustomToken.mock.invocationCallOrder[0]);
      expect(result.user).toBe(fakeUser);
      // The link that was sent is not needed any more on this device.
      expect(svc.getPendingEmailSignIn()).toBeNull();
    });
  });

  describe('signInWithGoogle', () => {
    test('opens the Google popup and reports whether the account is new', async () => {
      const fakeUser = { uid: 'uid-g' };
      mockSignInWithPopup.mockResolvedValueOnce({ user: fakeUser });
      mockGetAdditionalUserInfo.mockReturnValueOnce({ isNewUser: true });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));

      const result = await AuthService.getInstance().signInWithGoogle();

      expect(mockSignInWithPopup).toHaveBeenCalledWith(mockAuth, expect.objectContaining({ providerId: 'google.com' }));
      expect(result).toEqual({ user: fakeUser, isNewUser: true });
    });

    test('always shows the account picker, pre-selecting a hinted address', async () => {
      mockSignInWithPopup.mockResolvedValueOnce({ user: { uid: 'u' } });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(false));
      await AuthService.getInstance().signInWithGoogle(false, 'frodo@gmail.com');
      expect(mockSetCustomParameters).toHaveBeenCalledWith({ prompt: 'select_account', login_hint: 'frodo@gmail.com' });
    });

    test('propagates a refusal', async () => {
      mockSignInWithPopup.mockRejectedValueOnce(new Error('popup closed'));
      await expect(AuthService.getInstance().signInWithGoogle()).rejects.toThrow('popup closed');
    });
  });

  describe('after any sign-in', () => {
    const signInExisting = async (profile: Record<string, any> | null, rememberMe = false) => {
      mockSignInWithPopup.mockResolvedValueOnce({ user: { uid: 'uid-1' } });
      mockGetAdditionalUserInfo.mockReturnValueOnce({ isNewUser: profile === null });
      mockGetDoc.mockResolvedValueOnce(profile ? makeDocSnapshot(true, profile) : makeDocSnapshot(false));
      const svc = AuthService.getInstance();
      await svc.signInWithGoogle(rememberMe);
      return svc;
    };

    test('stores sessionInfo with the chosen duration', async () => {
      await signInExisting({ groups: [] }, true);
      const stored = JSON.parse(localStorage.getItem('sessionInfo')!);
      expect(stored.rememberMe).toBe(true);
      expect(stored.expiresAt - stored.createdAt).toBe(REMEMBER_ME_DURATION);
    });

    test('records the last login on an existing profile', async () => {
      await signInExisting({ groups: [] });
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/uid-1' }),
        { lastLogin: expect.any(Date) }
      );
    });

    test('sets the active group and campaign from the profile', async () => {
      mockGetGroupUserProfile.mockResolvedValueOnce({ activeCampaignId: 'camp-1' });
      const svc = await signInExisting({ activeGroupId: 'group-1' });
      expect(svc.getActiveGroupId()).toBe('group-1');
      expect(svc.getActiveCampaignId()).toBe('camp-1');
    });

    // PERF-02: the two used to run one after the other before the sign-in
    // page could move on, although neither needs the other's answer.
    test('asks for the group profile without waiting for the last-login write', async () => {
      let finishWrite!: () => void;
      mockUpdateDoc.mockReturnValueOnce(new Promise<void>(resolve => { finishWrite = resolve; }));
      mockGetGroupUserProfile.mockResolvedValueOnce({ activeCampaignId: 'camp-1' });
      mockSignInWithPopup.mockResolvedValueOnce({ user: { uid: 'uid-1' } });
      mockGetAdditionalUserInfo.mockReturnValueOnce({ isNewUser: false });
      mockGetDoc.mockResolvedValueOnce(makeDocSnapshot(true, { activeGroupId: 'group-1' }));

      const svc = AuthService.getInstance();
      const signingIn = svc.signInWithGoogle(false);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockGetGroupUserProfile).toHaveBeenCalledWith('group-1', 'uid-1');
      finishWrite();
      await signingIn;
      expect(svc.getActiveCampaignId()).toBe('camp-1');
    });

    test('writes nothing for a brand-new account, which has no profile yet', async () => {
      await signInExisting(null);
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('linkGoogle', () => {
    test('links Google to the signed-in user', async () => {
      const current = { uid: 'uid-1', email: 'a@b.com' };
      mockAuth.currentUser = current;
      mockLinkWithPopup.mockResolvedValueOnce({ user: current });
      await AuthService.getInstance().linkGoogle();
      expect(mockLinkWithPopup).toHaveBeenCalledWith(current, expect.objectContaining({ providerId: 'google.com' }));
    });

    test('refuses when nobody is signed in', async () => {
      await expect(AuthService.getInstance().linkGoogle()).rejects.toThrow('No authenticated user');
    });
  });

  describe('getSignInMethods', () => {
    test('is empty when nobody is signed in', () => {
      expect(AuthService.getInstance().getSignInMethods()).toEqual([]);
    });

    test('names the password provider as the email, and orders it first', () => {
      mockAuth.currentUser = {
        uid: 'u',
        providerData: [{ providerId: 'google.com' }, { providerId: 'password' }],
      };
      expect(AuthService.getInstance().getSignInMethods()).toEqual(['email', 'google']);
    });
  });

  describe('deleteFreshAccount', () => {
    test('deletes the signed-in user', async () => {
      const current = { uid: 'uid-1' };
      mockAuth.currentUser = current;
      mockDeleteUser.mockResolvedValueOnce(undefined);
      await AuthService.getInstance().deleteFreshAccount();
      expect(mockDeleteUser).toHaveBeenCalledWith(current);
    });

    test('does nothing when nobody is signed in', async () => {
      await AuthService.getInstance().deleteFreshAccount();
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });
  });
});

export {};
