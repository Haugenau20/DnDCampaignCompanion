// functions/test/resumeCampaignDeletions.test.ts
//
// T037: a campaign deletion that failed after the campaign document went
// cannot be retried from the app -- the campaign is no longer listed -- so
// the daily sweep finishes it. The scheduled wrapper never fires in the
// emulator; its body is tested directly, with `now` injected.
import * as admin from "firebase-admin";
import {clearProject, useEmulatorProject} from "./emulator";
import {resumeCampaignDeletions, RESUME_AFTER_MS} from "../src/campaignManagement/campaignDeletion";
import {imageBucket} from "../src/shared/imageBucket";

const PROJECT = "demo-resume-campaign-deletions";
const db = useEmulatorProject(PROJECT);
const GROUP = "g1";
const NOW = new Date("2026-10-05T03:30:00Z");

const ago = (ms: number) => admin.firestore.Timestamp.fromMillis(NOW.getTime() - ms);
const isThere = async (path: string) => (await db.doc(path).get()).exists;
const fileExists = async (path: string) => (await imageBucket().file(path).exists())[0];

/**
 * Leaves campaign `campaignId` the way a deletion that failed after the root
 * went leaves it: a record, no campaign document, a descendant, a member's
 * note and a picture.
 */
async function seedStranded(campaignId: string, requestedAgoMs: number) {
  await db.doc(`groups/${GROUP}/campaignDeletions/${campaignId}`)
    .set({requestedBy: "gandalf", requestedAt: ago(requestedAgoMs)});
  await db.doc(`groups/${GROUP}/campaigns/${campaignId}/npcs/n1`).set({name: "Bilbo"});
  await db.doc(`groups/${GROUP}/users/frodo/notes/note-${campaignId}`)
    .set({campaignId, title: "Bree"});
  await imageBucket().file(`groups/${GROUP}/campaigns/${campaignId}/npcs/n1/a.webp`)
    .save(Buffer.from("x"), {contentType: "image/webp"});
}

beforeEach(async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  await clearProject(PROJECT);
  await imageBucket().deleteFiles({prefix: "groups/"});
  await db.doc(`groups/${GROUP}`).set({name: "Fellowship"});
  await db.doc(`groups/${GROUP}/users/frodo`).set({userId: "frodo", role: "member"});
});

afterEach(() => jest.restoreAllMocks());

describe("resumeCampaignDeletions", () => {
  it("finishes a deletion left behind after the campaign document went", async () => {
    await seedStranded("c1", 2 * RESUME_AFTER_MS);

    const result = await resumeCampaignDeletions(NOW);

    expect(result).toEqual({finished: [`${GROUP}/c1`], failed: [], more: false});
    expect(await isThere(`groups/${GROUP}/campaigns/c1/npcs/n1`)).toBe(false);
    expect(await isThere(`groups/${GROUP}/users/frodo/notes/note-c1`)).toBe(false);
    expect(await fileExists(`groups/${GROUP}/campaigns/c1/npcs/n1/a.webp`)).toBe(false);
    expect(await isThere(`groups/${GROUP}/campaignDeletions/c1`)).toBe(false);
  });

  it("leaves a deletion that may still be running to its caller", async () => {
    await seedStranded("c1", RESUME_AFTER_MS / 2);

    const result = await resumeCampaignDeletions(NOW);

    expect(result.finished).toEqual([]);
    expect(await isThere(`groups/${GROUP}/campaigns/c1/npcs/n1`)).toBe(true);
    expect(await isThere(`groups/${GROUP}/campaignDeletions/c1`)).toBe(true);
  });

  it("keeps the record of a deletion that fails again, and finishes the others", async () => {
    await seedStranded("c1", 2 * RESUME_AFTER_MS);
    await seedStranded("c2", 2 * RESUME_AFTER_MS);
    jest.spyOn(admin.firestore.Firestore.prototype, "recursiveDelete")
      .mockRejectedValueOnce(new Error("injected: backend unavailable"));

    const result = await resumeCampaignDeletions(NOW);

    expect(result.failed).toEqual([`${GROUP}/c1`]);
    expect(result.finished).toEqual([`${GROUP}/c2`]);
    expect(await isThere(`groups/${GROUP}/campaignDeletions/c1`)).toBe(true);
    expect(await isThere(`groups/${GROUP}/campaignDeletions/c2`)).toBe(false);
  });

  it("stops at its budget and says there is more", async () => {
    await seedStranded("c1", 2 * RESUME_AFTER_MS);
    await seedStranded("c2", 2 * RESUME_AFTER_MS);

    const result = await resumeCampaignDeletions(NOW, 1);

    expect(result).toEqual({finished: [`${GROUP}/c1`], failed: [], more: true});
    expect(await isThere(`groups/${GROUP}/campaignDeletions/c2`)).toBe(true);
  });

  it("touches nothing when no deletion is pending", async () => {
    await db.doc(`groups/${GROUP}/campaigns/c3/npcs/n1`).set({name: "Sam"});

    const result = await resumeCampaignDeletions(NOW);

    expect(result).toEqual({finished: [], failed: [], more: false});
    expect(await isThere(`groups/${GROUP}/campaigns/c3/npcs/n1`)).toBe(true);
  });
});
