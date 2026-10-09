// src/core/services/firebase/core/__tests__/groupProfileCache.test.ts

/**
 * The group-profile cache shared by the Firebase services (T032).
 *
 * Attribution on every write used to read `groups/{g}/users/{uid}` again.
 * Now it is read once and reused for a few minutes; writing the profile, or
 * signing out, drops it. Callers that act on the profile's state -- sign-in's
 * restore reads `activeCampaignId` from it -- still get a real read, but two
 * identical reads in flight at once share one request.
 */

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();

const PROFILE_PATH = 'groups/g1/users/uid-1';

/** A profile document as Firestore returns it. */
const profileSnapshot = (username: string) => ({
  exists: () => true,
  data: () => ({ username, activeCharacterId: null, characters: [] }),
  id: 'uid-1',
});

/** How many times the profile document was read. */
const profileReads = () =>
  mockGetDoc.mock.calls.filter(([ref]) => ref.path === PROFILE_PATH).length;

let DocumentService: typeof import('../../data/DocumentService').default;
let UserService: typeof import('../../user/UserService').default;

beforeEach(() => {
  jest.resetModules();
  jest.useRealTimers();
  [mockGetDoc, mockSetDoc, mockUpdateDoc].forEach(m => m.mockReset());
  mockSetDoc.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
  mockGetDoc.mockResolvedValue(profileSnapshot('Aragorn'));

  jest.doMock('firebase/firestore', () => ({
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    getFirestore: jest.fn(() => ({})),
    initializeFirestore: jest.fn(() => ({})),
    memoryLocalCache: jest.fn(),
    clearIndexedDbPersistence: jest.fn(() => Promise.resolve()),
    persistentLocalCache: jest.fn(),
    persistentMultipleTabManager: jest.fn(),
    connectFirestoreEmulator: jest.fn(),
    collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
    doc: (parent: { path?: string }, ...segments: string[]) => ({
      path: parent && parent.path ? [parent.path, ...segments].join('/') : segments.join('/'),
    }),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
    runTransaction: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    writeBatch: jest.fn(),
    onSnapshot: jest.fn(),
  }));
  jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
  jest.doMock('firebase/auth', () => ({
    getAuth: jest.fn(() => ({ currentUser: { uid: 'uid-1' } })),
    connectAuthEmulator: jest.fn(),
  }));
  jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
  jest.doMock('firebase/functions', () => ({
    getFunctions: jest.fn(() => ({})),
    connectFunctionsEmulator: jest.fn(),
    httpsCallable: jest.fn(),
  }));
  jest.doMock('firebase/storage', () => ({
    getStorage: jest.fn(() => ({})),
    connectStorageEmulator: jest.fn(),
  }));
  jest.doMock('../../config/firebaseConfig', () => ({
    firebaseConfig: { apiKey: 'test', projectId: 'test' },
    useEmulators: false,
    emulatorHost: 'localhost',
    emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001', storage: '9199' },
  }));

  DocumentService = require('../../data/DocumentService').default;
  UserService = require('../../user/UserService').default;
  const documents = DocumentService.getInstance();
  documents.setActiveGroup('g1');
  documents.setActiveCampaign('c1');
});

/** Creates a document with a generated id, which stamps creation attribution. */
const create = () => DocumentService.getInstance().createDocument('npcs', { name: 'Beorn' });

/** The username the last `setDoc` stamped. */
const lastStampedUsername = () => mockSetDoc.mock.calls[mockSetDoc.mock.calls.length - 1][1].createdByUsername;

describe('group profile cache', () => {
  test('writes in a row read the profile once', async () => {
    await create();
    await create();
    await DocumentService.getInstance().updateDocumentWithAttribution('npcs', 'beorn', { name: 'Beorn' });

    expect(profileReads()).toBe(1);
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    expect(lastStampedUsername()).toBe('Aragorn');
  });

  test('a profile read during restore serves the first write too', async () => {
    await UserService.getInstance().getGroupUserProfile('g1', 'uid-1');
    await create();

    expect(profileReads()).toBe(1);
  });

  test('writing the profile makes the next write read it again', async () => {
    await create();
    mockGetDoc.mockResolvedValue(profileSnapshot('Strider'));

    await UserService.getInstance().updateGroupUserProfile('g1', 'uid-1', { username: 'Strider' } as any);
    await create();

    expect(profileReads()).toBe(2);
    expect(lastStampedUsername()).toBe('Strider');
  });

  test('a cached profile expires', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await create();

    now.mockReturnValue(1_000_000 + DocumentService.GROUP_PROFILE_TTL_MS + 1);
    await create();

    expect(profileReads()).toBe(2);
    now.mockRestore();
  });

  test('forgetting every profile (sign-out) makes the next write read again', async () => {
    await create();
    DocumentService.getInstance().forgetGroupProfile();
    await create();

    expect(profileReads()).toBe(2);
  });

  test('getGroupUserProfile always reads, so restore never acts on a stale profile', async () => {
    const users = UserService.getInstance();
    await users.getGroupUserProfile('g1', 'uid-1');
    await users.getGroupUserProfile('g1', 'uid-1');

    expect(profileReads()).toBe(2);
  });

  test('two reads in flight at once share one request', async () => {
    const users = UserService.getInstance();
    const [first, second] = await Promise.all([
      users.getGroupUserProfile('g1', 'uid-1'),
      users.getGroupUserProfile('g1', 'uid-1'),
    ]);

    expect(profileReads()).toBe(1);
    expect(first?.username).toBe('Aragorn');
    expect(second?.username).toBe('Aragorn');
  });

  test('a read that was out when the profile was written is not cached', async () => {
    let finishRead: (snapshot: unknown) => void = () => undefined;
    mockGetDoc.mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));

    const users = UserService.getInstance();
    const staleRead = users.getGroupUserProfile('g1', 'uid-1');
    await users.updateGroupUserProfile('g1', 'uid-1', { username: 'Strider' } as any);
    finishRead(profileSnapshot('Aragorn'));
    await staleRead;

    mockGetDoc.mockResolvedValue(profileSnapshot('Strider'));
    await create();

    expect(profileReads()).toBe(2);
    expect(lastStampedUsername()).toBe('Strider');
  });

  test('names shown beside content come from the cache: one read for many lookups (PERF-09)', async () => {
    const users = UserService.getInstance();
    await users.getCachedGroupUserProfile('g1', 'uid-1');
    const again = await users.getCachedGroupUserProfile('g1', 'uid-1');
    await create();

    expect(profileReads()).toBe(1);
    expect(again?.username).toBe('Aragorn');
    expect(again?.userId).toBe('uid-1');
  });

  test('a display lookup after a profile edit sees the edit', async () => {
    const users = UserService.getInstance();
    await users.getCachedGroupUserProfile('g1', 'uid-1');
    mockGetDoc.mockResolvedValue(profileSnapshot('Strider'));
    await users.updateGroupUserProfile('g1', 'uid-1', { username: 'Strider' } as any);

    expect((await users.getCachedGroupUserProfile('g1', 'uid-1'))?.username).toBe('Strider');
  });

  test('a user with no profile in the group still cannot write', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined, id: 'uid-1' });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(create()).rejects.toThrow('User profile not found');
  });
});
