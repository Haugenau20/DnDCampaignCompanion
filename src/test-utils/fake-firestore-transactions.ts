// src/test-utils/fake-firestore-transactions.ts
//
// An in-memory stand-in for Firestore's `runTransaction`, for service tests
// that mock `firebase/firestore`. It keeps the one property a transaction
// exists for, which a fake that checks and inserts in one synchronous step
// would hand the code for free (TEST-001): a transaction remembers what it
// read, and if any of those documents changed before it commits, Firestore
// runs the whole function again. Measured against the emulator on 2026-10-04:
// two transactions that both read a missing document and then create it end
// with one created and the other re-run, seeing the document, and refusing.
//
// Documents are keyed by the `path` of whatever reference the test's `doc`
// mock returns.

/** A reference as the services' mocked `doc()` returns it. */
interface FakeRef {
  path: string;
  id?: string;
}

/** A stored document, versioned so a commit can tell it changed. */
interface StoredDoc {
  data: Record<string, any>;
  version: number;
}

/** What `transaction.get` resolves to: the parts of a snapshot services read. */
export interface FakeSnapshot {
  id: string;
  exists: () => boolean;
  data: () => Record<string, any> | undefined;
}

/** Options for {@link createFakeFirestore}. */
export interface FakeFirestoreOptions {
  /**
   * Runs after every transactional read, before the function goes on. Return
   * a promise to hold a transaction there -- e.g. at a barrier until a rival
   * has read too. `attempt` counts from 1; retries are attempts 2 and up.
   */
  afterRead?: (path: string, attempt: number) => Promise<void> | void;
}

/** Firestore's own limit on how often a transaction is attempted. */
const MAX_ATTEMPTS = 5;

/**
 * Creates an empty fake store and its `runTransaction`.
 *
 * @returns `runTransaction` to put in the `firebase/firestore` mock, plus
 *   `seed` and `read` to arrange and inspect the stored documents.
 */
export function createFakeFirestore(options: FakeFirestoreOptions = {}) {
  const docs = new Map<string, StoredDoc>();
  let nextVersion = 1;

  const versionOf = (path: string): number => docs.get(path)?.version ?? 0;

  const snapshot = (ref: FakeRef): FakeSnapshot => {
    const stored = docs.get(ref.path);
    return {
      id: ref.id ?? ref.path.split("/").pop()!,
      exists: () => stored !== undefined,
      data: () => (stored ? { ...stored.data } : undefined),
    };
  };

  /**
   * Runs `fn` as a Firestore transaction: reads are recorded, writes are
   * buffered, and the commit applies them only if nothing read has changed
   * since -- otherwise `fn` runs again, up to Firestore's limit.
   */
  async function runTransaction<T>(_db: unknown, fn: (transaction: any) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const reads = new Map<string, number>();
      // `merge` marks an `update`: applied over what is stored at commit, and
      // refused if nothing is, as Firestore refuses an update of a missing
      // document.
      const writes = new Map<string, { data: Record<string, any>; merge: boolean } | null>();
      const transaction = {
        get: async (ref: FakeRef) => {
          reads.set(ref.path, versionOf(ref.path));
          const result = snapshot(ref);
          await options.afterRead?.(ref.path, attempt);
          return result;
        },
        set: (ref: FakeRef, data: Record<string, any>) => {
          writes.set(ref.path, { data: { ...data }, merge: false });
          return transaction;
        },
        update: (ref: FakeRef, data: Record<string, any>) => {
          writes.set(ref.path, { data: { ...data }, merge: true });
          return transaction;
        },
        delete: (ref: FakeRef) => {
          writes.set(ref.path, null);
          return transaction;
        },
      };

      const result = await fn(transaction);

      const unchanged = Array.from(reads).every(([path, version]) => versionOf(path) === version);
      if (!unchanged) continue;

      const missing = Array.from(writes).find(([path, write]) => write?.merge && !docs.has(path));
      if (missing) throw new Error(`No document to update: ${missing[0]}`);

      for (const [path, write] of Array.from(writes)) {
        if (write === null) docs.delete(path);
        else {
          const data = write.merge ? { ...docs.get(path)!.data, ...write.data } : write.data;
          docs.set(path, { data, version: nextVersion++ });
        }
      }
      return result;
    }
    throw new Error("Transaction failed: too much contention");
  }

  /** A plain `getDoc`: reads the store, outside any transaction. */
  async function getDoc(ref: FakeRef): Promise<FakeSnapshot> {
    const result = snapshot(ref);
    await options.afterRead?.(ref.path, 1);
    return result;
  }

  /** A plain `setDoc`: an unconditional overwrite, as Firestore's is. */
  async function setDoc(ref: FakeRef, data: Record<string, any>): Promise<void> {
    docs.set(ref.path, { data: { ...data }, version: nextVersion++ });
  }

  return {
    runTransaction,
    getDoc,
    setDoc,
    /** Stores a document as if some earlier write had put it there. */
    seed: (path: string, data: Record<string, any>) => {
      docs.set(path, { data: { ...data }, version: nextVersion++ });
    },
    /** The stored document at `path`, or `undefined`. */
    read: (path: string): Record<string, any> | undefined => {
      const stored = docs.get(path);
      return stored ? { ...stored.data } : undefined;
    },
    /** Every stored path, for asserting what a create left behind. */
    paths: (): string[] => Array.from(docs.keys()),
  };
}

/**
 * A barrier for `afterRead`: holds each first-attempt read of `path` until
 * `count` of them have arrived, so every rival reads before any of them
 * writes. Reads of other paths pass straight through.
 */
export function readBarrier(count: number, path: string) {
  let arrived = 0;
  let release!: () => void;
  const open = new Promise<void>((resolve) => {
    release = resolve;
  });
  return (readPath: string, attempt: number): Promise<void> | void => {
    if (readPath !== path || attempt !== 1) return;
    arrived += 1;
    if (arrived === count) release();
    return open;
  };
}
