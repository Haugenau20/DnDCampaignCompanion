// src/core/services/firebase/core/firestoreCache.ts
import type { FirebaseApp } from "firebase/app";
import { onAuthStateChanged, type Auth, type User } from "firebase/auth";
import {
  clearIndexedDbPersistence,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  type Firestore,
} from "firebase/firestore";
import type { StoredSessionInfo } from "../auth/sessionTimeout";

/*
 * Firestore's local cache (T130).
 *
 * With only the memory cache, every page load re-reads every document each
 * listener covers. A persistent cache lets a listener resume from what the
 * browser already holds, so a reload is billed for what changed, not for the
 * whole campaign.
 *
 * But the persistent cache is campaign data left in the browser. So only a
 * session the user asked to keep ("keep me signed in") gets one; on a shared
 * computer, where that box stays unticked, nothing outlives the page. The
 * choice is made when Firestore starts, from the session record the last
 * sign-in left, so a session that becomes remembered starts caching on the
 * next load.
 */

/**
 * Whether the browser holds a remembered session that has not run out.
 *
 * @param stored The raw `localStorage` session record (`SESSION_INFO_KEY`)
 * @param now Epoch millis
 * @returns True when Firestore may keep a persistent cache
 */
export function isRememberedSession(stored: string | null, now: number): boolean {
  if (!stored) return false;
  try {
    const info = JSON.parse(stored) as StoredSessionInfo | null;
    return info?.rememberMe === true && now <= info.expiresAt;
  } catch {
    return false;
  }
}

/**
 * Start Firestore with the cache the session allows.
 *
 * A session that is not remembered also deletes any cache an earlier,
 * remembered one left behind. That runs before the instance is first used,
 * which is the only time besides after `terminate` that the SDK allows it,
 * and the SDK queues it ahead of the first read.
 *
 * @param app The Firebase app
 * @param persist Whether to keep a persistent cache (`isRememberedSession`)
 * @returns The Firestore instance
 */
export function openFirestore(app: FirebaseApp, persist: boolean): Firestore {
  if (persist) {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  clearIndexedDbPersistence(db).catch((err) =>
    console.warn("Could not delete Firestore's cache from an earlier session:", err)
  );
  return db;
}

/**
 * Delete the persistent cache when the signed-in user signs out, then reload.
 *
 * Every tab watches its own auth state, so signing out in one tab clears the
 * cache from all of them. Deleting the cache terminates Firestore in every tab
 * that has it open, and a terminated instance cannot be used again: the page
 * reloads either way, and comes back with the memory cache.
 *
 * @param auth The Auth instance to watch
 * @param db The Firestore instance holding the persistent cache
 * @param reload Reloads the page
 * @param watch Subscribes to auth state; injectable for tests
 * @returns Unsubscribes
 */
export function clearCacheOnSignOut(
  auth: Auth,
  db: Firestore,
  reload: () => void,
  watch: (auth: Auth, next: (user: User | null) => void) => () => void = onAuthStateChanged
): () => void {
  let signedIn = false;
  return watch(auth, (user) => {
    const signedOut = signedIn && !user;
    signedIn = !!user;
    if (!signedOut) return;
    terminate(db)
      .then(() => clearIndexedDbPersistence(db))
      .catch((err) => console.warn("Could not delete Firestore's cache on sign-out:", err))
      .finally(reload);
  });
}
