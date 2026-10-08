// src/core/services/firebase/core/__tests__/firestoreCache.test.ts

/**
 * Which local cache Firestore gets (T130), and when it is cleared.
 *
 * Requirements:
 * - Only a session the user asked to keep ("keep me signed in") caches campaign
 *   data across visits. Any other session must leave nothing in the browser.
 * - A cache left behind by an earlier remembered session is deleted once the
 *   browser no longer holds a remembered session.
 * - When the signed-in user signs out (in any tab), the cache is deleted and
 *   the page reloads, since a terminated Firestore cannot be used again.
 */

import type { Auth, User } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
import type { Firestore } from "firebase/firestore";
import {
  clearCacheOnSignOut,
  isRememberedSession,
  openFirestore,
} from "../firestoreCache";

const mockInitializeFirestore = jest.fn((_app: unknown, _settings: unknown) => ({ id: "db" }));
const mockPersistentLocalCache = jest.fn((settings: unknown) => ({ kind: "persistent", settings }));
const mockPersistentMultipleTabManager = jest.fn(() => ({ kind: "multi-tab" }));
const mockMemoryLocalCache = jest.fn(() => ({ kind: "memory" }));
const mockClearIndexedDbPersistence = jest.fn((_db: unknown) => Promise.resolve());
const mockTerminate = jest.fn((_db: unknown) => Promise.resolve());

jest.mock("firebase/firestore", () => ({
  initializeFirestore: (app: unknown, settings: unknown) => mockInitializeFirestore(app, settings),
  persistentLocalCache: (settings: unknown) => mockPersistentLocalCache(settings),
  persistentMultipleTabManager: () => mockPersistentMultipleTabManager(),
  memoryLocalCache: () => mockMemoryLocalCache(),
  clearIndexedDbPersistence: (db: unknown) => mockClearIndexedDbPersistence(db),
  terminate: (db: unknown) => mockTerminate(db),
}));

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const session = (fields: Record<string, unknown>): string =>
  JSON.stringify({ createdAt: NOW - DAY, expiresAt: NOW + DAY, ...fields });

/** A stand-in for Auth whose state changes the test drives. */
function fakeAuth() {
  let listener: ((user: User | null) => void) | null = null;
  const onAuthStateChanged = jest.fn((_auth: Auth, cb: (user: User | null) => void) => {
    listener = cb;
    return jest.fn();
  });
  return {
    auth: {} as Auth,
    onAuthStateChanged,
    emit: (user: User | null) => listener?.(user),
  };
}

const someone = { uid: "u1" } as User;

/** Let the promise chain started by a sign-out run to the end. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isRememberedSession", () => {
  it("is true for a session the user asked to keep, while it lasts", () => {
    expect(isRememberedSession(session({ rememberMe: true }), NOW)).toBe(true);
  });

  it("is false when nobody has signed in on this browser", () => {
    expect(isRememberedSession(null, NOW)).toBe(false);
  });

  it("is false for a session that ends with the browser", () => {
    expect(isRememberedSession(session({ rememberMe: false }), NOW)).toBe(false);
    expect(isRememberedSession(session({}), NOW)).toBe(false);
  });

  it("is false once a remembered session has run out", () => {
    expect(isRememberedSession(session({ rememberMe: true, expiresAt: NOW - 1 }), NOW)).toBe(false);
  });

  it("is false for a record it cannot read", () => {
    expect(isRememberedSession("{not json", NOW)).toBe(false);
    expect(isRememberedSession("null", NOW)).toBe(false);
  });
});

describe("openFirestore", () => {
  const app = { name: "app" } as unknown as FirebaseApp;

  it("keeps a persistent cache, shared between tabs, for a remembered session", () => {
    const db = openFirestore(app, true);

    expect(db).toEqual({ id: "db" });
    expect(mockInitializeFirestore).toHaveBeenCalledWith(app, {
      localCache: { kind: "persistent", settings: { tabManager: { kind: "multi-tab" } } },
    });
    expect(mockClearIndexedDbPersistence).not.toHaveBeenCalled();
  });

  it("keeps data only in memory for any other session", () => {
    openFirestore(app, false);

    expect(mockInitializeFirestore).toHaveBeenCalledWith(app, { localCache: { kind: "memory" } });
    expect(mockPersistentLocalCache).not.toHaveBeenCalled();
  });

  it("deletes a cache an earlier remembered session left behind", () => {
    const db = openFirestore(app, false);

    expect(mockClearIndexedDbPersistence).toHaveBeenCalledWith(db);
  });

  it("still opens Firestore when there was nothing to delete", async () => {
    mockClearIndexedDbPersistence.mockReturnValueOnce(Promise.reject(new Error("no IndexedDB")));

    expect(() => openFirestore(app, false)).not.toThrow();
    await settle();
  });
});

describe("clearCacheOnSignOut", () => {
  const db = { id: "db" } as unknown as Firestore;

  it("deletes the cache and reloads when the signed-in user signs out", async () => {
    const { auth, onAuthStateChanged, emit } = fakeAuth();
    const reload = jest.fn();
    clearCacheOnSignOut(auth, db, reload, onAuthStateChanged);

    emit(someone);
    emit(null);
    await settle();

    expect(mockTerminate).toHaveBeenCalledWith(db);
    expect(mockClearIndexedDbPersistence).toHaveBeenCalledWith(db);
    expect(mockTerminate.mock.invocationCallOrder[0]).toBeLessThan(
      mockClearIndexedDbPersistence.mock.invocationCallOrder[0]
    );
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads even when the cache could not be deleted", async () => {
    mockClearIndexedDbPersistence.mockReturnValueOnce(Promise.reject(new Error("blocked")));
    const { auth, onAuthStateChanged, emit } = fakeAuth();
    const reload = jest.fn();
    clearCacheOnSignOut(auth, db, reload, onAuthStateChanged);

    emit(someone);
    emit(null);
    await settle();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the page opens signed out", async () => {
    const { auth, onAuthStateChanged, emit } = fakeAuth();
    const reload = jest.fn();
    clearCacheOnSignOut(auth, db, reload, onAuthStateChanged);

    emit(null);
    await settle();

    expect(mockTerminate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("does nothing while the user stays signed in", async () => {
    const { auth, onAuthStateChanged, emit } = fakeAuth();
    const reload = jest.fn();
    clearCacheOnSignOut(auth, db, reload, onAuthStateChanged);

    emit(someone);
    emit(someone);
    await settle();

    expect(mockTerminate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
