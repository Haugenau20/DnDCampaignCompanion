/*
 * Records' server times, notes and chapter text (T132, T133, T134): an audit,
 * a migration and its revert, one pass for all three.
 *
 * Since T132 every record write stamps `createdAt` / `modifiedAt` with the
 * server's clock beside the old `dateAdded` / `dateModified` strings; records
 * written before carry only the strings, and the rules that will check the
 * times (T132's second half) would refuse their next edit. Since T133 a
 * person's, a place's and a rumour's notes are documents of their own,
 * `{record}/{id}/notes/{noteId}`; notes written before sit in the record's
 * `notes` array. Since T134 a chapter's text is a document of its own,
 * `chapters/{id}/body/text`; a chapter written before holds it as `content`.
 * The app reads both places until this has run in production.
 *
 * For every campaign record it gives:
 *
 *   createdAt   the time `dateAdded` names, else when the document was created
 *   modifiedAt  the time `dateModified` names, else `createdAt`
 *
 * where the record has none, and moves each note of an NPC, a location or a
 * rumour into a document of its own, in the array's order, then empties the
 * array. A moved note keeps every field it had, and gains `createdAt` and
 * `modifiedAt`: the day or time it names, nudged a millisecond past the note
 * before it where needed, so the documents read back in the array's order.
 * A note that is not an object stays in the array. And it moves a chapter's
 * `content` into its body document, leaving on the chapter its length
 * (`contentLength`). Text still on a chapter is always the newest -- the app
 * empties it whenever it saves a body -- so it replaces any body there is.
 *
 * THE AUDIT WRITES NOTHING. Run it with your own Google account, which needs
 * read access to the project's Firestore; the Admin SDK uses the Application
 * Default Credentials gcloud stores for you:
 *
 *   gcloud auth application-default login
 *   cd firebase/functions
 *   node scripts/migrate-records.js --project dnd-campaign-companion
 *
 * It prints, per campaign, how many records it would give times and how many
 * notes it would move. It names no record and prints no content.
 *
 * APPLY. Only once the frontend that reads both places is live (T133's PR); a
 * browser still on the previous app writes notes into the array, and those
 * would be moved by a second run.
 *
 *   node scripts/migrate-records.js --project dnd-campaign-companion --apply --revert-file <file>
 *
 * Each record is one transaction: it is read, and its times, its emptied
 * array and its notes' documents commit together, so a note is never in
 * neither place nor in both, and a player's edit meanwhile makes Firestore run
 * it again from a fresh read. Records are independent of one another, so no
 * campaign is too large; a record with more than MAX_NOTES notes is left, and
 * named.
 *
 * REVERT. The revert file records every field written, before and after, and
 * every note and body document written. `--revert <file>` lists which records
 * still hold what the migration wrote; with `--apply` it restores those, each
 * in a transaction: a time still as written is removed, notes whose array is
 * still empty and whose documents are all as created go back into the array,
 * and a chapter's text whose body and chapter are as written goes back onto
 * the chapter, the body as it was before.
 * Anything edited since is left as it is:
 *
 *   node scripts/migrate-records.js --project dnd-campaign-companion --revert <file> [--apply]
 *
 * The revert file holds campaign content (the notes): give it a path outside
 * the repo (it will not overwrite one that exists), and keep it until no
 * revert can be wanted. `--emulator` runs any mode against the dev emulators.
 */
const fs = require("node:fs");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore");

/** Every kind of campaign record. */
const KINDS = ["npcs", "locations", "quests", "rumors", "chapters", "saga"];

/** The records whose notes become documents of their own. */
const NOTE_KINDS = ["npcs", "locations", "rumors"];

/** One transaction commits at most 500 writes: the record and its notes. */
const MAX_NOTES = 450;

/** What the migration counts. */
const COUNTS = ["createdAtGiven", "modifiedAtGiven", "notesMoved", "recordsWithNotes", "chaptersMoved"];

/**
 * The campaign a record belongs to: `groups/{g}/campaigns/{c}`, or null.
 *
 * @param {string} path The record's path
 * @return {string|null} The campaign's path
 */
function campaignOf(path) {
  const parts = path.split("/");
  if (parts.length !== 6 || parts[0] !== "groups" || parts[2] !== "campaigns") return null;
  return parts.slice(0, 4).join("/");
}

/**
 * A stored time as milliseconds, or null: a Timestamp, or a string a Date
 * reads (an ISO time, or a note's `YYYY-MM-DD` day).
 *
 * @param {unknown} value The stored value
 * @return {number|null} Its time
 */
function millisOf(value) {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value !== "string" || !value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/** Whether a field is missing: absent, or null. */
const missing = (value) => value === undefined || value === null;

/**
 * Work out one record's migration, without writing.
 *
 * @param {{path: string, data: object, createTime: Timestamp}} record The record
 * @param {() => string} newId Makes a note document's id
 * @return {{fields: Record<string, unknown>, before: Record<string, unknown>,
 *   notes: Array<{path: string, data: object}>, body: {path: string, data: object}|null,
 *   counts: Record<string, number>}} The fields to set (null deletes) and what
 *   they held (null for absent), the note documents to create, the chapter
 *   body to write, and what was done
 */
function planRecord(record, newId) {
  const {path, data} = record;
  const counts = Object.fromEntries(COUNTS.map((count) => [count, 0]));
  const fields = {};
  const before = {};

  const created = millisOf(data.createdAt) ?? millisOf(data.dateAdded) ?? record.createTime.toMillis();
  if (missing(data.createdAt)) {
    fields.createdAt = Timestamp.fromMillis(created);
    before.createdAt = data.createdAt ?? null;
    counts.createdAtGiven = 1;
  }
  if (missing(data.modifiedAt)) {
    fields.modifiedAt = Timestamp.fromMillis(millisOf(data.dateModified) ?? created);
    before.modifiedAt = data.modifiedAt ?? null;
    counts.modifiedAtGiven = 1;
  }

  const notes = [];
  const kind = path.split("/")[4];
  const held = Array.isArray(data.notes) ? data.notes : [];
  if (NOTE_KINDS.includes(kind) && held.some((note) => note && typeof note === "object")) {
    let previous = -Infinity;
    for (const note of held.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))) {
      const named = millisOf(note.createdAt) ?? millisOf(note.dateAdded) ?? millisOf(note.date) ?? created;
      const at = Math.max(named, previous + 1);
      previous = at;
      notes.push({
        path: `${path}/notes/${newId()}`,
        data: {...note, createdAt: Timestamp.fromMillis(at), modifiedAt: Timestamp.fromMillis(at)},
      });
    }
    fields.notes = held.filter((entry) => !(entry && typeof entry === "object" && !Array.isArray(entry)));
    before.notes = held;
    counts.notesMoved = notes.length;
    counts.recordsWithNotes = 1;
  }

  let body = null;
  if (kind === "chapters" && typeof data.content === "string") {
    body = {path: `${path}/body/text`, data: {content: data.content}};
    fields.content = null;
    fields.contentLength = data.content.length;
    before.content = data.content;
    before.contentLength = data.contentLength ?? null;
    counts.chaptersMoved = 1;
  }
  return {fields, before, notes, body, counts};
}

/**
 * Every campaign record, as the stream reads it.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @return {AsyncGenerator<import("firebase-admin/firestore").QueryDocumentSnapshot>} The records
 */
async function* campaignRecords(db) {
  for (const kind of KINDS) {
    for await (const doc of db.collectionGroup(kind).stream()) {
      if (campaignOf(doc.ref.path)) yield doc;
    }
  }
}

/** A planned record's fields, for reading it in a transaction. */
const recordOf = (doc) => ({path: doc.ref.path, data: doc.data(), createTime: doc.createTime});

/**
 * The audit: per campaign, what would be given and moved.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @return {Promise<Array<{campaign: string, counts: Record<string, number>,
 *   records: number, tooLarge: number}>>} One row per campaign that has records
 */
async function auditRecords(db) {
  const rows = new Map();
  let next = 0;
  for await (const doc of campaignRecords(db)) {
    const campaign = campaignOf(doc.ref.path);
    if (!rows.has(campaign)) {
      rows.set(campaign, {campaign, counts: Object.fromEntries(COUNTS.map((count) => [count, 0])), records: 0, tooLarge: 0});
    }
    const row = rows.get(campaign);
    const plan = planRecord(recordOf(doc), () => `n${next++}`);
    if (plan.notes.length > MAX_NOTES) {
      row.tooLarge += 1;
      continue;
    }
    if (Object.keys(plan.fields).length) row.records += 1;
    for (const count of COUNTS) row.counts[count] += plan.counts[count];
  }
  return [...rows.values()].sort((a, b) => a.campaign.localeCompare(b.campaign));
}

/**
 * A value as the revert file holds it: a Timestamp as `{$time: iso}`.
 *
 * @param {unknown} value A stored value
 * @return {unknown} Its JSON form
 */
function encode(value) {
  if (value instanceof Timestamp) return {$time: value.toDate().toISOString()};
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, held]) => [key, encode(held)]));
  }
  return value;
}

/**
 * A value from the revert file, as it is stored.
 *
 * @param {unknown} value Its JSON form
 * @return {unknown} The stored value
 */
function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "$time") return Timestamp.fromDate(new Date(value.$time));
    return Object.fromEntries(Object.entries(value).map(([key, held]) => [key, decode(held)]));
  }
  return value;
}

/**
 * The same value in a form two copies compare equal in, whatever order a
 * map's keys come back in.
 *
 * @param {unknown} value A value, stored or encoded
 * @return {string} Its canonical text
 */
function canonical(value) {
  const sorted = (held) => {
    if (Array.isArray(held)) return held.map(sorted);
    if (held && typeof held === "object") {
      return Object.fromEntries(Object.keys(held).sort().map((key) => [key, sorted(held[key])]));
    }
    return held === undefined ? null : held;
  };
  return JSON.stringify(sorted(encode(value)));
}

/** A field's stored form for an update: null deletes it. */
const stored = (value) => (value === null ? FieldValue.delete() : value);

/**
 * Migrate every record, each in its own transaction.
 *
 * Each record's entry is added to `record.writes` as soon as it commits, so
 * a run that fails partway still leaves a revert file for what it wrote.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @param {{project: string, migratedAt: string, writes: Array<{path: string, before: object,
 *   after: object, notes: Array<{path: string, data: object}>}>}} record The
 *   revert record, filled as records are written
 * @return {Promise<{tooLarge: string[], counts: Record<string, number>}>} The
 *   records left for holding too many notes, and the totals
 */
async function applyRecords(db, record) {
  const tooLarge = [];
  const totals = Object.fromEntries(COUNTS.map((count) => [count, 0]));
  const paths = [];
  for await (const doc of campaignRecords(db)) paths.push(doc.ref.path);

  for (const path of paths) {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(db.doc(path));
      if (!doc.exists) return {};
      const plan = planRecord(recordOf(doc), () => db.collection(`${path}/notes`).doc().id);
      if (plan.notes.length > MAX_NOTES) return {tooLarge: true};
      if (Object.keys(plan.fields).length === 0) return {};
      // Every read before the first write: the body this replaces, for the revert.
      const bodyBefore = plan.body ? await transaction.get(db.doc(plan.body.path)) : null;
      transaction.update(db.doc(path), Object.fromEntries(
        Object.entries(plan.fields).map(([field, value]) => [field, stored(value)])));
      for (const note of plan.notes) transaction.create(db.doc(note.path), note.data);
      if (plan.body) transaction.set(db.doc(plan.body.path), plan.body.data);
      const body = plan.body &&
        {path: plan.body.path, data: plan.body.data, before: bodyBefore.exists ? bodyBefore.data() : null};
      return {plan: {...plan, body}};
    });
    if (result.tooLarge) {
      tooLarge.push(path);
      continue;
    }
    if (!result.plan) continue;
    const {fields, before, notes, body, counts} = result.plan;
    record.writes.push({path, before: encode(before), after: encode(fields), notes: encode(notes), body: encode(body)});
    for (const count of COUNTS) totals[count] += counts[count];
  }
  return {tooLarge, counts: totals};
}

/**
 * Revert: restore what each recorded record still holds as the migration
 * left it, each record in a transaction. Without `apply`, only sorts them.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @param {{writes: Array<{path: string, before: object, after: object,
 *   notes: Array<{path: string, data: object}>}>}} record The revert file
 * @param {boolean} apply Whether to write
 * @return {Promise<{unchanged: string[], changed: string[]}>} The records
 *   wholly as the migration left them, and those with something edited since
 */
async function revertRecords(db, record, apply) {
  const unchanged = [];
  const changed = [];
  for (const write of record.writes) {
    const whole = await db.runTransaction(async (transaction) => {
      const body = write.body ?? null;
      const [doc, ...others] = await transaction.getAll(
        db.doc(write.path), ...write.notes.map((note) => db.doc(note.path)), ...(body ? [db.doc(body.path)] : []));
      const noteDocs = others.slice(0, write.notes.length);
      const bodyDoc = body ? others[write.notes.length] : null;
      if (!doc.exists) return false;
      const data = doc.data();
      const restore = {};
      let leftSome = false;
      for (const field of ["createdAt", "modifiedAt"]) {
        if (!(field in write.after)) continue;
        if (canonical(data[field]) === canonical(write.after[field])) restore[field] = stored(decode(write.before[field]));
        else leftSome = true;
      }
      const notesAsLeft = "notes" in write.after &&
        canonical(data.notes) === canonical(write.after.notes) &&
        noteDocs.every((note, i) => note.exists && canonical(note.data()) === canonical(write.notes[i].data));
      if (notesAsLeft) restore.notes = decode(write.before.notes);
      else if ("notes" in write.after) leftSome = true;

      // A chapter's text goes back only while neither place was written since.
      const textAsLeft = body !== null &&
        canonical(data.content) === canonical(null) &&
        canonical(data.contentLength) === canonical(write.after.contentLength) &&
        bodyDoc.exists && canonical(bodyDoc.data()) === canonical(body.data);
      if (textAsLeft) {
        restore.content = decode(write.before.content);
        restore.contentLength = stored(decode(write.before.contentLength));
      } else if (body) leftSome = true;

      if (apply) {
        if (Object.keys(restore).length) transaction.update(db.doc(write.path), restore);
        if (notesAsLeft) noteDocs.forEach((note) => transaction.delete(note.ref));
        if (textAsLeft) {
          if (body.before === null) transaction.delete(bodyDoc.ref);
          else transaction.set(bodyDoc.ref, decode(body.before));
        }
      }
      return !leftSome;
    }, apply ? {} : {readOnly: true});
    (whole ? unchanged : changed).push(write.path);
  }
  return {unchanged: unchanged.sort(), changed: changed.sort()};
}

/**
 * The audit as text: per campaign, then totals. No record is named.
 *
 * @param {Awaited<ReturnType<typeof auditRecords>>} rows The audit
 * @return {string} What the script prints
 */
function formatAudit(rows) {
  const totals = Object.fromEntries(COUNTS.map((count) => [count, 0]));
  let records = 0;
  let tooLarge = 0;
  const line = (counts, written, left) =>
    `${COUNTS.map((count) => `${count} ${counts[count]}`).join(" · ")} · records to write ${written}` +
    (left ? ` · left, more than ${MAX_NOTES} notes ${left}` : "");
  const lines = [];
  for (const row of rows) {
    lines.push(`${row.campaign}`, `  ${line(row.counts, row.records, row.tooLarge)}`);
    for (const count of COUNTS) totals[count] += row.counts[count];
    records += row.records;
    tooLarge += row.tooLarge;
  }
  lines.push("", "Totals", `  ${line(totals, records, tooLarge)}`);
  return lines.join("\n");
}

/**
 * Parse the arguments, connect, then audit, migrate or revert.
 *
 * @return {Promise<void>}
 */
async function main() {
  const args = process.argv.slice(2);
  const valueOf = (name) => {
    const at = args.indexOf(name);
    return at >= 0 ? args[at + 1] : undefined;
  };
  const emulator = args.includes("--emulator");
  const apply = args.includes("--apply");
  const projectId = valueOf("--project");
  const revertFrom = valueOf("--revert");
  const revertFile = valueOf("--revert-file");
  const valued = ["--project", "--revert", "--revert-file"];
  const unknown = args.filter((arg, i) =>
    !valued.includes(args[i - 1]) && ![...valued, "--emulator", "--apply"].includes(arg));
  if (unknown.length) console.error(`Unknown argument(s): ${unknown.join(" ")}`);
  if (unknown.length || !projectId || (apply && !revertFrom && !revertFile) || (revertFrom && revertFile)) {
    console.error(
      "Usage: node scripts/migrate-records.js --project <project-id> [--emulator]\n" +
      "         [--apply --revert-file <file> | --revert <file> [--apply]]"
    );
    process.exitCode = 2;
    return;
  }
  if (emulator) {
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  } else {
    delete process.env.FIRESTORE_EMULATOR_HOST;
  }
  const where = `${projectId}${emulator ? " (emulator)" : ""}`;
  const db = getFirestore(getApps()[0] ?? initializeApp({projectId}));

  if (revertFrom) {
    const record = JSON.parse(fs.readFileSync(revertFrom, "utf8"));
    if (record.project !== projectId) {
      console.error(`${revertFrom} records a migration of ${record.project}, not ${projectId}.`);
      process.exitCode = 2;
      return;
    }
    console.error(`Reverting the migration of ${record.migratedAt} on ${where}${apply ? "" : ", read-only"}...`);
    const {unchanged, changed} = await revertRecords(db, record, apply);
    console.log(`${unchanged.length} record(s) still as the migration left them${apply ? ", restored" : ", to be restored"}.`);
    if (changed.length) {
      console.log(`${changed.length} edited since, or gone; what was edited is left as it is${apply ? ", the rest restored" : ""}:`);
      for (const path of changed) console.log(`  ${path}`);
    }
    if (!apply) console.log("Nothing has been changed. Run again with --apply to restore them.");
    return;
  }

  if (apply) {
    // Claim the revert file before writing anything.
    const out = fs.openSync(revertFile, "wx");
    console.error(`Migrating ${where}...`);
    const record = {project: projectId, migratedAt: new Date().toISOString(), writes: []};
    let result;
    try {
      result = await applyRecords(db, record);
    } finally {
      fs.writeFileSync(out, JSON.stringify(record, null, 2));
      fs.closeSync(out);
    }
    console.log(`Wrote ${record.writes.length} record(s); the revert file is ${revertFile}.`);
    console.log(`  ${COUNTS.map((count) => `${count} ${result.counts[count]}`).join(" · ")}`);
    if (result.tooLarge.length) {
      console.log(`${result.tooLarge.length} record(s) left: more than ${MAX_NOTES} notes each.`);
      for (const path of result.tooLarge) console.log(`  ${path}`);
    }
    return;
  }

  console.error(`Auditing ${where}, read-only...`);
  console.log(formatAudit(await auditRecords(db)));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  COUNTS,
  MAX_NOTES,
  planRecord,
  auditRecords,
  applyRecords,
  revertRecords,
  formatAudit,
};
