// src/setupTests.ts
import '@testing-library/jest-dom';
import 'jest-extended';

// Set environment to use emulators for tests
process.env.REACT_APP_USE_EMULATORS = 'true';
process.env.NODE_ENV = 'test';

// Polyfill crypto.randomUUID, which JSDOM does not implement.
// Production code uses it to generate ids (rumor notes, quest conversion,
// QuestFormSections). Without this, those code paths throw
// "crypto.randomUUID is not a function" and the test aborts before reaching
// any assertion — so the behaviour under test was never actually exercised.
// See bug #300. Uses a counter rather than randomness so ids are deterministic
// and assertable; the shape matches a v4 UUID.
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}
if (typeof globalThis.crypto.randomUUID !== 'function') {
  let uuidCounter = 0;
  (globalThis.crypto as any).randomUUID = () => {
    uuidCounter += 1;
    const suffix = uuidCounter.toString(16).padStart(12, '0');
    return `00000000-0000-4000-8000-${suffix}`;
  };
}

// Mock Firebase for unit tests (will be bypassed when using emulator integration tests)
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  writeBatch: jest.fn(),
  connectFirestoreEmulator: jest.fn()
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  connectAuthEmulator: jest.fn()
}));

// Mock console.warn for cleaner test output
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    // Suppress Firebase and React Router warnings in tests
    if (args[0]?.includes('Firebase') || 
        args[0]?.includes('emulator') ||
        args[0]?.includes('React Router Future Flag')) {
      return;
    }
    originalWarn(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});