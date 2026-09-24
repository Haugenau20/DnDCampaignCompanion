// functions/src/imageMaintenance/sweepOrphanedImages.ts
import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {imageBucket} from "../shared/imageBucket";

/**
 * How old an unreferenced file must be before the sweep deletes it. An upload
 * is written before the document that points at it, so a younger file may be
 * one whose document write is still on its way.
 */
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * The object paths the app writes images to (see the storage images design,
 * §3). Anything else in the bucket -- `support/…` screenshots, or a path added
 * later -- is not the sweep's to judge, however unreferenced it looks.
 */
const IMAGE_PATH = new RegExp(
  "^groups/[^/]+/(campaigns/[^/]+/(npcs|locations)/[^/]+|crest)/[^/]+$"
);

/** What one sweep did, for the log and for tests. */
export interface SweepResult {
  /** How many files in the image layout were looked at. */
  checked: number;
  /** Paths deleted. */
  deleted: string[];
  /** Paths whose delete failed; the next sweep tries them again. */
  failed: string[];
}

/**
 * The path of every image a document points at: each NPC's and location's
 * `image`, and each group's `crest`.
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
  const [npcs, locations, groups] = await Promise.all([
    db.collectionGroup("npcs").select("image").get(),
    db.collectionGroup("locations").select("image").get(),
    db.collection("groups").select("crest").get(),
  ]);

  const paths = new Set<string>();
  const add = (value: unknown) => {
    const path = (value as {path?: unknown} | null | undefined)?.path;
    if (typeof path === "string") paths.add(path);
  };
  npcs.docs.forEach((doc) => add(doc.get("image")));
  locations.docs.forEach((doc) => add(doc.get("image")));
  groups.docs.forEach((doc) => add(doc.get("crest")));
  return paths;
}

/**
 * Deletes image files that no document references and that are over a day old.
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
 * @param {Date} now The time the sweep treats as now
 * @return {Promise<SweepResult>} What was checked and deleted
 */
export async function sweepOrphanedImages(
  now: Date = new Date()
): Promise<SweepResult> {
  const referenced = await referencedPaths();
  const [files] = await imageBucket().getFiles({prefix: "groups/"});

  const images = files.filter((file) => IMAGE_PATH.test(file.name));
  const orphans = images.filter((file) => {
    if (referenced.has(file.name)) return false;
    const created = Date.parse(String(file.metadata.timeCreated ?? ""));
    // No creation time means the age is unknown: keep it.
    return Number.isFinite(created) && now.getTime() - created >= MIN_AGE_MS;
  });

  const outcomes = await Promise.allSettled(
    orphans.map((file) => file.delete({ignoreNotFound: true}))
  );

  const result: SweepResult = {checked: images.length, deleted: [], failed: []};
  outcomes.forEach((outcome, i) => {
    const path = orphans[i].name;
    if (outcome.status === "fulfilled") {
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
    const {checked, deleted, failed} = await sweepOrphanedImages();
    console.log(
      `Orphaned image sweep: checked ${checked}, deleted ${deleted.length}, ` +
        `failed ${failed.length}.`
    );
  }
);
