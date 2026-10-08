// functions/test/migrateLocationIds.test.ts
//
// The migrate and revert modes of scripts/audit-location-ids.js (T079): give
// each document that resolves its place only through the legacy fallback the
// `locationId` the app already resolves it to, write nothing else, touch no
// document that changed since it was read, and undo exactly that.

import {FieldValue} from "firebase-admin/firestore";
import {useEmulatorProject, clearProject} from "./emulator";

const PROJECT = "demo-migrate-location-ids";
const db = useEmulatorProject(PROJECT);

type Plan = {
  writes: Array<{path: string; status: string; locationId: string}>;
  ambiguous: Array<{path: string; location: string}>;
};
type Record = {
  project: string;
  writes: Array<{path: string; locationId: string; previous: string | null;
    writeTime: {seconds: number; nanoseconds: number}}>;
};

// A plain-JS operator script, so required rather than imported.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const script = require("../scripts/audit-location-ids.js") as {
  auditLocationIds: (db: unknown) => Promise<{attention: unknown[]}>;
  planMigration: (db: unknown) => Promise<Plan>;
  applyMigration: (db: unknown, plan: Plan, project: string) =>
    Promise<{record: Record; refused: Array<{path: string}>}>;
  planRevert: (db: unknown, record: Record) =>
    Promise<{unchanged: Array<{path: string}>; changed: Array<{path: string}>}>;
  applyRevert: (db: unknown, plan: {unchanged: Array<{path: string}>}) =>
    Promise<{reverted: string[]; refused: string[]}>;
  formatMigrationPlan: (plan: Plan, apply: boolean) => string;
};

const A = "groups/g1/campaigns/a";

/** The campaign every test starts from. */
async function seed(): Promise<void> {
  await clearProject(PROJECT);
  const batch = db.batch();
  batch.set(db.doc(`${A}/locations/rivendell`), {name: "Rivendell"});
  batch.set(db.doc(`${A}/locations/bree`), {name: "Bree"});
  // Two places share a name: which one "Bree-land" means is a guess.
  batch.set(db.doc(`${A}/locations/bree-land-1`), {name: "Bree-land"});
  batch.set(db.doc(`${A}/locations/bree-land-2`), {name: "bree-land"});

  batch.set(db.doc(`${A}/npcs/linked`), {name: "Elrond", locationId: "rivendell", location: "Rivendell"});
  batch.set(db.doc(`${A}/npcs/dangling`), {name: "Ghost", locationId: "deleted-place", location: "Bree"});
  batch.set(db.doc(`${A}/npcs/legacy-id`), {name: "Butterbur", location: "bree"});
  batch.set(db.doc(`${A}/npcs/legacy-name`), {name: "Arwen", location: "RIVENDELL", dateModified: "2020-01-01"});
  batch.set(db.doc(`${A}/npcs/empty-id`), {name: "Strider", locationId: "", location: "Bree"});
  batch.set(db.doc(`${A}/npcs/free-text`), {name: "Bard", location: "Lake-town"});
  batch.set(db.doc(`${A}/npcs/ambiguous`), {name: "Bill Ferny", location: "Bree-land"});
  batch.set(db.doc(`${A}/npcs/none`), {name: "Nobody"});
  batch.set(db.doc(`${A}/quests/q1`), {title: "Reach Rivendell", location: "Rivendell"});
  batch.set(db.doc(`${A}/rumors/r1`), {title: "Riders at the gate", location: "Bree"});
  await batch.commit();
}

beforeEach(seed);

/** Every npc, quest and rumor, as stored. */
async function snapshot(): Promise<Map<string, FirebaseFirestore.DocumentData>> {
  const all = new Map<string, FirebaseFirestore.DocumentData>();
  for (const kind of ["npcs", "quests", "rumors"]) {
    for (const doc of (await db.collectionGroup(kind).get()).docs) all.set(doc.ref.path, doc.data());
  }
  return all;
}

describe("planning", () => {
  it("plans the id the app resolves each fallback document to, and nothing else", async () => {
    const plan = await script.planMigration(db);

    expect(plan.writes.map((w) => [w.path, w.locationId]).sort()).toEqual([
      [`${A}/npcs/empty-id`, "bree"],
      [`${A}/npcs/legacy-id`, "bree"],
      [`${A}/npcs/legacy-name`, "rivendell"],
      [`${A}/quests/q1`, "rivendell"],
      [`${A}/rumors/r1`, "bree"],
    ]);
  });

  it("does not guess between two places of the same name", async () => {
    const plan = await script.planMigration(db);

    expect(plan.ambiguous).toEqual([expect.objectContaining({path: `${A}/npcs/ambiguous`, location: "Bree-land"})]);
    expect(plan.writes.map((w) => w.path)).not.toContain(`${A}/npcs/ambiguous`);
  });

  it("writes nothing while planning, and says so", async () => {
    const before = await snapshot();
    const plan = await script.planMigration(db);

    expect(await snapshot()).toEqual(before);
    expect(script.formatMigrationPlan(plan, false)).toContain("Nothing has been changed.");
  });
});

describe("applying", () => {
  it("sets locationId on exactly the planned documents and changes no other field", async () => {
    const before = await snapshot();
    const {record, refused} = await script.applyMigration(db, await script.planMigration(db), PROJECT);
    const after = await snapshot();

    expect(refused).toEqual([]);
    const planned = new Map(record.writes.map((w) => [w.path, w.locationId]));
    expect(planned.size).toBe(5);
    for (const [path, data] of before) {
      const expected = planned.has(path) ? {...data, locationId: planned.get(path)} : data;
      expect(after.get(path)).toEqual(expected);
    }
    // The audit finds nothing left on the fallback, bar the one it cannot decide
    // and the dangling id it leaves alone.
    const {attention} = await script.auditLocationIds(db);
    expect((attention as Array<{path: string}>).map((a) => a.path).sort()).toEqual([
      `${A}/npcs/ambiguous`,
      `${A}/npcs/dangling`,
    ]);
  });

  it("leaves a document someone changed after the plan was made", async () => {
    const plan = await script.planMigration(db);
    // A player picks another place for Arwen in the meantime.
    await db.doc(`${A}/npcs/legacy-name`).update({locationId: "bree", location: "Bree"});

    const {record, refused} = await script.applyMigration(db, plan, PROJECT);

    expect(refused.map((r) => r.path)).toEqual([`${A}/npcs/legacy-name`]);
    expect(record.writes.map((w) => w.path)).not.toContain(`${A}/npcs/legacy-name`);
    expect((await db.doc(`${A}/npcs/legacy-name`).get()).get("locationId")).toBe("bree");
  });

  it("records what each document held before, for the revert", async () => {
    const {record} = await script.applyMigration(db, await script.planMigration(db), PROJECT);
    const previous = Object.fromEntries(record.writes.map((w) => [w.path, w.previous]));

    expect(record.project).toBe(PROJECT);
    expect(previous[`${A}/npcs/empty-id`]).toBe("");
    expect(previous[`${A}/npcs/legacy-id`]).toBeNull();
  });
});

describe("reverting", () => {
  it("restores every migrated document exactly", async () => {
    const before = await snapshot();
    const {record} = await script.applyMigration(db, await script.planMigration(db), PROJECT);

    const plan = await script.planRevert(db, record);
    expect(plan.changed).toEqual([]);
    const {reverted, refused} = await script.applyRevert(db, plan);

    expect(refused).toEqual([]);
    expect(reverted).toHaveLength(5);
    expect(await snapshot()).toEqual(before);
  });

  it("leaves a document edited since the migration", async () => {
    const {record} = await script.applyMigration(db, await script.planMigration(db), PROJECT);
    await db.doc(`${A}/quests/q1`).update({description: "Through the Misty Mountains"});

    const plan = await script.planRevert(db, record);
    expect(plan.changed.map((c) => c.path)).toEqual([`${A}/quests/q1`]);
    await script.applyRevert(db, plan);

    expect((await db.doc(`${A}/quests/q1`).get()).get("locationId")).toBe("rivendell");
    expect((await db.doc(`${A}/npcs/legacy-id`).get()).get("locationId")).toBeUndefined();
  });

  it("refuses a document edited between the revert's plan and its write", async () => {
    const {record} = await script.applyMigration(db, await script.planMigration(db), PROJECT);
    const plan = await script.planRevert(db, record);
    await db.doc(`${A}/rumors/r1`).update({locationId: FieldValue.delete()});
    await db.doc(`${A}/rumors/r1`).update({locationId: "rivendell"});

    const {refused} = await script.applyRevert(db, plan);

    expect(refused).toEqual([`${A}/rumors/r1`]);
    expect((await db.doc(`${A}/rumors/r1`).get()).get("locationId")).toBe("rivendell");
  });
});
