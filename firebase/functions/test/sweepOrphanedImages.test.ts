// functions/test/sweepOrphanedImages.test.ts
//
// T058: the daily sweep deletes image files no document references -- and only
// those, and only once they are old enough not to be an upload still saving.
import {clearProject, useEmulatorProject} from "./emulator";
import {sweepOrphanedImages} from "../src/imageMaintenance/sweepOrphanedImages";
import {imageBucket} from "../src/shared/imageBucket";

const PROJECT = "demo-sweep-orphaned-images";
const db = useEmulatorProject(PROJECT);

const DAY = 24 * 60 * 60 * 1000;
/** A sweep run two days from now, when every file in the test is old enough. */
const later = () => new Date(Date.now() + 2 * DAY);

/** One file per case, keyed by what it stands for. */
const FILES = {
  npcImage: "groups/g1/campaigns/c1/npcs/n1/current.webp",
  npcReplaced: "groups/g1/campaigns/c1/npcs/n1/replaced.webp",
  npcDeleted: "groups/g1/campaigns/c1/npcs/gone/a.webp",
  npcRemoved: "groups/g1/campaigns/c1/npcs/n2/removed.webp",
  locationImage: "groups/g1/campaigns/c1/locations/l1/current.jpg",
  locationOrphan: "groups/g1/campaigns/c1/locations/l1/failed-write.jpg",
  banner: "groups/g1/campaigns/c1/banner/current.webp",
  bannerOrphan: "groups/g1/campaigns/c1/banner/replaced.webp",
  crest: "groups/g1/crest/current.webp",
  crestOrphan: "groups/g1/crest/replaced.webp",
  otherGroupImage: "groups/g2/campaigns/c9/npcs/n9/current.webp",
  // T020: a bug-report screenshot nothing references, ever.
  screenshot: "support/frodo/0f8fad5b-d9cb-469f-a165-70867728950e.webp",
  // Not the shape of a file this app writes: never the sweep's to judge.
  unknownUnderSupport: "support/frodo/drafts/notes.txt",
  unknownUnderGroup: "groups/g1/exports/backup.json",
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
  uploadedAt: "2026-09-24T00:00:00.000Z",
});

const exists = async (path: string) => (await imageBucket().file(path).exists())[0];

beforeEach(async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  await clearProject(PROJECT);
  await imageBucket().deleteFiles();

  await db.doc("groups/g1").set({name: "Fellowship", crest: stored(FILES.crest)});
  await db.doc("groups/g2").set({name: "Rangers"});
  await db.doc("groups/g1/campaigns/c1").set({name: "There and Back", banner: stored(FILES.banner)});
  await db.doc("groups/g1/campaigns/c1/npcs/n1").set({name: "Bilbo", image: stored(FILES.npcImage)});
  await db.doc("groups/g1/campaigns/c1/npcs/n2").set({name: "Sam", image: null});
  await db.doc("groups/g1/campaigns/c1/npcs/n3").set({name: "Pippin"});
  await db.doc("groups/g1/campaigns/c1/locations/l1").set({
    name: "Bag End",
    image: stored(FILES.locationImage),
  });
  await db.doc("groups/g2/campaigns/c9/npcs/n9").set({
    name: "Aragorn",
    image: stored(FILES.otherGroupImage),
  });

  await Promise.all(
    Object.values(FILES).map((path) =>
      imageBucket().file(path).save(Buffer.from("x"), {contentType: "image/webp"})
    )
  );
});

afterEach(() => jest.restoreAllMocks());

describe("sweeping orphaned images", () => {
  it("control: every file exists before the sweep", async () => {
    for (const path of Object.values(FILES)) expect(await exists(path)).toBe(true);
  });

  it("keeps every image a document references", async () => {
    await sweepOrphanedImages(later());

    expect(await exists(FILES.npcImage)).toBe(true);
    expect(await exists(FILES.locationImage)).toBe(true);
    expect(await exists(FILES.banner)).toBe(true);
    expect(await exists(FILES.crest)).toBe(true);
    expect(await exists(FILES.otherGroupImage)).toBe(true);
  });

  it("deletes an NPC's file that a replace left behind", async () => {
    await sweepOrphanedImages(later());

    expect(await exists(FILES.npcReplaced)).toBe(false);
  });

  it("deletes the file of an NPC whose document is gone", async () => {
    await sweepOrphanedImages(later());

    expect(await exists(FILES.npcDeleted)).toBe(false);
  });

  it("deletes a file whose NPC had its image removed", async () => {
    await sweepOrphanedImages(later());

    expect(await exists(FILES.npcRemoved)).toBe(false);
  });

  it("deletes a location's file whose document write never landed", async () => {
    await sweepOrphanedImages(later());

    expect(await exists(FILES.locationOrphan)).toBe(false);
  });

  it("deletes a banner file that is no longer the campaign's banner", async () => {
    await sweepOrphanedImages(later());

    expect(await exists(FILES.bannerOrphan)).toBe(false);
  });

  it("deletes a crest file that is no longer the group's crest", async () => {
    await sweepOrphanedImages(later());

    expect(await exists(FILES.crestOrphan)).toBe(false);
  });

  it("leaves an unreferenced file alone while it is under a day old", async () => {
    await sweepOrphanedImages(new Date(Date.now() + DAY / 2));

    expect(await exists(FILES.npcReplaced)).toBe(true);
    expect(await exists(FILES.crestOrphan)).toBe(true);
  });

  it("deletes a bug-report screenshot left behind for a day", async () => {
    await sweepOrphanedImages(later());

    expect(await exists(FILES.screenshot)).toBe(false);
  });

  it("leaves a screenshot alone while it is under a day old -- its report may be on its way", async () => {
    await sweepOrphanedImages(new Date(Date.now() + DAY / 2));

    expect(await exists(FILES.screenshot)).toBe(true);
  });

  it("leaves files that are not in the image or screenshot layout alone", async () => {
    await sweepOrphanedImages(later());

    expect(await exists(FILES.unknownUnderSupport)).toBe(true);
    expect(await exists(FILES.unknownUnderGroup)).toBe(true);
  });

  it("reports what it deleted", async () => {
    const result = await sweepOrphanedImages(later());

    expect(result.deleted.sort()).toEqual(
      [
        FILES.npcReplaced,
        FILES.npcDeleted,
        FILES.npcRemoved,
        FILES.locationOrphan,
        FILES.bannerOrphan,
        FILES.crestOrphan,
        FILES.screenshot,
      ].sort()
    );
    expect(result.failed).toEqual([]);
  });
});
