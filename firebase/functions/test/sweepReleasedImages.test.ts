// functions/test/sweepReleasedImages.test.ts
//
// T084: the daily sweep reads the two ledgers -- `releasedImages` and expired
// `pendingUploads` -- and one document per entry, rather than every document
// and the whole bucket. What neither ledger names is left to the monthly full
// sweep, tested in sweepOrphanedImages.test.ts.
import {clearProject, useEmulatorProject} from "./emulator";
import {ownerOf, sweepReleasedImages} from "../src/imageMaintenance/sweepReleasedImages";
import {isFullSweepDay} from "../src/imageMaintenance/sweepOrphanedImages";
import {imageBucket} from "../src/shared/imageBucket";
import {File} from "@google-cloud/storage";

const PROJECT = "demo-sweep-released-images";
const db = useEmulatorProject(PROJECT);

const DAY = 24 * 60 * 60 * 1000;
/** A run two days from now: every entry made in the test is over a day old. */
const later = () => new Date(Date.now() + 2 * DAY);
/** A run past the 30-day lease. */
const pastLease = () => new Date(Date.now() + 31 * DAY);

// Every file name is unique, as the app's random names are: a ledger entry is
// named after its file.
const FILES = {
  npcCurrent: "groups/g1/campaigns/c1/npcs/n1/npc-current.webp",
  npcReplaced: "groups/g1/campaigns/c1/npcs/n1/npc-replaced.webp",
  npcDeleted: "groups/g1/campaigns/c1/npcs/gone/npc-deleted.webp",
  locationRemoved: "groups/g1/campaigns/c1/locations/l1/location-removed.jpg",
  bannerReplaced: "groups/g1/campaigns/c1/banner/banner-replaced.webp",
  bannerCurrent: "groups/g1/campaigns/c1/banner/banner-current.webp",
  crestReplaced: "groups/g1/crest/crest-replaced.webp",
  crestCurrent: "groups/g1/crest/crest-current.webp",
  // An orphan no ledger names: the monthly full sweep's, not this one's.
  unrecorded: "groups/g1/campaigns/c1/npcs/n1/unrecorded.webp",
};

/**
 * The image value the app stores on a document, pointing at `path`.
 *
 * @param {string} path The object path
 * @return {object} A StoredImage-shaped value
 */
const stored = (path: string) => ({
  path,
  url: `https://example.test/${encodeURIComponent(path)}`,
  width: 800,
  height: 600,
  uploadedBy: "frodo",
  uploadedAt: "2026-10-05T00:00:00.000Z",
});

const exists = async (path: string) => (await imageBucket().file(path).exists())[0];
const fileName = (path: string) => path.split("/").pop() as string;
const releasedEntry = (path: string) => `groups/g1/releasedImages/${fileName(path)}`;
const pendingEntry = (path: string) => `groups/g1/pendingUploads/${fileName(path)}`;

/**
 * Records `path` in a ledger, as the client does.
 *
 * @param {string} entry The entry's document path
 * @param {string} path The image path it names
 * @return {Promise<unknown>} The write
 */
const record = (entry: string, path: string) =>
  db.doc(entry).set({path, uid: "frodo", createdAt: new Date()});

beforeEach(async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  await clearProject(PROJECT);
  await imageBucket().deleteFiles();

  await db.doc("groups/g1").set({name: "Fellowship", crest: stored(FILES.crestCurrent)});
  await db.doc("groups/g1/campaigns/c1").set({name: "There and Back", banner: stored(FILES.bannerCurrent)});
  await db.doc("groups/g1/campaigns/c1/npcs/n1").set({name: "Bilbo", image: stored(FILES.npcCurrent)});
  await db.doc("groups/g1/campaigns/c1/locations/l1").set({name: "Bag End", image: null});

  await Promise.all(
    Object.values(FILES).map((path) =>
      imageBucket().file(path).save(Buffer.from("x"), {contentType: "image/webp"})
    )
  );
});

afterEach(() => jest.restoreAllMocks());

describe("the daily ledger sweep", () => {
  it("control: every file exists before the sweep", async () => {
    for (const path of Object.values(FILES)) expect(await exists(path)).toBe(true);
  });

  describe("released images", () => {
    const DROPPED = [
      FILES.npcReplaced,
      FILES.npcDeleted,
      FILES.locationRemoved,
      FILES.bannerReplaced,
      FILES.crestReplaced,
    ];

    beforeEach(async () => {
      for (const path of DROPPED) await record(releasedEntry(path), path);
    });

    it("deletes every released file its document no longer points at, and the entries", async () => {
      const result = await sweepReleasedImages(later());

      expect(result.deleted.sort()).toEqual([...DROPPED].sort());
      for (const path of DROPPED) {
        expect(await exists(path)).toBe(false);
        expect((await db.doc(releasedEntry(path)).get()).exists).toBe(false);
      }
      expect(result.cleared).toBe(DROPPED.length);
    });

    it("reads no file it was not told about: an unrecorded orphan waits for the full sweep", async () => {
      await sweepReleasedImages(later());

      expect(await exists(FILES.unrecorded)).toBe(true);
      expect(await exists(FILES.npcCurrent)).toBe(true);
      expect(await exists(FILES.bannerCurrent)).toBe(true);
      expect(await exists(FILES.crestCurrent)).toBe(true);
    });

    it("leaves an entry under a day old alone: the client's own delete may be running", async () => {
      const result = await sweepReleasedImages(new Date(Date.now() + DAY / 2));

      expect(result.checked).toBe(0);
      expect(await exists(FILES.npcReplaced)).toBe(true);
      expect((await db.doc(releasedEntry(FILES.npcReplaced)).get()).exists).toBe(true);
    });

    it("keeps a file its document still points at -- the dropping write failed -- and its entry", async () => {
      await record(releasedEntry(FILES.npcCurrent), FILES.npcCurrent);

      const result = await sweepReleasedImages(later());

      expect(result.deleted).not.toContain(FILES.npcCurrent);
      expect(await exists(FILES.npcCurrent)).toBe(true);
      expect((await db.doc(releasedEntry(FILES.npcCurrent)).get()).exists).toBe(true);
    });

    it("drops that entry once the lease is over, and still keeps the file", async () => {
      await record(releasedEntry(FILES.bannerCurrent), FILES.bannerCurrent);

      await sweepReleasedImages(pastLease());

      expect(await exists(FILES.bannerCurrent)).toBe(true);
      expect((await db.doc(releasedEntry(FILES.bannerCurrent)).get()).exists).toBe(false);
    });

    it("never deletes a file a live upload entry holds", async () => {
      // Released, then pointed at again by an upload whose write is pending.
      await record(pendingEntry(FILES.npcReplaced), FILES.npcReplaced);

      const result = await sweepReleasedImages(later());

      expect(result.deleted).not.toContain(FILES.npcReplaced);
      expect(await exists(FILES.npcReplaced)).toBe(true);
    });

    it("drops an entry naming no image layout, and leaves its file to nobody", async () => {
      const odd = "groups/g1/exports/backup.json";
      await imageBucket().file(odd).save(Buffer.from("x"));
      await record("groups/g1/releasedImages/backup.json", odd);

      await sweepReleasedImages(later());

      expect(await exists(odd)).toBe(true);
      expect((await db.doc("groups/g1/releasedImages/backup.json").get()).exists).toBe(false);
    });

    it("keeps the entry when the file cannot be deleted, so the next run tries again", async () => {
      jest.spyOn(File.prototype, "delete").mockImplementation((() =>
        Promise.reject(new Error("unavailable"))) as typeof File.prototype.delete);

      const result = await sweepReleasedImages(later());

      expect(result.failed.sort()).toEqual([...DROPPED].sort());
      expect((await db.doc(releasedEntry(FILES.npcReplaced)).get()).exists).toBe(true);
    });

    it("judges no more entries than its budget, and says there is more", async () => {
      const first = await sweepReleasedImages(later(), {maxEntries: 2, pageSize: 2});

      expect(first.checked).toBe(2);
      expect(first.more).toBe(true);

      const runs = [first];
      for (let i = 0; i < 3; i += 1) runs.push(await sweepReleasedImages(later(), {maxEntries: 2, pageSize: 2}));

      expect(runs.flatMap((run) => run.deleted).sort()).toEqual([...DROPPED].sort());
      expect(runs[runs.length - 1].more).toBe(false);
    });
  });

  describe("uploads whose lease is over", () => {
    const UPLOAD = "groups/g1/campaigns/c1/npcs/n1/abandoned.webp";

    beforeEach(async () => {
      await imageBucket().file(UPLOAD).save(Buffer.from("x"), {contentType: "image/webp"});
      await record(pendingEntry(UPLOAD), UPLOAD);
    });

    it("keeps a pending upload's file inside the lease", async () => {
      await sweepReleasedImages(later());

      expect(await exists(UPLOAD)).toBe(true);
      expect((await db.doc(pendingEntry(UPLOAD)).get()).exists).toBe(true);
    });

    it("deletes an abandoned upload's file and entry once the lease is over", async () => {
      const result = await sweepReleasedImages(pastLease());

      expect(result.deleted).toContain(UPLOAD);
      expect(await exists(UPLOAD)).toBe(false);
      expect((await db.doc(pendingEntry(UPLOAD)).get()).exists).toBe(false);
    });

    it("clears an expired entry whose document did land, and keeps the file", async () => {
      await db.doc("groups/g1/campaigns/c1/npcs/n1").set({name: "Bilbo", image: stored(UPLOAD)});

      await sweepReleasedImages(pastLease());

      expect(await exists(UPLOAD)).toBe(true);
      expect((await db.doc(pendingEntry(UPLOAD)).get()).exists).toBe(false);
    });
  });
});

describe("ownerOf", () => {
  it("reads an image's owner from its path", () => {
    expect(ownerOf(FILES.npcCurrent)).toEqual({doc: "groups/g1/campaigns/c1/npcs/n1", field: "image"});
    expect(ownerOf(FILES.locationRemoved)).toEqual({doc: "groups/g1/campaigns/c1/locations/l1", field: "image"});
    expect(ownerOf(FILES.bannerCurrent)).toEqual({doc: "groups/g1/campaigns/c1", field: "banner"});
    expect(ownerOf(FILES.crestCurrent)).toEqual({doc: "groups/g1", field: "crest"});
  });

  it("knows no owner for anything else", () => {
    expect(ownerOf("groups/g1/exports/backup.json")).toBeNull();
    expect(ownerOf("support/frodo/x.webp")).toBeNull();
    expect(ownerOf("groups/g1/campaigns/c1/npcs/n1/deeper/x.webp")).toBeNull();
    expect(ownerOf("")).toBeNull();
  });
});

describe("isFullSweepDay", () => {
  it("is the 1st of the month in Copenhagen", () => {
    // 2026-11-01 04:00 in Copenhagen is 03:00 UTC.
    expect(isFullSweepDay(new Date("2026-11-01T03:00:00Z"))).toBe(true);
    expect(isFullSweepDay(new Date("2026-11-02T03:00:00Z"))).toBe(false);
    // Still 31 October in UTC, already 1 November in Copenhagen.
    expect(isFullSweepDay(new Date("2026-10-31T23:30:00Z"))).toBe(true);
  });
});
