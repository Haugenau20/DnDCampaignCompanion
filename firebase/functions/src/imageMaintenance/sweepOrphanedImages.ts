// functions/src/imageMaintenance/sweepOrphanedImages.ts
import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import type {File, GetFilesOptions} from "@google-cloud/storage";
import {imageBucket} from "../shared/imageBucket";

/**
 * How old an unreferenced file must be before the sweep deletes it. An upload
 * is written before the document that points at it, so a younger file may be
 * one whose document write is still on its way.
 */
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * The object paths the app writes images to (see the storage images design,
 * §3). Anything else in the bucket -- a path added later -- is not the sweep's
 * to judge, however unreferenced it looks.
 */
const IMAGE_PATH = new RegExp(
  "^groups/[^/]+/(campaigns/[^/]+/((npcs|locations)/[^/]+|banner)|crest)/[^/]+$"
);

/**
 * Where bug-report screenshots are uploaded (T020). No document ever points at
 * one: `sendContactEmail` deletes each once it is mailed, so one still here
 * after a day belongs to a report that was never sent, or whose delete failed.
 */
const SUPPORT_PATH = /^support\/[^/]+\/[^/]+$/;

/**
 * How much one run may do (T084, PERF2-004). The bucket only grows, so a run
 * that listed every file and launched every delete at once would grow with
 * it: memory with the listing, open requests with the backlog.
 */
export interface SweepLimits {
  /** Files listed per Storage request. */
  pageSize: number;
  /**
   * Deletes one run may attempt. A larger backlog is left for the following
   * runs, each of which starts from the front of the bucket again: what was
   * deleted is no longer there to list.
   */
  maxDeletes: number;
  /** Deletes in flight at once. */
  concurrency: number;
}

const DEFAULT_LIMITS: SweepLimits = {
  pageSize: 1000,
  maxDeletes: 2000,
  concurrency: 10,
};

/** What one sweep did, for the log and for tests. */
export interface SweepResult {
  /** How many image and screenshot files were looked at. */
  checked: number;
  /** Paths deleted. */
  deleted: string[];
  /** Paths whose delete failed; the next sweep tries them again. */
  failed: string[];
  /**
   * The run stopped at its delete budget before listing every file, so there
   * may be orphans it did not reach. The next run carries on.
   */
  more: boolean;
}

/**
 * The path of every image a document points at: each NPC's and location's
 * `image`, each campaign's `banner`, and each group's `crest`.
 *
 * Reads every NPC and location rather than querying `image != null`: a filter
 * on a collection group needs a collection-group index, which Firestore does
 * not keep by default, and a missing one would fail the sweep in production
 * only. `select` keeps each read to the one field.
 *
 * @return {Promise<Set<string>>} The referenced object paths
 */
async function referencedPaths(): Promise<Set<string>> {
  const db = admin.firestore();
  const [npcs, locations, campaigns, groups] = await Promise.all([
    db.collectionGroup("npcs").select("image").get(),
    db.collectionGroup("locations").select("image").get(),
    db.collectionGroup("campaigns").select("banner").get(),
    db.collection("groups").select("crest").get(),
  ]);

  const paths = new Set<string>();
  const add = (value: unknown) => {
    const path = (value as {path?: unknown} | null | undefined)?.path;
    if (typeof path === "string") paths.add(path);
  };
  npcs.docs.forEach((doc) => add(doc.get("image")));
  locations.docs.forEach((doc) => add(doc.get("image")));
  campaigns.docs.forEach((doc) => add(doc.get("banner")));
  groups.docs.forEach((doc) => add(doc.get("crest")));
  return paths;
}

/**
 * Whether a file is at least a day old.
 *
 * @param {object} file A bucket file
 * @param {Date} now The time the sweep treats as now
 * @return {boolean} False when the age is unknown
 */
function isOldEnough(
  file: {metadata: {timeCreated?: unknown}},
  now: Date
): boolean {
  const created = Date.parse(String(file.metadata.timeCreated ?? ""));
  // No creation time means the age is unknown: keep it.
  return Number.isFinite(created) && now.getTime() - created >= MIN_AGE_MS;
}

/**
 * Lists the files under `prefix` a page at a time, handing each page to
 * `visit` until it returns false or the listing ends.
 *
 * @param {string} prefix The object path prefix
 * @param {number} pageSize Files per request
 * @param {Function} visit Called with each page; false stops the listing
 * @return {Promise<boolean>} False if `visit` stopped it early
 */
async function forEachPage(
  prefix: string,
  pageSize: number,
  visit: (files: File[]) => boolean
): Promise<boolean> {
  let query: GetFilesOptions | undefined = {
    prefix,
    maxResults: pageSize,
    autoPaginate: false,
  };
  while (query) {
    const [files, next] = await imageBucket().getFiles(query);
    if (!visit(files)) return false;
    query = next as GetFilesOptions | undefined;
  }
  return true;
}

/**
 * Deletes `files` with at most `concurrency` requests open at once.
 *
 * @param {File[]} files The files to delete
 * @param {number} concurrency How many deletes may be in flight
 * @return {Promise<Array<object>>} Per file, whether it failed and why
 */
async function deleteWithin(
  files: File[],
  concurrency: number
): Promise<Array<{failed: false} | {failed: true; reason: unknown}>> {
  const outcomes: Array<{failed: false} | {failed: true; reason: unknown}> =
    new Array(files.length);
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      try {
        await files[i].delete({ignoreNotFound: true});
        outcomes[i] = {failed: false};
      } catch (reason) {
        outcomes[i] = {failed: true, reason};
      }
    }
  };
  const workers = Math.max(1, Math.min(concurrency, files.length));
  await Promise.all(Array.from({length: workers}, worker));
  return outcomes;
}

/**
 * Deletes image files that no document references and that are over a day
 * old, and bug-report screenshots over a day old.
 *
 * Image writes are ordered so a failure can leave a file without a document,
 * never a document without its file (`shared/hooks/useImageAttachment.ts` in
 * the web app). This removes those leftovers: an upload whose document write
 * failed, the old file of a replace, the file of a removed image or a deleted
 * NPC or location whose follow-up delete failed.
 *
 * The references are read before the files are listed. A file uploaded in
 * between is under a day old, so the age guard keeps it.
 *
 * The work is bounded by `limits`: the bucket is listed a page at a time, the
 * listing stops once the run has found as many orphans as it may delete, and
 * those are deleted a few at a time.
 *
 * @param {Date} now The time the sweep treats as now
 * @param {Partial<SweepLimits>} limits Overrides for the run's bounds
 * @return {Promise<SweepResult>} What was checked and deleted
 */
export async function sweepOrphanedImages(
  now: Date = new Date(),
  limits: Partial<SweepLimits> = {}
): Promise<SweepResult> {
  const {pageSize, maxDeletes, concurrency} = {...DEFAULT_LIMITS, ...limits};
  const referenced = await referencedPaths();

  let checked = 0;
  const orphans: File[] = [];
  /**
   * Collect a page's orphans, up to the budget.
   *
   * @param {RegExp} layout The paths this listing may judge
   * @param {boolean} needsReference Whether a reference keeps a file
   * @return {Function} The page visitor
   */
  const collect = (layout: RegExp, needsReference: boolean) =>
    (files: File[]): boolean => {
      for (const file of files) {
        if (!layout.test(file.name)) continue;
        checked += 1;
        const kept = needsReference && referenced.has(file.name);
        if (!kept && isOldEnough(file, now)) {
          orphans.push(file);
          if (orphans.length >= maxDeletes) return false;
        }
      }
      return true;
    };

  const listedAll =
    (await forEachPage("groups/", pageSize, collect(IMAGE_PATH, true))) &&
    (await forEachPage("support/", pageSize, collect(SUPPORT_PATH, false)));

  const outcomes = await deleteWithin(orphans, concurrency);

  const result: SweepResult = {
    checked,
    deleted: [],
    failed: [],
    more: !listedAll,
  };
  outcomes.forEach((outcome, i) => {
    const path = orphans[i].name;
    if (!outcome.failed) {
      result.deleted.push(path);
    } else {
      result.failed.push(path);
      console.error(`Could not delete orphaned image ${path}:`, outcome.reason);
    }
  });
  return result;
}

/**
 * Runs the sweep once a day, at night in Europe, when nobody is uploading.
 */
export const sweepOrphanedImagesDaily = onSchedule(
  {
    schedule: "every day 04:00",
    timeZone: "Europe/Copenhagen",
    region: "europe-west1",
  },
  async () => {
    const {checked, deleted, failed, more} = await sweepOrphanedImages();
    console.log(
      `Orphaned image sweep: checked ${checked}, deleted ${deleted.length}, ` +
        `failed ${failed.length}` +
        (more ? "; stopped at its budget, the rest is left for tomorrow." : ".")
    );
  }
);
