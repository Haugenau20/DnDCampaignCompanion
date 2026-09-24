// src/core/services/firebase/auth/__tests__/deviceApproval.test.ts
import { openDeviceApproval } from '../deviceApproval';

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
jest.mock('../../config/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test' },
  useEmulators: false,
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSignInWithEmailLink.mockResolvedValue({ user: { uid: 'frodo' } });
  mockCallable.mockResolvedValue({ data: { success: true } });
});

describe('openDeviceApproval', () => {
  // The whole point: the app's own Firebase instance is never used, so this
  // device is not signed in and whoever was signed in here stays so.
  test('signs in on a separate, named app held in memory only', async () => {
    await openDeviceApproval('frodo@shire.dev', 'http://app/auth/link?oobCode=x');

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

  test('approves through the throwaway app\'s own functions', async () => {
    const approval = await openDeviceApproval('frodo@shire.dev', 'link');
    await approval.approve('req-1', '0471');

    expect(mockHttpsCallable).toHaveBeenCalledWith(mockThrowawayFunctions, 'approveDeviceSignIn');
    expect(mockCallable).toHaveBeenCalledWith({ requestId: 'req-1', code: '0471' });
  });

  // The link can be used once; a mistyped code must not cost it.
  test('can approve again after a refusal, on the same sign-in', async () => {
    mockCallable.mockRejectedValueOnce(new Error('That code does not match'));
    const approval = await openDeviceApproval('frodo@shire.dev', 'link');

    await expect(approval.approve('req-1', '0000')).rejects.toThrow('does not match');
    await approval.approve('req-1', '0471');

    expect(mockSignInWithEmailLink).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });

  test('close signs the throwaway out and deletes it, once', async () => {
    const approval = await openDeviceApproval('frodo@shire.dev', 'link');
    await approval.close();
    await approval.close();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith(mockThrowawayAuth);
    expect(mockDeleteApp).toHaveBeenCalledTimes(1);
    expect(mockDeleteApp).toHaveBeenCalledWith(mockThrowawayApp);
  });

  test('deletes the throwaway and rethrows when the link is refused', async () => {
    const refusal = Object.assign(new Error('expired'), { code: 'auth/expired-action-code' });
    mockSignInWithEmailLink.mockRejectedValueOnce(refusal);

    await expect(openDeviceApproval('frodo@shire.dev', 'link')).rejects.toBe(refusal);
    expect(mockDeleteApp).toHaveBeenCalledWith(mockThrowawayApp);
  });
});
