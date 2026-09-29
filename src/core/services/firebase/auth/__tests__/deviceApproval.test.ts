// src/core/services/firebase/auth/__tests__/deviceApproval.test.ts
import { approveDeviceSignIn } from '../deviceApproval';

const mockThrowawayApp = { name: 'throwaway' };
const mockThrowawayAuth = { kind: 'throwaway-auth' };
const mockThrowawayFunctions = { kind: 'throwaway-functions' };

const mockInitializeApp = jest.fn((_config: unknown, _name?: string) => mockThrowawayApp);
const mockDeleteApp = jest.fn((_app: unknown) => Promise.resolve());
const mockInitializeAuth = jest.fn((_app: unknown, _deps: unknown) => mockThrowawayAuth);
const mockSignInWithEmailLink = jest.fn();
const mockSignOut = jest.fn((_auth: unknown) => Promise.resolve());
const mockCallable = jest.fn();
const mockHttpsCallable = jest.fn((_fns: unknown, _name: string) => mockCallable);
const mockAttachAppCheck = jest.fn((_app: unknown) => undefined);
let mockUseEmulators = false;

jest.mock('firebase/app', () => ({
  initializeApp: (config: unknown, name?: string) => mockInitializeApp(config, name),
  deleteApp: (app: unknown) => mockDeleteApp(app),
}));
jest.mock('firebase/auth', () => ({
  initializeAuth: (app: unknown, deps: unknown) => mockInitializeAuth(app, deps),
  inMemoryPersistence: 'MEMORY',
  connectAuthEmulator: jest.fn(),
  signInWithEmailLink: (a: unknown, b: unknown, c: unknown) => mockSignInWithEmailLink(a, b, c),
  signOut: (auth: unknown) => mockSignOut(auth),
}));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => mockThrowawayFunctions),
  connectFunctionsEmulator: jest.fn(),
  httpsCallable: (fns: unknown, name: string) => mockHttpsCallable(fns, name),
}));
jest.mock('../../config/appCheck', () => ({
  attachAppCheck: (app: unknown) => mockAttachAppCheck(app),
}));
jest.mock('../../config/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test' },
  get useEmulators() { return mockUseEmulators; },
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseEmulators = false;
  mockSignInWithEmailLink.mockResolvedValue({ user: { uid: 'frodo' } });
  mockCallable.mockResolvedValue({ data: { code: '482913' } });
});

describe('approveDeviceSignIn', () => {
  // The whole point: the app's own Firebase instance is never used, so this
  // device is not signed in and whoever was signed in here stays so.
  test('signs in on a separate, named app held in memory only', async () => {
    await approveDeviceSignIn('frodo@shire.dev', 'http://app/auth/link?oobCode=x', 'req-1');

    expect(mockInitializeApp).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/^device-approval-/)
    );
    expect(mockInitializeAuth).toHaveBeenCalledWith(mockThrowawayApp, { persistence: 'MEMORY' });
    expect(mockSignInWithEmailLink).toHaveBeenCalledWith(
      mockThrowawayAuth,
      'frodo@shire.dev',
      'http://app/auth/link?oobCode=x'
    );
  });

  // Production enforces App Check on Auth, and the default app's App Check
  // does not cover a second app: without its own, every sign-in here was
  // refused with auth/firebase-app-check-token-is-invalid.
  test('attaches App Check to the throwaway app before signing in', async () => {
    await approveDeviceSignIn('frodo@shire.dev', 'link', 'req-1');

    expect(mockAttachAppCheck).toHaveBeenCalledWith(mockThrowawayApp);
    expect(mockAttachAppCheck.mock.invocationCallOrder[0])
      .toBeLessThan(mockInitializeAuth.mock.invocationCallOrder[0]);
  });

  test('skips App Check against the emulators (bug #1411)', async () => {
    mockUseEmulators = true;
    await approveDeviceSignIn('frodo@shire.dev', 'link', 'req-1');

    expect(mockAttachAppCheck).not.toHaveBeenCalled();
    expect(mockSignInWithEmailLink).toHaveBeenCalled();
  });

  test('approves through the throwaway app\'s own functions, after signing in, and returns the code', async () => {
    await expect(approveDeviceSignIn('frodo@shire.dev', 'link', 'req-1')).resolves.toBe('482913');

    expect(mockHttpsCallable).toHaveBeenCalledWith(mockThrowawayFunctions, 'approveDeviceSignIn');
    expect(mockCallable).toHaveBeenCalledWith({ requestId: 'req-1' });
    expect(mockSignInWithEmailLink.mock.invocationCallOrder[0])
      .toBeLessThan(mockCallable.mock.invocationCallOrder[0]);
  });

  test('signs the throwaway out and deletes it once done', async () => {
    await approveDeviceSignIn('frodo@shire.dev', 'link', 'req-1');

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith(mockThrowawayAuth);
    expect(mockDeleteApp).toHaveBeenCalledTimes(1);
    expect(mockDeleteApp).toHaveBeenCalledWith(mockThrowawayApp);
  });

  test('deletes the throwaway and rethrows when the link is refused, approving nothing', async () => {
    const refusal = Object.assign(new Error('expired'), { code: 'auth/expired-action-code' });
    mockSignInWithEmailLink.mockRejectedValueOnce(refusal);

    await expect(approveDeviceSignIn('frodo@shire.dev', 'link', 'req-1')).rejects.toBe(refusal);
    expect(mockCallable).not.toHaveBeenCalled();
    expect(mockDeleteApp).toHaveBeenCalledWith(mockThrowawayApp);
  });

  test('signs out, deletes the throwaway and rethrows when the approval is refused', async () => {
    const refusal = Object.assign(new Error('This sign-in request has expired.'), { code: 'functions/failed-precondition' });
    mockCallable.mockRejectedValueOnce(refusal);

    await expect(approveDeviceSignIn('frodo@shire.dev', 'link', 'req-1')).rejects.toBe(refusal);
    expect(mockSignOut).toHaveBeenCalledWith(mockThrowawayAuth);
    expect(mockDeleteApp).toHaveBeenCalledWith(mockThrowawayApp);
  });
});
