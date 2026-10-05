// functions/src/imageMaintenance/sweepReleasedImages.ts
import * as admin from "firebase-admin";
import type {File} from "@google-cloud/storage";
import {imageBucket} from "../shared/imageBucket";
import {deleteWithin, MIN_AGE_MS, PENDING_LEASE_MS} from "./shared";

/** How much one run may do. */
export interface LedgerSweepLimits {
  /** Ledger entries read per Firestore request. */
  pageSize: number;
  /**
   * Entries one run may judge. A larger backlog is left for the following
   * runs: a judged entry is deleted or, while its document still points at
   * the file, kept for at most the lease.
   */
  maxEntries: number;
  /** Deletes in flight at once. */
  concurrency: number;
}

const DEFAULT_LIMITS: LedgerSweepLimits = {
  pageSize: 500,
  maxEntries: 2000,
  concurrency: 10,
};

/** What one ledger sweep did, for the log and for tests. */
export interface LedgerSweepResult {
  /** How many entries were judged against their document. */
  checked: number;
  /** Image files deleted. */
  deleted: string[];
  /** Files whose delete failed; their entries stay for the next run. */
  failed: string[];
  /** Entries deleted, with or without their file. */
  cleared: number;
  /** The run stopped at its budget; the next one carries on. */
  more: boolean;
}

/** Where an image path's reference lives: one document, one field. */
interface Owner {
  doc: string;
  field: "image" | "banner" | "crest";
}

/**
 * The document and field that point at `path`, read from the path itself: an
 * image's folder mirrors its owner's Firestore path (see `entityImagePrefix`
 * and its siblings in the web app's `ImageStorageService`).
 *
 * @param {string} path An object path
 * @return {Owner | null} Its owner, or null for a path in no image layout
 */
export function ownerOf(path: string): Owner | null {
  const entity =
    /^(groups\/[^/]+\/campaigns\/[^/]+\/(?:npcs|locations)\/[^/]+)\/[^/]+$/;
  let match = entity.exec(path);
  if (match) return {doc: match[1], field: "image"};
  match = /^(groups\/[^/]+\/campaigns\/[^/]+)\/banner\/[^/]+$/.exec(path);
  if (match) return {doc: match[1], field: "banner"};
  match = /^(groups\/[^/]+)\/crest\/[^/]+$/.exec(path);
  if (match) return {doc: match[1], field: "crest"};
  return null;
}

/** A ledger entry the sweep is about to judge. */
interface Candidate {
  entry: admin.firestore.DocumentReference;
  path: string;
  /** How long the entry has existed, or Infinity when it cannot be dated. */
  age: number;
}

/**
 * Reads a collection group a page at a time, in document-name order, handing
 * each page to `visit` until it returns false or the group ends. Ordered by
 * name, which needs no index.
 *
 * @param {string} ledger The collection group
 * @param {number} pageSize Entries per request
 * @param {Function} visit Called with each page; false stops the reading
 * @return {Promise<boolean>} False if `visit` stopped it early
 */
async function forEachEntryPage(
  ledger: string,
  pageSize: number,
  visit: (entries: admin.firestore.QueryDocumentSnapshot[]) => boolean
): Promise<boolean> {
  const base = admin.firestore().collectionGroup(ledger)
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(pageSize);
  let last: admin.firestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    const page = await (last ? base.startAfter(last) : base).get();
    if (page.empty) return true;
    if (!visit(page.docs)) return false;
    if (page.size < pageSize) return true;
    last = page.docs[page.docs.length - 1];
  }
}

/**
 * The age of a ledger entry from its server-stamped `createdAt`.
 *
 * @param {object} entry The entry
 * @param {Date} now The time the sweep treats as now
 * @return {number} Milliseconds, or Infinity when it cannot be dated
 */
function ageOf(
  entry: admin.firestore.QueryDocumentSnapshot,
  now: Date
): number {
  const createdAt =
    entry.get("createdAt") as admin.firestore.Timestamp | undefined;
  return createdAt?.toMillis ? now.getTime() - createdAt.toMillis() : Infinity;
}

/**
 * The DAILY image sweep (T084): judges the files the two ledgers name, one
 * document read each, instead of reading every document and listing the bucket.
 *
 * - `releasedImages`: the client records a file before the write that stops a
 *   document pointing at it, and clears the entry once it has deleted the file
 *   itself. An entry still here after a day means that delete never ran or
 *   failed. If the document no longer points at the file, the file and the
 *   entry go. If it still does, the write that would have dropped it failed
 *   (or is still queued in an offline tab): the file stays, and so does the
 *   entry until the lease is over.
 * - `pendingUploads` whose lease is over: an upload whose document write never
 *   landed, unless the client's own clean-up of the entry is what failed. The
 *   same judgement, once.
 *
 * A file a live upload entry still names is never deleted: a document write
 * pointing at it may still land. A path in no image layout is not the sweep's
 * to judge; its entry is dropped and the file left alone. What neither
 * ledger names is the monthly full sweep's (`sweepOrphanedImages`).
 *
 * @param {Date} now The time the sweep treats as now
 * @param {Partial<LedgerSweepLimits>} limits Overrides for the run's bounds
 * @return {Promise<LedgerSweepResult>} What was judged and deleted
 */
export async function sweepReleasedImages(
  now: Date = new Date(),
  limits: Partial<LedgerSweepLimits> = {}
): Promise<LedgerSweepResult> {
  const {pageSize, maxEntries, concurrency} = {...DEFAULT_LIMITS, ...limits};
  const db = admin.firestore();

  // Live upload entries hold their files; expired ones are candidates.
  const held = new Set<string>();
  const candidates: Candidate[] = [];
  /**
   * Queue an entry for judging.
   *
   * @param {object} entry The ledger entry
   * @param {number} age Its age
   * @return {boolean} False once the budget is spent
   */
  const consider = (
    entry: admin.firestore.QueryDocumentSnapshot,
    age: number
  ): boolean => {
    if (candidates.length >= maxEntries) return false;
    const path = entry.get("path");
    candidates.push({
      entry: entry.ref,
      path: typeof path === "string" ? path : "",
      age,
    });
    return true;
  };

  // Every upload entry is read, whatever the budget: a file a live one holds
  // must never be deleted, so the held set has to be whole.
  let more = false;
  await forEachEntryPage("pendingUploads", pageSize, (entries) => {
    for (const entry of entries) {
      const path = entry.get("path");
      const age = ageOf(entry, now);
      if (typeof path === "string" && age < PENDING_LEASE_MS) held.add(path);
      else if (!consider(entry, age)) more = true;
    }
    return true;
  });
  if (!more) {
    more = !(await forEachEntryPage("releasedImages", pageSize, (entries) => {
      for (const entry of entries) {
        const age = ageOf(entry, now);
        // Under a day old: the client's own delete is probably still running.
        if (age >= MIN_AGE_MS && !consider(entry, age)) return false;
      }
      return true;
    }));
  }

  // One document read per candidate, in batches.
  const owners = candidates.map((candidate) => ownerOf(candidate.path));
  const ownerRefs = owners.map((owner) => (owner ? db.doc(owner.doc) : null));
  const snapshots = new Map<string, admin.firestore.DocumentSnapshot>();
  const unique = [...new Map(
    ownerRefs
      .filter((ref): ref is admin.firestore.DocumentReference => ref !== null)
      .map((ref) => [ref.path, ref])
  ).values()];
  for (let i = 0; i < unique.length; i += 100) {
    const read = await db.getAll(...unique.slice(i, i + 100));
    read.forEach((snapshot) => snapshots.set(snapshot.ref.path, snapshot));
  }

  const toDelete: Candidate[] = [];
  const toClear: admin.firestore.DocumentReference[] = [];
  candidates.forEach((candidate, i) => {
    const owner = owners[i];
    if (!owner) {
      toClear.push(candidate.entry);
      return;
    }
    if (held.has(candidate.path)) return;
    const snapshot = snapshots.get(owner.doc);
    const value = snapshot?.exists ? snapshot.get(owner.field) : null;
    const pointsAt = (value as {path?: unknown} | null | undefined)?.path;
    const referenced = pointsAt === candidate.path;
    if (!referenced) {
      toDelete.push(candidate);
    } else if (candidate.age >= PENDING_LEASE_MS) {
      toClear.push(candidate.entry);
    }
  });

  const files: File[] =
    toDelete.map((candidate) => imageBucket().file(candidate.path));
  const outcomes = await deleteWithin(files, concurrency);
  const result: LedgerSweepResult = {
    checked: candidates.length,
    deleted: [],
    failed: [],
    cleared: 0,
    more,
  };
  outcomes.forEach((outcome, i) => {
    const {path, entry} = toDelete[i];
    if (!outcome.failed) {
      result.deleted.push(path);
      toClear.push(entry);
    } else {
      result.failed.push(path);
      console.error(`Could not delete released image ${path}:`, outcome.reason);
    }
  });

  // Firestore commits at most 500 writes in one batch.
  for (let i = 0; i < toClear.length; i += 500) {
    const batch = db.batch();
    toClear.slice(i, i + 500).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
  result.cleared = toClear.length;
  return result;
}
