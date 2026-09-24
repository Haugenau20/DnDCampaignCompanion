// functions/test/deleteCampaign.test.ts
//
// T021: deleting a campaign also deletes its images -- and nobody else's.
import {call, clearProject, expectHttpsError, useEmulatorProject} from "./emulator";
import {deleteCampaign} from "../src/campaignManagement/deleteCampaign";
import {imageBucket} from "../src/shared/imageBucket";

const PROJECT = "demo-delete-campaign";
const db = useEmulatorProject(PROJECT);
const GROUP = "g1";

/** One file per place a file could be, keyed by what it stands for. */
const FILES = {
  npcImage: `groups/${GROUP}/campaigns/c1/npcs/n1/a.webp`,
  locationImage: `groups/${GROUP}/campaigns/c1/locations/l1/b.webp`,
  siblingCampaign: `groups/${GROUP}/campaigns/c2/npcs/n2/c.webp`,
  // Shares the "c1" prefix without the slash: the delete must stop at "c1/".
  lookalikeCampaign: `groups/${GROUP}/campaigns/c10/npcs/n3/d.webp`,
  crest: `groups/${GROUP}/crest/e.webp`,
  otherGroup: "groups/g2/campaigns/c1/npcs/n1/f.webp",
};

const exists = async (path: string) => (await imageBucket().file(path).exists())[0];

beforeEach(async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  await clearProject(PROJECT);
  await imageBucket().deleteFiles({prefix: "groups/"});

  await db.doc(`groups/${GROUP}`).set({name: "Fellowship"});
  await db.doc(`groups/${GROUP}/users/gandalf`).set({userId: "gandalf", role: "admin"});
  await db.doc(`groups/${GROUP}/users/frodo`).set({userId: "frodo", role: "member"});
  await db.doc("users/gandalf").set({id: "gandalf", groups: [GROUP]});
  await db.doc("users/frodo").set({id: "frodo", groups: [GROUP]});
  await db.doc(`groups/${GROUP}/campaigns/c1`).set({name: "There and back"});
  await db.doc(`groups/${GROUP}/campaigns/c1/npcs/n1`).set({name: "Bilbo"});

  await Promise.all(
    Object.values(FILES).map((path) =>
      imageBucket().file(path).save(Buffer.from("x"), {contentType: "image/webp"})
    )
  );
});

afterEach(() => jest.restoreAllMocks());

const remove = (uid: string, campaignId = "c1") =>
  call(deleteCampaign, {groupId: GROUP, campaignId}, uid);

describe("deleting a campaign", () => {
  it("control: every file exists before the call", async () => {
    for (const path of Object.values(FILES)) expect(await exists(path)).toBe(true);
  });

  it("deletes the campaign's images along with the campaign", async () => {
    await remove("gandalf");

    expect((await db.doc(`groups/${GROUP}/campaigns/c1`).get()).exists).toBe(false);
    expect(await exists(FILES.npcImage)).toBe(false);
    expect(await exists(FILES.locationImage)).toBe(false);
  });

  it("leaves every other campaign's, the crest's and other groups' images alone", async () => {
    await remove("gandalf");

    expect(await exists(FILES.siblingCampaign)).toBe(true);
    expect(await exists(FILES.lookalikeCampaign)).toBe(true);
    expect(await exists(FILES.crest)).toBe(true);
    expect(await exists(FILES.otherGroup)).toBe(true);
  });

  it("deletes nothing when a plain member asks", async () => {
    await expectHttpsError(remove("frodo"), "permission-denied");

    expect(await exists(FILES.npcImage)).toBe(true);
    expect((await db.doc(`groups/${GROUP}/campaigns/c1`).get()).exists).toBe(true);
  });

  it("deletes nothing when the campaign does not exist", async () => {
    await expectHttpsError(remove("gandalf", "c10"), "not-found");

    expect(await exists(FILES.lookalikeCampaign)).toBe(true);
  });
});
