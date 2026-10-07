// functions/test/auditLocationIds.test.ts
//
// The read-only `locationId` audit (T079, scripts/audit-location-ids.js): it
// must sort every located document into the order the app resolves it in,
// per campaign, and write nothing.

import {useEmulatorProject, clearProject} from "./emulator";

const PROJECT = "demo-audit-location-ids";
const db = useEmulatorProject(PROJECT);

// A plain-JS operator script, so required rather than imported.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {auditLocationIds, formatReport} = require("../scripts/audit-location-ids.js") as {
  auditLocationIds: (db: unknown) => Promise<{
    counts: Record<string, Record<string, Record<string, number>>>;
    attention: Array<{path: string; kind: string; status: string}>;
  }>;
  formatReport: (report: unknown) => string;
};

const A = "groups/g1/campaigns/a";
const B = "groups/g1/campaigns/b";

beforeAll(async () => {
  await clearProject(PROJECT);
  const batch = db.batch();
  batch.set(db.doc(`${A}/locations/rivendell`), {name: "Rivendell"});
  batch.set(db.doc(`${A}/locations/bree`), {name: "Bree"});
  // Campaign B has a place called Moria; campaign A does not.
  batch.set(db.doc(`${B}/locations/moria`), {name: "Moria"});

  batch.set(db.doc(`${A}/npcs/linked`), {name: "Elrond", locationId: "rivendell", location: "Rivendell"});
  batch.set(db.doc(`${A}/npcs/dangling`), {name: "Ghost", locationId: "deleted-place", location: "Bree"});
  batch.set(db.doc(`${A}/npcs/legacy-id`), {name: "Butterbur", location: "bree"});
  batch.set(db.doc(`${A}/npcs/legacy-name`), {name: "Arwen", location: "RIVENDELL"});
  batch.set(db.doc(`${A}/npcs/other-campaign`), {name: "Balin", location: "Moria"});
  batch.set(db.doc(`${A}/npcs/none`), {name: "Nobody"});
  batch.set(db.doc(`${A}/npcs/empty-id`), {name: "Strider", locationId: "", location: "Bree"});
  batch.set(db.doc(`${A}/quests/q1`), {title: "Reach Rivendell", location: "Rivendell"});
  batch.set(db.doc(`${B}/rumors/r1`), {title: "Drums in the deep", locationId: "moria"});
  // Not where the app keeps entities: ignored.
  batch.set(db.doc("users/u1/npcs/stray"), {name: "Stray", location: "Bree"});
  await batch.commit();
});

it("classifies each document against its own campaign's locations", async () => {
  const {counts} = await auditLocationIds(db);

  expect(counts[A].npcs).toEqual({
    "linked": 1,
    "dangling": 1,
    // "bree" is a location id; "Bree" with an empty locationId falls back
    // by name, as the app treats "" as no id.
    "legacy-id": 1,
    "legacy-name": 2,
    // Moria is campaign B's, so in A it is free text.
    "free-text": 1,
    "none": 1,
  });
  expect(counts[A].quests["legacy-name"]).toBe(1);
  expect(counts[B].rumors.linked).toBe(1);
  expect(Object.keys(counts)).toEqual(expect.arrayContaining([A, B]));
  expect(Object.keys(counts)).toHaveLength(2);
});

it("lists exactly the documents that rely on the fallback", async () => {
  const report = await auditLocationIds(db);

  expect(report.attention.map((a) => a.path).sort()).toEqual([
    `${A}/npcs/dangling`,
    `${A}/npcs/empty-id`,
    `${A}/npcs/legacy-id`,
    `${A}/npcs/legacy-name`,
    `${A}/quests/q1`,
  ]);
  expect(formatReport(report)).toContain(
    "4 document(s) resolve their place only through the fallback"
  );
});

it("writes nothing", async () => {
  const before = await db.collectionGroup("npcs").get();
  await auditLocationIds(db);
  const after = await db.collectionGroup("npcs").get();

  expect(after.docs.map((d) => [d.ref.path, d.updateTime.toMillis()])).toEqual(
    before.docs.map((d) => [d.ref.path, d.updateTime.toMillis()])
  );
});
