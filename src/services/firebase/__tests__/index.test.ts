// src/services/firebase/__tests__/index.test.ts

/**
 * Tests for the firebase/index.ts barrel module.
 *
 * index.ts calls initializeFirebaseServices() at module load time,
 * registering all services into ServiceRegistry.  We verify that:
 * - The default export has the expected service shapes
 * - Named exports are also present
 * - firebaseConfig is re-exported
 *
 * Heavy Firebase SDK calls are fully mocked.
 */

// ─── Shared mock objects ──────────────────────────────────────────────────────

const mockAuthInstance = { getAuth: jest.fn() };
const mockDbInstance = {};
const mockFunctionsInstance = {};
const mockAppInstance = {};

// Firestore mocks needed by DocumentService
const mockGetDoc = jest.fn();
const mockDoc = jest.fn((_db: any, ...segs: string[]) => ({ path: segs.join('/'), id: segs[segs.length - 1] || 'id' }));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => mockAppInstance) }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: { uid: 'init-user' } })),
  connectAuthEmulator: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => mockDbInstance),
  connectFirestoreEmulator: jest.fn(),
  doc: function() { return (mockDoc as Function).apply(null, arguments); },
  getDoc: function() { return (mockGetDoc as Function).apply(null, arguments); },
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(() => ({})),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(() => ({ set: jest.fn(), update: jest.fn(), delete: jest.fn(), commit: jest.fn() })),
  runTransaction: jest.fn(),
}));
jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => mockFunctionsInstance),
  connectFunctionsEmulator: jest.fn(),
  httpsCallable: jest.fn(),
}));

jest.mock('../config/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'index-test', projectId: 'index-project' },
  useEmulators: false,
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
}));

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('firebase/index', () => {
  let firebaseServices: typeof import('../index').default;
  let indexModule: typeof import('../index');

  beforeEach(() => {
    jest.resetModules();

    // Reapply mocks
    jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => mockAppInstance) }));
    jest.doMock('firebase/auth', () => ({
      getAuth: jest.fn(() => ({ currentUser: { uid: 'init-user' } })),
      connectAuthEmulator: jest.fn(),
    }));
    jest.doMock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => mockDbInstance),
      connectFirestoreEmulator: jest.fn(),
      doc: function() { return (mockDoc as Function).apply(null, arguments); },
      getDoc: function() { return (mockGetDoc as Function).apply(null, arguments); },
      updateDoc: jest.fn(),
      setDoc: jest.fn(),
      collection: jest.fn(() => ({})),
      getDocs: jest.fn(),
      query: jest.fn(),
      where: jest.fn(),
      deleteDoc: jest.fn(),
      writeBatch: jest.fn(() => ({ set: jest.fn(), update: jest.fn(), delete: jest.fn(), commit: jest.fn() })),
      runTransaction: jest.fn(),
    }));
    jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
    jest.doMock('firebase/functions', () => ({
      getFunctions: jest.fn(() => mockFunctionsInstance),
      connectFunctionsEmulator: jest.fn(),
      httpsCallable: jest.fn(),
    }));
    jest.doMock('../config/firebaseConfig', () => ({
      firebaseConfig: { apiKey: 'index-test', projectId: 'index-project' },
      useEmulators: false,
      emulatorHost: 'localhost',
      emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
    }));

    indexModule = require('../index');
    firebaseServices = indexModule.default;
  });

  // ─── Default export shape ─────────────────────────────────────────────────

  describe('default export (firebaseServices)', () => {
    test('should have an auth property', () => {
      expect(firebaseServices).toHaveProperty('auth');
    });

    test('should have a user property', () => {
      expect(firebaseServices).toHaveProperty('user');
    });

    test('should have a group property', () => {
      expect(firebaseServices).toHaveProperty('group');
    });

    test('should have an invitation property', () => {
      expect(firebaseServices).toHaveProperty('invitation');
    });

    test('should have a campaign property', () => {
      expect(firebaseServices).toHaveProperty('campaign');
    });

    test('should have a document property', () => {
      expect(firebaseServices).toHaveProperty('document');
    });
  });

  // ─── Named exports ────────────────────────────────────────────────────────

  describe('named exports', () => {
    test('should re-export firebaseConfig', () => {
      expect(indexModule.firebaseConfig).toBeDefined();
      expect(indexModule.firebaseConfig.apiKey).toBe('index-test');
    });

    test('should export auth as named export', () => {
      expect(indexModule.auth).toBeDefined();
    });

    test('should export user as named export', () => {
      expect(indexModule.user).toBeDefined();
    });

    test('should export group as named export', () => {
      expect(indexModule.group).toBeDefined();
    });

    test('should export invitation as named export', () => {
      expect(indexModule.invitation).toBeDefined();
    });

    test('should export campaign as named export', () => {
      expect(indexModule.campaign).toBeDefined();
    });

    test('should export document as named export', () => {
      expect(indexModule.document).toBeDefined();
    });
  });

  // ─── Service identity ─────────────────────────────────────────────────────

  describe('service identity', () => {
    test('named auth export should be same object as firebaseServices.auth', () => {
      expect(indexModule.auth).toBe(firebaseServices.auth);
    });

    test('named user export should be same object as firebaseServices.user', () => {
      expect(indexModule.user).toBe(firebaseServices.user);
    });

    test('named group export should be same object as firebaseServices.group', () => {
      expect(indexModule.group).toBe(firebaseServices.group);
    });
  });
});
