/*
 * Links stored once (T131): an audit, a migration and its revert.
 *
 * Several links between campaign records were stored on both records, and
 * each page edited only its own half, so a link added on one page was missing
 * on the other. Since T131 every link has one owner field, which both pages
 * read (src/features/campaign-entities/shared/links.ts):
 *
 *   person <-> quest   Quest.relatedNPCIds          old half: NPC.connections.relatedQuests
 *   person <-> place   Location.connectedNPCs        old half: NPC.locationId
 *   place  <-> quest   Quest.locationId, keyLocations old half: Location.relatedQuests
 *   person <-> person  NPC.connections.relatedNPCs, on one of the two
 *
 * The app reads the old halves too, until this has run in production. It
 * merges each old half into its owner and clears it, so what anyone sees does
 * not change; it also stores a person-to-person link held on both people on
 * one of them, gives a quest's place written before #1421 the id of the one
 * place its name matches, and removes from every list an id that names no record (what
 * deleting a record used to leave behind). A single reference to a place that
 * no longer exists -- a quest's or a rumour's `locationId`, a person's old
 * `locationId` -- is left, visible as one (#1412). A rumour's two place
 * fields are not halves of one link and are not touched.
 *
 * THE AUDIT WRITES NOTHING. Run it with your own Google account, which needs
 * read access to the project's Firestore; the Admin SDK uses the Application
 * Default Credentials gcloud stores for you:
 *
 *   gcloud auth application-default login
 *   cd firebase/functions
 *   node scripts/migrate-links.js --project dnd-campaign-companion
 *
 * It prints, per campaign, how many links each step would move, and how many
 * documents it would write. It names no record and prints no content.
 *
 * APPLY. Only once the frontend that reads both halves is live (T131's first
 * PR); a browser still on the previous app writes old halves.
 *
 *   node scripts/migrate-links.js --project dnd-campaign-companion --apply --revert-file <file>
 *
 * Each campaign is one transaction: its records are read, the merge is worked
 * out, and every write commits together, so a link is never cleared from one
 * record without being added to the other, and a player's edit meanwhile
 * makes Firestore run that campaign again from fresh reads. A campaign whose
 * merge would take more than MAX_WRITES writes is left, and named.
 *
 * REVERT. The revert file records every field written, before and after.
 * `--revert <file>` lists which documents still hold what the migration
 * wrote; with `--apply` it restores those, each campaign in a transaction,
 * and leaves any document edited since as it is:
 *
 *   node scripts/migrate-links.js --project dnd-campaign-companion --revert <file> [--apply]
 *
 * The revert file names campaign records: give it a path outside the repo (it
 * will not overwrite one that exists), and keep it until no revert can be
 * wanted. `--emulator` runs any mode against the dev emulators.
 */
const fs = require("node:fs");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");

/** The record collections a campaign holds links in. */
const KINDS = ["npcs", "quests", "locations", "rumors"];

/** One transaction commits at most 500 writes; this leaves room. */
const MAX_WRITES = 450;

/** What each step of the merge counts. */
const STEPS = [
  "personQuestMerged",
  "personPlaceMerged",
  "placeQuestMerged",
  "personPersonDeduplicated",
  "placeIdsGiven",
  "danglingRemoved",
];

/**
 * The campaign a document belongs to: `groups/{g}/campaigns/{c}`, or null.
 *
 * @param {string} path The document's path
 * @return {string|null} The campaign's path
 */
function campaignOf(path) {
  const parts = path.split("/");
  if (parts.length !== 6 || parts[0] !== "groups" || parts[2] !== "campaigns") return null;
  return parts.slice(0, 4).join("/");
}

/** A list of strings from a stored value, or empty. */
const ids = (value) => (Array.isArray(value) ? value.filter((id) => typeof id === "string" && id) : []);

/**
 * The same value in a form two copies compare equal in, whatever order a
 * map's keys come back in.
 *
 * @param {unknown} value A stored value
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
  return JSON.stringify(sorted(value));
}

/**
 * Whether a quest names a place: as its location, by a place's stored id, or,
 * for a place with no id, by its name -- as the app's `keyPlaceIsLocation`.
 *
 * @param {object} quest The quest's data
 * @param {{id: string, name: string}} place The place
 * @return {boolean} Whether it does
 */
function questNamesPlace(quest, place) {
  if (quest.locationId && quest.locationId === place.id) return true;
  const places = Array.isArray(quest.keyLocations) ? quest.keyLocations : [];
  return places.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    if (entry.locationId) return entry.locationId === place.id;
    const lower = String(entry.name ?? "").toLowerCase();
    return lower === place.id.toLowerCase() || lower === String(place.name ?? "").toLowerCase();
  });
}

/**
 * Work out one campaign's merge, without writing.
 *
 * @param {Record<string, Array<{path: string, id: string, data: object}>>} campaign
 *   The campaign's records, by collection
 * @return {{writes: Map<string, Record<string, unknown>>,
 *   before: Map<string, Record<string, unknown>>,
 *   counts: Record<string, number>}} For each document to write, the fields
 *   after and before (null for a field that is absent), and what moved
 */
function planCampaign(campaign) {
  const counts = Object.fromEntries(STEPS.map((step) => [step, 0]));
  // Working copies, so each step sees what the steps before it changed.
  const records = {};
  for (const kind of KINDS) {
    records[kind] = new Map((campaign[kind] ?? []).map((record) =>
      [record.id, {path: record.path, data: structuredClone(record.data)}]));
  }
  const {npcs, quests, locations, rumors} = records;
  const before = new Map();
  const changed = new Map();

  /** Set one field on a working copy, remembering what it held. */
  const set = (record, field, value) => {
    const original = before.get(record.path) ?? {};
    if (!(field in original)) {
      const parts = field.split(".");
      const held = parts.reduce((value, key) => (value == null ? undefined : value[key]), record.data);
      original[field] = held === undefined ? null : structuredClone(held);
      before.set(record.path, original);
    }
    const parts = field.split(".");
    let target = record.data;
    for (const key of parts.slice(0, -1)) {
      target[key] = target[key] && typeof target[key] === "object" ? target[key] : {};
      target = target[key];
    }
    target[parts[parts.length - 1]] = value;
    const fields = changed.get(record.path) ?? {};
    fields[field] = value;
    changed.set(record.path, fields);
  };

  // person <-> quest: into the quest's list.
  for (const [npcId, npc] of npcs) {
    const old = ids(npc.data.connections?.relatedQuests);
    if (old.length === 0) continue;
    for (const questId of old) {
      const quest = quests.get(questId);
      if (!quest) continue;
      const people = ids(quest.data.relatedNPCIds);
      if (!people.includes(npcId)) {
        set(quest, "relatedNPCIds", [...people, npcId]);
        counts.personQuestMerged += 1;
      }
    }
    set(npc, "connections.relatedQuests", []);
  }

  // person <-> place: into the place's list. A person's old place that no
  // longer exists stays, visible as one.
  for (const [npcId, npc] of npcs) {
    const placeId = typeof npc.data.locationId === "string" ? npc.data.locationId : "";
    const place = placeId ? locations.get(placeId) : undefined;
    if (!place) continue;
    const people = ids(place.data.connectedNPCs);
    if (!people.includes(npcId)) {
      set(place, "connectedNPCs", [...people, npcId]);
      counts.personPlaceMerged += 1;
    }
    set(npc, "locationId", "");
  }

  // place <-> quest: onto the quest, as its location when it has none, else
  // as one of its places.
  for (const [placeId, place] of locations) {
    const old = ids(place.data.relatedQuests);
    if (old.length === 0) continue;
    const named = {id: placeId, name: String(place.data.name ?? placeId)};
    for (const questId of old) {
      const quest = quests.get(questId);
      if (!quest || questNamesPlace(quest.data, named)) continue;
      if (!quest.data.locationId) {
        set(quest, "locationId", placeId);
        set(quest, "location", named.name);
      } else {
        const entries = Array.isArray(quest.data.keyLocations) ? quest.data.keyLocations : [];
        set(quest, "keyLocations", [...entries, {name: named.name, description: "", locationId: placeId}]);
      }
      counts.placeQuestMerged += 1;
    }
    set(place, "relatedQuests", []);
  }

  // person <-> person: held on both, kept on the one whose id sorts first.
  for (const [npcId, npc] of npcs) {
    for (const otherId of ids(npc.data.connections?.relatedNPCs)) {
      const other = npcs.get(otherId);
      if (!other || otherId <= npcId) continue;
      const theirs = ids(other.data.connections?.relatedNPCs);
      if (theirs.includes(npcId)) {
        set(other, "connections.relatedNPCs", theirs.filter((id) => id !== npcId));
        counts.personPersonDeduplicated += 1;
      }
    }
  }

  // A quest's place written before #1421 holds only a name: given the id of
  // the one place it names, by id or by name as the app matches it. A name
  // two places share is left; which one it means is a guess.
  const byName = new Map();
  for (const [placeId, place] of locations) {
    for (const key of new Set([placeId.toLowerCase(), String(place.data.name ?? "").toLowerCase()])) {
      if (!key) continue;
      byName.set(key, byName.has(key) && byName.get(key) !== placeId ? null : placeId);
    }
  }
  for (const quest of quests.values()) {
    const entries = Array.isArray(quest.data.keyLocations) ? quest.data.keyLocations : [];
    const named = entries.map((entry) => {
      if (!entry || typeof entry !== "object" || entry.locationId) return entry;
      const placeId = byName.get(String(entry.name ?? "").toLowerCase());
      if (!placeId) return entry;
      counts.placeIdsGiven += 1;
      return {...entry, locationId: placeId};
    });
    if (named.some((entry, i) => entry !== entries[i])) set(quest, "keyLocations", named);
  }

  // Ids in lists that name no record.
  const strip = (record, field, list, exists) => {
    const kept = list.filter(exists);
    if (kept.length !== list.length) {
      set(record, field, kept);
      counts.danglingRemoved += list.length - kept.length;
    }
  };
  const isNpc = (id) => npcs.has(id);
  const isPlace = (id) => locations.has(id);
  for (const quest of quests.values()) {
    strip(quest, "relatedNPCIds", ids(quest.data.relatedNPCIds), isNpc);
    const entries = Array.isArray(quest.data.keyLocations) ? quest.data.keyLocations : [];
    if (entries.some((entry) => entry?.locationId && !isPlace(entry.locationId))) {
      set(quest, "keyLocations", entries.map((entry) => {
        if (!entry?.locationId || isPlace(entry.locationId)) return entry;
        // eslint-disable-next-line no-unused-vars
        const {locationId, ...rest} = entry;
        counts.danglingRemoved += 1;
        return rest;
      }));
    }
  }
  for (const place of locations.values()) strip(place, "connectedNPCs", ids(place.data.connectedNPCs), isNpc);
  for (const npc of npcs.values()) {
    strip(npc, "connections.relatedNPCs", ids(npc.data.connections?.relatedNPCs), isNpc);
  }
  for (const rumor of rumors.values()) {
    strip(rumor, "relatedNPCs", ids(rumor.data.relatedNPCs), isNpc);
    strip(rumor, "relatedLocations", ids(rumor.data.relatedLocations), isPlace);
  }

  // A field set back to what it held is no write.
  const writes = new Map();
  for (const [path, fields] of changed) {
    const original = before.get(path);
    const real = Object.fromEntries(Object.entries(fields)
      .filter(([field, value]) => canonical(value) !== canonical(original[field])));
    if (Object.keys(real).length) writes.set(path, real);
  }
  const beforeOfWrites = new Map([...writes.keys()].map((path) => [path, Object.fromEntries(
    Object.keys(writes.get(path)).map((field) => [field, before.get(path)[field]]))]));
  return {writes, before: beforeOfWrites, counts};
}

/**
 * Every campaign's records, by campaign and collection.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @return {Promise<Map<string, Record<string, Array<{path: string, id: string, data: object}>>>>}
 *   The campaigns
 */
async function readCampaigns(db) {
  const campaigns = new Map();
  for (const kind of KINDS) {
    for await (const doc of db.collectionGroup(kind).stream()) {
      const campaign = campaignOf(doc.ref.path);
      if (!campaign) continue;
      if (!campaigns.has(campaign)) campaigns.set(campaign, Object.fromEntries(KINDS.map((k) => [k, []])));
      campaigns.get(campaign)[kind].push({path: doc.ref.path, id: doc.id, data: doc.data()});
    }
  }
  return campaigns;
}

/**
 * The audit: each campaign's counts, and how many documents it would write.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @return {Promise<Array<{campaign: string, counts: Record<string, number>, documents: number}>>}
 *   One row per campaign that has records
 */
async function auditLinks(db) {
  const rows = [];
  for (const [campaign, records] of await readCampaigns(db)) {
    const {writes, counts} = planCampaign(records);
    rows.push({campaign, counts, documents: writes.size});
  }
  return rows.sort((a, b) => a.campaign.localeCompare(b.campaign));
}

/**
 * Read one campaign's records inside a transaction.
 *
 * @param {import("firebase-admin/firestore").Transaction} transaction The transaction
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @param {string} campaign The campaign's path
 * @return {Promise<Record<string, Array<{path: string, id: string, data: object}>>>} Its records
 */
async function readCampaignIn(transaction, db, campaign) {
  const records = {};
  for (const kind of KINDS) {
    const snapshot = await transaction.get(db.collection(`${campaign}/${kind}`));
    records[kind] = snapshot.docs.map((doc) => ({path: doc.ref.path, id: doc.id, data: doc.data()}));
  }
  return records;
}

/** A field's stored form for an update: null deletes it. */
const stored = (value) => (value === null ? FieldValue.delete() : value);

/**
 * Migrate every campaign, each in its own transaction.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @param {string} project The project, recorded so a revert cannot be aimed at another
 * @return {Promise<{record: {project: string, migratedAt: string,
 *   writes: Array<{path: string, before: object, after: object}>},
 *   tooLarge: string[], counts: Record<string, number>}>} The revert record,
 *   the campaigns left for being too large, and the totals moved
 */
async function applyLinks(db, project) {
  const written = [];
  const tooLarge = [];
  const totals = Object.fromEntries(STEPS.map((step) => [step, 0]));
  for (const campaign of (await readCampaigns(db)).keys()) {
    const result = await db.runTransaction(async (transaction) => {
      const plan = planCampaign(await readCampaignIn(transaction, db, campaign));
      if (plan.writes.size > MAX_WRITES) return {tooLarge: true};
      for (const [path, fields] of plan.writes) {
        transaction.update(db.doc(path), Object.fromEntries(
          Object.entries(fields).map(([field, value]) => [field, stored(value)])));
      }
      return {plan};
    });
    if (result.tooLarge) {
      tooLarge.push(campaign);
      continue;
    }
    for (const [path, after] of result.plan.writes) {
      written.push({path, before: result.plan.before.get(path), after});
    }
    for (const step of STEPS) totals[step] += result.plan.counts[step];
  }
  written.sort((a, b) => a.path.localeCompare(b.path));
  return {record: {project, migratedAt: new Date().toISOString(), writes: written}, tooLarge, counts: totals};
}

/**
 * A field's value in a document's data, `null` when absent.
 *
 * @param {object|undefined} data The document's data
 * @param {string} field A field path
 * @return {unknown} The value
 */
function fieldOf(data, field) {
  const value = field.split(".").reduce((held, key) => (held == null ? undefined : held[key]), data);
  return value === undefined ? null : value;
}

/**
 * Revert: restore each recorded document that still holds what the migration
 * wrote, each campaign in a transaction. Without `apply`, only sorts them.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @param {{writes: Array<{path: string, before: object, after: object}>}} record The revert file
 * @param {boolean} apply Whether to write
 * @return {Promise<{unchanged: string[], changed: string[]}>} The paths of each
 */
async function revertLinks(db, record, apply) {
  const unchanged = [];
  const changed = [];
  const byCampaign = new Map();
  for (const write of record.writes) {
    const campaign = campaignOf(write.path) ?? "";
    if (!byCampaign.has(campaign)) byCampaign.set(campaign, []);
    byCampaign.get(campaign).push(write);
  }
  for (const writes of byCampaign.values()) {
    const sorted = await db.runTransaction(async (transaction) => {
      const docs = await transaction.getAll(...writes.map((write) => db.doc(write.path)));
      const keep = [];
      const leave = [];
      writes.forEach((write, i) => {
        const data = docs[i].exists ? docs[i].data() : undefined;
        const holds = docs[i].exists && Object.entries(write.after)
          .every(([field, value]) => canonical(fieldOf(data, field)) === canonical(value));
        (holds ? keep : leave).push(write);
      });
      if (apply) {
        for (const write of keep) {
          transaction.update(db.doc(write.path), Object.fromEntries(
            Object.entries(write.before).map(([field, value]) => [field, stored(value)])));
        }
      }
      return {keep, leave};
    }, apply ? {} : {readOnly: true});
    unchanged.push(...sorted.keep.map((write) => write.path));
    changed.push(...sorted.leave.map((write) => write.path));
  }
  return {unchanged: unchanged.sort(), changed: changed.sort()};
}

/**
 * The audit as text: per campaign, then totals. No record is named.
 *
 * @param {Awaited<ReturnType<typeof auditLinks>>} rows The audit
 * @return {string} What the script prints
 */
function formatAudit(rows) {
  const totals = Object.fromEntries(STEPS.map((step) => [step, 0]));
  let documents = 0;
  const line = (counts) => STEPS.map((step) => `${step} ${counts[step]}`).join(" · ");
  const lines = [];
  for (const row of rows) {
    lines.push(`${row.campaign}`, `  ${line(row.counts)} · documents to write ${row.documents}`);
    for (const step of STEPS) totals[step] += row.counts[step];
    documents += row.documents;
  }
  lines.push("", "Totals", `  ${line(totals)} · documents to write ${documents}`);
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
      "Usage: node scripts/migrate-links.js --project <project-id> [--emulator]\n" +
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
    const {unchanged, changed} = await revertLinks(db, record, apply);
    console.log(`${unchanged.length} document(s) still as the migration left them${apply ? ", restored" : ", to be restored"}.`);
    if (changed.length) {
      console.log(`${changed.length} edited since, or gone, and left as they are:`);
      for (const path of changed) console.log(`  ${path}`);
    }
    if (!apply) console.log("Nothing has been changed. Run again with --apply to restore them.");
    return;
  }

  if (apply) {
    // Claim the revert file before writing anything.
    const out = fs.openSync(revertFile, "wx");
    console.error(`Migrating ${where}...`);
    let result;
    try {
      result = await applyLinks(db, projectId);
    } finally {
      fs.writeFileSync(out, JSON.stringify(result?.record ??
        {project: projectId, migratedAt: new Date().toISOString(), writes: []}, null, 2));
      fs.closeSync(out);
    }
    console.log(`Wrote ${result.record.writes.length} document(s); the revert file is ${revertFile}.`);
    console.log(`  ${STEPS.map((step) => `${step} ${result.counts[step]}`).join(" · ")}`);
    if (result.tooLarge.length) {
      console.log(`${result.tooLarge.length} campaign(s) left: more than ${MAX_WRITES} writes each.`);
      for (const campaign of result.tooLarge) console.log(`  ${campaign}`);
    }
    return;
  }

  console.error(`Auditing ${where}, read-only...`);
  console.log(formatAudit(await auditLinks(db)));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  STEPS,
  MAX_WRITES,
  planCampaign,
  auditLinks,
  applyLinks,
  revertLinks,
  formatAudit,
};
