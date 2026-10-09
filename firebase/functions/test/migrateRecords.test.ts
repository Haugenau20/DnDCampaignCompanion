// functions/test/migrateRecords.test.ts
//
// scripts/migrate-records.js (T132, T133): give every campaign record the
// server times it lacks, move a person's, a place's and a rumour's notes into
// documents of their own -- each record in one transaction -- and undo
// exactly that.
import {Timestamp} from "firebase-admin/firestore";
import {useEmulatorProject, clearProject} from "./emulator";

const PROJECT = "demo-migrate-records";
const db = useEmulatorProject(PROJECT);

type Counts = Record<string, number>;
type Write = {path: string; before: object; after: object; notes: Array<{path: string; data: object}>};
type RevertRecord = {project: string; migratedAt: string; writes: Write[]};

// A plain-JS operator script, so required rather than imported.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const script = require("../scripts/migrate-records.js") as {
  MAX_NOTES: number;
  auditRecords: (db: unknown) =>
    Promise<Array<{campaign: string; counts: Counts; records: number; tooLarge: number}>>;
  applyRecords: (db: unknown, record: RevertRecord) => Promise<{tooLarge: string[]; counts: Counts}>;
  revertRecords: (db: unknown, record: RevertRecord, apply: boolean) =>
    Promise<{unchanged: string[]; changed: string[]}>;
  formatAudit: (rows: unknown) => string;
};

const A = "groups/g1/campaigns/a";
const B = "groups/g1/campaigns/b";
const NOW = Timestamp.fromDate(new Date("2026-10-09T08:00:00.000Z"));

/**
 * Campaign A holds records from before T132 and T133; campaign B's were
 * written since, and need nothing.
 */
async function seed(): Promise<void> {
  await clearProject(PROJECT);
  const batch = db.batch();
  batch.set(db.doc(`${A}/npcs/aldric`), {
    name: "Aldric",
    dateAdded: "2025-05-01T10:00:00.000Z",
    dateModified: "2025-06-01T10:00:00.000Z",
    notes: [
      {date: "2025-05-31", text: "Mends armour", author: "Wren"},
      // Same day as the one before: kept after it.
      {date: "2025-05-31", text: "Owes us a sword"},
      // Older than the one before, as an edited array can be: still after it.
      {date: "2025-04-02", text: "Seen in Bree"},
    ],
  });
  batch.set(db.doc(`${A}/locations/bree`), {name: "Bree", dateAdded: "2025-03-01T00:00:00.000Z", notes: []});
  batch.set(db.doc(`${A}/rumors/smoke`), {
    title: "Smoke",
    content: "",
    dateAdded: "2025-02-01T00:00:00.000Z",
    notes: [{id: "r-n1", content: "Seen twice", createdBy: "u1", dateAdded: "2025-02-03T09:00:00.000Z"}, "not a note"],
  });
  // A quest keeps no notes: only its times.
  batch.set(db.doc(`${A}/quests/ring`), {title: "The Ring", dateAdded: "not a date", notes: [{text: "kept"}]});
  batch.set(db.doc(`${A}/saga/sagaData`), {title: "Saga", content: ""});
  batch.set(db.doc(`${B}/npcs/sam`), {name: "Sam", createdAt: NOW, modifiedAt: NOW, notes: []});
  // Not a campaign record.
  batch.set(db.doc("groups/g1/users/u1/notes/private"), {content: "Mine", campaignId: "a"});
  await batch.commit();
}

const data = async (path: string) => (await db.doc(path).get()).data();
const notesOf = async (path: string) =>
  (await db.collection(`${path}/notes`).orderBy("createdAt").get()).docs.map((doc) => doc.data());
const fresh = (): RevertRecord => ({project: PROJECT, migratedAt: new Date().toISOString(), writes: []});
const iso = (value: unknown) => (value as Timestamp).toDate().toISOString();

beforeEach(seed);

describe("migrate-records", () => {
  it("audits without writing, counting per campaign and naming nothing", async () => {
    const before = await data(`${A}/npcs/aldric`);
    const rows = await script.auditRecords(db);

    expect(rows.map((row) => row.campaign)).toEqual([A, B]);
    expect(rows[0]).toMatchObject({
      counts: {createdAtGiven: 5, modifiedAtGiven: 5, notesMoved: 4, recordsWithNotes: 2},
      records: 5,
    });
    expect(rows[1].records).toBe(0);
    expect(await data(`${A}/npcs/aldric`)).toEqual(before);
    const text = script.formatAudit(rows);
    expect(text).not.toContain("Aldric");
    expect(text).not.toContain("Mends armour");
  });

  it("gives each record the times its strings name, else when it was created", async () => {
    await script.applyRecords(db, fresh());

    const aldric = (await data(`${A}/npcs/aldric`))!;
    expect(iso(aldric.createdAt)).toBe("2025-05-01T10:00:00.000Z");
    expect(iso(aldric.modifiedAt)).toBe("2025-06-01T10:00:00.000Z");
    const bree = (await data(`${A}/locations/bree`))!;
    expect(iso(bree.modifiedAt)).toBe(iso(bree.createdAt));
    // No string to read: the document's own creation.
    const ring = await db.doc(`${A}/quests/ring`).get();
    expect(ring.data()!.createdAt.toMillis()).toBe(ring.createTime!.toMillis());
    // Already given since T132: left alone.
    expect((await data(`${B}/npcs/sam`))!.createdAt).toEqual(NOW);
  });

  it("moves each note into a document of its own, in the array's order, and empties the array", async () => {
    const {counts} = await script.applyRecords(db, fresh());

    expect(counts).toEqual({createdAtGiven: 5, modifiedAtGiven: 5, notesMoved: 4, recordsWithNotes: 2});
    expect((await data(`${A}/npcs/aldric`))!.notes).toEqual([]);
    const moved = await notesOf(`${A}/npcs/aldric`);
    expect(moved.map((note) => note.text)).toEqual(["Mends armour", "Owes us a sword", "Seen in Bree"]);
    expect(moved[0]).toMatchObject({date: "2025-05-31", author: "Wren"});
    expect(iso(moved[0].createdAt)).toBe("2025-05-31T00:00:00.000Z");
    expect(iso(moved[1].createdAt)).toBe("2025-05-31T00:00:00.001Z");
    expect(iso(moved[2].createdAt)).toBe("2025-05-31T00:00:00.002Z");

    const rumour = await notesOf(`${A}/rumors/smoke`);
    expect(rumour).toEqual([expect.objectContaining({id: "r-n1", content: "Seen twice", createdBy: "u1"})]);
    expect(iso(rumour[0].createdAt)).toBe("2025-02-03T09:00:00.000Z");
    // What is not a note stays where it was.
    expect((await data(`${A}/rumors/smoke`))!.notes).toEqual(["not a note"]);
    // A quest's array is not a note list the app reads as documents.
    expect((await data(`${A}/quests/ring`))!.notes).toEqual([{text: "kept"}]);
    expect(await notesOf(`${A}/quests/ring`)).toEqual([]);
    expect(await data("groups/g1/users/u1/notes/private")).toEqual({content: "Mine", campaignId: "a"});
  });

  it("changes nothing a second time", async () => {
    await script.applyRecords(db, fresh());
    const second = fresh();
    const {counts} = await script.applyRecords(db, second);

    expect(second.writes).toEqual([]);
    expect(counts.notesMoved).toBe(0);
    expect(await notesOf(`${A}/npcs/aldric`)).toHaveLength(3);
  });

  it("moves a note written into the array by a browser still on the old app, on a second run", async () => {
    await script.applyRecords(db, fresh());
    await db.doc(`${A}/npcs/aldric`).update({notes: [{date: "2026-10-09", text: "Late"}]});
    await script.applyRecords(db, fresh());

    expect((await notesOf(`${A}/npcs/aldric`)).map((note) => note.text))
      .toEqual(["Mends armour", "Owes us a sword", "Seen in Bree", "Late"]);
  });

  it("leaves a record with more notes than one commit holds, and names it", async () => {
    const many = Array.from({length: script.MAX_NOTES + 1}, (_, i) => ({date: "2025-01-01", text: `n${i}`}));
    await db.doc(`${A}/npcs/aldric`).update({notes: many});

    const {tooLarge} = await script.applyRecords(db, fresh());

    expect(tooLarge).toEqual([`${A}/npcs/aldric`]);
    expect((await data(`${A}/npcs/aldric`))!.notes).toHaveLength(script.MAX_NOTES + 1);
    expect((await data(`${A}/npcs/aldric`))!.createdAt).toBeUndefined();
  });

  it("reverts exactly what it wrote", async () => {
    const before = await data(`${A}/npcs/aldric`);
    const record = fresh();
    await script.applyRecords(db, record);
    // Through the revert file, as the script reads it back.
    const fromFile = JSON.parse(JSON.stringify(record)) as RevertRecord;

    const dryRun = await script.revertRecords(db, fromFile, false);
    expect(dryRun.changed).toEqual([]);
    expect((await data(`${A}/npcs/aldric`))!.notes).toEqual([]);

    const {unchanged} = await script.revertRecords(db, fromFile, true);
    expect(unchanged).toHaveLength(5);
    expect(await data(`${A}/npcs/aldric`)).toEqual(before);
    expect(await notesOf(`${A}/npcs/aldric`)).toEqual([]);
    expect((await data(`${A}/rumors/smoke`))!.notes).toHaveLength(2);
  });

  it("leaves what was edited since: a note changed in its document, a record changed after", async () => {
    const record = fresh();
    await script.applyRecords(db, record);
    const fromFile = JSON.parse(JSON.stringify(record)) as RevertRecord;
    const [first] = (await db.collection(`${A}/npcs/aldric/notes`).orderBy("createdAt").limit(1).get()).docs;
    await first.ref.update({text: "Mends armour and blades"});
    await db.doc(`${A}/locations/bree`).update({modifiedAt: NOW});

    const {unchanged, changed} = await script.revertRecords(db, fromFile, true);

    expect(changed).toEqual([`${A}/locations/bree`, `${A}/npcs/aldric`]);
    expect(unchanged).toHaveLength(3);
    // Aldric's notes stay documents, the edit with them; his times go back.
    expect((await data(`${A}/npcs/aldric`))!.notes).toEqual([]);
    expect((await notesOf(`${A}/npcs/aldric`)).map((note) => note.text)[0]).toBe("Mends armour and blades");
    expect((await data(`${A}/npcs/aldric`))!.createdAt).toBeUndefined();
    // Bree's createdAt goes back; the modifiedAt set since stays.
    expect((await data(`${A}/locations/bree`))!.createdAt).toBeUndefined();
    expect((await data(`${A}/locations/bree`))!.modifiedAt).toEqual(NOW);
  });
});
