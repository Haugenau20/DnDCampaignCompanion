// functions/test/migrateLinks.test.ts
//
// scripts/migrate-links.js (T131): merge each old half of a link into its
// owner and clear it, store a person-to-person link once, drop ids that name
// no record -- each campaign in one transaction -- and undo exactly that.
import {useEmulatorProject, clearProject} from "./emulator";

const PROJECT = "demo-migrate-links";
const db = useEmulatorProject(PROJECT);

type Counts = Record<string, number>;
type RevertRecord = {project: string; writes: Array<{path: string; before: object; after: object}>};

// A plain-JS operator script, so required rather than imported.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const script = require("../scripts/migrate-links.js") as {
  planCampaign: (campaign: object) => {writes: Map<string, object>; counts: Counts};
  auditLinks: (db: unknown) => Promise<Array<{campaign: string; counts: Counts; documents: number}>>;
  applyLinks: (db: unknown, project: string) =>
    Promise<{record: RevertRecord; tooLarge: string[]; counts: Counts}>;
  revertLinks: (db: unknown, record: RevertRecord, apply: boolean) =>
    Promise<{unchanged: string[]; changed: string[]}>;
  formatAudit: (rows: unknown) => string;
};

const A = "groups/g1/campaigns/a";
const B = "groups/g1/campaigns/b";
const connections = (extra: Record<string, string[]> = {}) =>
  ({relatedNPCs: [], affiliations: ["Rangers"], relatedQuests: [], ...extra});

/** Campaign A has every kind of leftover; campaign B is already tidy. */
async function seed(): Promise<void> {
  await clearProject(PROJECT);
  const batch = db.batch();
  // person <-> quest held only on the person; and a quest that no longer exists.
  batch.set(db.doc(`${A}/npcs/frodo`), {name: "Frodo", connections: connections({relatedQuests: ["ring", "gone"]})});
  batch.set(db.doc(`${A}/quests/ring`), {title: "The Ring", relatedNPCIds: ["sam", "ghost"], locationId: "shire"});
  batch.set(db.doc(`${A}/npcs/sam`), {name: "Sam", connections: connections()});
  // person <-> place held only on the person.
  batch.set(db.doc(`${A}/npcs/butterbur`), {name: "Butterbur", locationId: "bree", location: "Bree", connections: connections()});
  batch.set(db.doc(`${A}/locations/bree`), {name: "Bree", connectedNPCs: [], relatedQuests: ["ring"]});
  batch.set(db.doc(`${A}/locations/shire`), {name: "The Shire", connectedNPCs: ["sam"]});
  // A person whose old place no longer exists keeps it, visible.
  batch.set(db.doc(`${A}/npcs/wanderer`), {name: "Wanderer", locationId: "lost-city", connections: connections()});
  // person <-> person held on both.
  batch.set(db.doc(`${A}/npcs/aragorn`), {name: "Aragorn", connections: connections({relatedNPCs: ["arwen"]})});
  batch.set(db.doc(`${A}/npcs/arwen`), {name: "Arwen", connections: connections({relatedNPCs: ["aragorn"]})});
  // A rumour's two place fields are its own; only a dangling id goes.
  batch.set(db.doc(`${A}/rumors/whisper`), {relatedNPCs: ["ghost"], relatedLocations: ["bree", "nowhere"], locationId: "shire"});

  batch.set(db.doc(`${B}/quests/q`), {title: "Q", relatedNPCIds: ["p"]});
  batch.set(db.doc(`${B}/npcs/p`), {name: "P", connections: connections()});
  await batch.commit();
}

const data = async (path: string) => (await db.doc(path).get()).data();

beforeEach(seed);

describe("migrate-links", () => {
  it("audits without writing, counting each step per campaign", async () => {
    const before = await data(`${A}/npcs/frodo`);
    const rows = await script.auditLinks(db);

    expect(rows.map((row) => row.campaign)).toEqual([A, B]);
    expect(rows[0].counts).toEqual({
      personQuestMerged: 1,
      personPlaceMerged: 1,
      placeQuestMerged: 1,
      personPersonDeduplicated: 1,
      placeIdsGiven: 0,
      danglingRemoved: 3,
    });
    expect(rows[1].documents).toBe(0);
    expect(await data(`${A}/npcs/frodo`)).toEqual(before);
    expect(script.formatAudit(rows)).not.toContain("Frodo");
  });

  it("merges every old half into its owner and clears it", async () => {
    const {counts, tooLarge} = await script.applyLinks(db, PROJECT);

    expect(tooLarge).toEqual([]);
    expect(counts.personQuestMerged).toBe(1);
    // person <-> quest
    expect((await data(`${A}/quests/ring`))?.relatedNPCIds).toEqual(["sam", "frodo"]);
    expect((await data(`${A}/npcs/frodo`))?.connections).toEqual(connections());
    // person <-> place: the prose `location` stays, as written.
    expect((await data(`${A}/locations/bree`))?.connectedNPCs).toEqual(["butterbur"]);
    expect(await data(`${A}/npcs/butterbur`)).toMatchObject({locationId: "", location: "Bree"});
    expect((await data(`${A}/npcs/wanderer`))?.locationId).toBe("lost-city");
    // place <-> quest: the quest has a location, so the place joins its places.
    expect((await data(`${A}/quests/ring`))?.keyLocations).toEqual([{name: "Bree", description: "", locationId: "bree"}]);
    expect((await data(`${A}/locations/bree`))?.relatedQuests).toEqual([]);
    // person <-> person: kept on the one whose id sorts first.
    expect((await data(`${A}/npcs/aragorn`))?.connections.relatedNPCs).toEqual(["arwen"]);
    expect((await data(`${A}/npcs/arwen`))?.connections.relatedNPCs).toEqual([]);
    // Dangling ids out of lists; a rumour's own place fields otherwise kept.
    expect(await data(`${A}/rumors/whisper`)).toEqual({relatedNPCs: [], relatedLocations: ["bree"], locationId: "shire"});
  });

  it("changes nothing a second time", async () => {
    await script.applyLinks(db, PROJECT);
    const again = await script.applyLinks(db, PROJECT);
    expect(again.record.writes).toEqual([]);
  });

  it("reverts exactly what it wrote, and leaves a document edited since", async () => {
    const before = {
      frodo: await data(`${A}/npcs/frodo`),
      ring: await data(`${A}/quests/ring`),
      bree: await data(`${A}/locations/bree`),
      butterbur: await data(`${A}/npcs/butterbur`),
    };
    const {record} = await script.applyLinks(db, PROJECT);
    // A player edits a record the migration wrote.
    await db.doc(`${A}/npcs/arwen`).update({"connections.relatedNPCs": ["legolas"]});

    const dry = await script.revertLinks(db, record, false);
    expect(dry.changed).toEqual([`${A}/npcs/arwen`]);
    expect((await data(`${A}/npcs/frodo`))?.connections.relatedQuests).toEqual([]);

    await script.revertLinks(db, record, true);
    expect(await data(`${A}/npcs/frodo`)).toEqual(before.frodo);
    expect(await data(`${A}/quests/ring`)).toEqual(before.ring);
    expect(await data(`${A}/locations/bree`)).toEqual(before.bree);
    expect(await data(`${A}/npcs/butterbur`)).toEqual(before.butterbur);
    expect((await data(`${A}/npcs/arwen`))?.connections.relatedNPCs).toEqual(["legolas"]);
  });

  it("makes the place a quest's own location when the quest has none", () => {
    const {writes} = script.planCampaign({
      quests: [{path: "q/x", id: "x", data: {title: "X"}}],
      locations: [{path: "l/erebor", id: "erebor", data: {name: "Erebor", relatedQuests: ["x"]}}],
    });
    expect(writes.get("q/x")).toEqual({locationId: "erebor", location: "Erebor"});
  });

  it("gives a quest's place written before #1421 the id of the one place its name matches", () => {
    const {writes, counts} = script.planCampaign({
      quests: [{path: "q/x", id: "x", data: {keyLocations: [{name: "erebor"}, {name: "Bree-land"}, {name: "Nowhere"}]}}],
      locations: [
        {path: "l/erebor", id: "erebor", data: {name: "Erebor"}},
        {path: "l/b1", id: "b1", data: {name: "Bree-land"}},
        {path: "l/b2", id: "b2", data: {name: "bree-land"}},
      ],
    });
    expect(counts.placeIdsGiven).toBe(1);
    expect(writes.get("q/x")).toEqual({
      keyLocations: [{name: "erebor", locationId: "erebor"}, {name: "Bree-land"}, {name: "Nowhere"}],
    });
  });

  it("adds nothing to a quest that already names the place by name", () => {
    const {writes, counts} = script.planCampaign({
      quests: [{path: "q/x", id: "x", data: {locationId: "dale", keyLocations: [{name: "erebor"}]}}],
      locations: [{path: "l/erebor", id: "erebor", data: {name: "Erebor", relatedQuests: ["x"]}}],
    });
    expect(counts.placeQuestMerged).toBe(0);
    // Only the id its name already pointed at.
    expect(writes.get("q/x")).toEqual({keyLocations: [{name: "erebor", locationId: "erebor"}]});
    expect(writes.get("l/erebor")).toEqual({relatedQuests: []});
  });
});
