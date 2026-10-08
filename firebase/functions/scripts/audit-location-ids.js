/*
 * Audit (T079): which NPCs, quests and rumors still name their place only in
 * the free-text `location`, with no `locationId`? And a migration for them.
 *
 * The app resolves such a document through a legacy fallback, matching
 * `location` against the campaign's locations by id and then by name
 * (`resolveLocation` in src/features/campaign-entities/locations/utils/
 * location-display.ts). `locationId` shipped without a migration, so a
 * document gains one only when someone edits it. This counts what is left, so
 * the maintainer can decide: none left, and the fallback can go; some left,
 * and they are migrated or the fallback stays on purpose. Rumors share the
 * same pair of fields and the same fallback, so they are counted too.
 *
 * THE AUDIT WRITES NOTHING. Only `--migrate --apply` and `--revert --apply`
 * write, as described below.
 *
 * Run it against production with your own Google account, which needs read
 * access to the project's Firestore (an owner or editor has it; the migration
 * needs write access, which they have too). No password, service-account key
 * or App Check token is involved: the Admin SDK uses the Application Default
 * Credentials that gcloud stores for you.
 *
 *   gcloud auth application-default login
 *   cd firebase/functions
 *   node scripts/audit-location-ids.js --project dnd-campaign-companion
 *
 * It prints a count per campaign and kind, then every document that relies on
 * the fallback or names a place that no longer resolves. The list names
 * records and places from the campaigns, so keep it out of the repo.
 *
 * The emulator cannot answer this question -- its data can be arbitrarily old
 * -- but `--emulator` runs it against the dev emulators, to see the output.
 *
 * MIGRATE. `--migrate` gives each `legacy-id` and `legacy-name` document the
 * `locationId` the app already resolves it to, so what anyone sees does not
 * change. Without `--apply` it only reads, and lists the writes it would make;
 * with `--apply` it makes them and records how to undo them:
 *
 *   node scripts/audit-location-ids.js --project dnd-campaign-companion --migrate
 *   node scripts/audit-location-ids.js --project dnd-campaign-companion --migrate --apply --revert-file <file>
 *
 * It sets `locationId` and nothing else: `location` stays as written, and no
 * edit date or author changes, since no one edited anything. It leaves a
 * document alone, and lists it, when:
 * - the document changed after the migration read it (every write is
 *   conditional on that read), so a player's edit always wins; run it again
 *   to pick the document up
 * - its `location` matches two places of the same name, which the app
 *   settles by load order -- a guess the migration does not make
 * It never touches `dangling`, `free-text` or `none` documents: there is no
 * place for them to link to.
 *
 * REVERT. The revert file names every document written, its `locationId`
 * before, and when the migration wrote it. `--revert <file>` lists which are
 * unchanged since; with `--apply` it restores those, each conditional on still
 * being unchanged, and leaves any document edited since as it is:
 *
 *   node scripts/audit-location-ids.js --project dnd-campaign-companion --revert <file>
 *   node scripts/audit-location-ids.js --project dnd-campaign-companion --revert <file> --apply
 *
 * The revert file names campaign records, like the audit's list: give it a
 * path outside the repo (it will not overwrite one that exists), and keep it
 * until no revert can be wanted.
 */
const fs = require("node:fs");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore");

/** The located kinds, and the field each one is called by. */
const KINDS = [
  {collection: "npcs", label: "name"},
  {collection: "quests", label: "title"},
  {collection: "rumors", label: "title"},
];

/** gRPC's FAILED_PRECONDITION: a conditional write found the document changed. */
const FAILED_PRECONDITION = 9;

/**
 * What a document's place reference is, in `resolveLocation`'s order:
 * - `linked`: `locationId` resolves; the fallback is not used
 * - `dangling`: `locationId` names a location that no longer exists, so the
 *   app falls back to `location`
 * - `legacy-id`: no `locationId`; `location` holds a location's id
 * - `legacy-name`: no `locationId`; `location` matches a location's name,
 *   ignoring case
 * - `free-text`: no `locationId`; `location` names no location, and the app
 *   shows it as written
 * - `none`: no place at all
 */
const STATUSES = ["linked", "dangling", "legacy-id", "legacy-name", "free-text", "none"];

/**
 * Classify one document's place reference against its campaign's locations.
 *
 * @param {{location?: unknown, locationId?: unknown}} data The document
 * @param {{byId: Map<string, string>, byLowerName: Map<string, string>}} index
 *   The campaign's locations: id to name, and lower-cased name to id
 * @return {string} One of STATUSES
 */
function classify(data, index) {
  const locationId = typeof data.locationId === "string" ? data.locationId : "";
  // Untrimmed and case-sensitive for ids, exactly as the app compares.
  const location = typeof data.location === "string" ? data.location : "";
  if (locationId) {
    return index.byId.has(locationId) ? "linked" : "dangling";
  }
  if (!location) return "none";
  if (index.byId.has(location)) return "legacy-id";
  if (index.byLowerName.has(location.toLowerCase())) return "legacy-name";
  return "free-text";
}

/**
 * The campaign a document belongs to, if it sits where the app keeps entities:
 * `groups/{g}/campaigns/{c}/{collection}/{id}`.
 *
 * @param {string} path The document's path
 * @return {string|null} `groups/{g}/campaigns/{c}`, or null elsewhere
 */
function campaignOf(path) {
  const parts = path.split("/");
  if (parts.length !== 6 || parts[0] !== "groups" || parts[2] !== "campaigns") return null;
  return parts.slice(0, 4).join("/");
}

/**
 * Read every campaign's locations, then classify every NPC, quest and rumor.
 *
 * Collection-group reads, so no group or campaign is missed, and only the
 * fields the audit needs are fetched. Yields each document with its
 * campaign's index, for the audit to count and the migration to resolve.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @yield {{doc: import("firebase-admin/firestore").QueryDocumentSnapshot,
 *   campaign: string, kind: string, label: string, status: string,
 *   index: {byId: Map<string, string>, byLowerName: Map<string, string>,
 *   ambiguous: Set<string>}}} Each located document
 */
async function* scanLocated(db) {
  /** @type {Map<string, {byId: Map<string, string>, byLowerName: Map<string, string>, ambiguous: Set<string>}>} */
  const indexes = new Map();
  const indexFor = (campaign) => {
    if (!indexes.has(campaign)) {
      indexes.set(campaign, {byId: new Map(), byLowerName: new Map(), ambiguous: new Set()});
    }
    return indexes.get(campaign);
  };

  for await (const doc of db.collectionGroup("locations").select("name").stream()) {
    const campaign = campaignOf(doc.ref.path);
    if (!campaign) continue;
    const name = typeof doc.get("name") === "string" ? doc.get("name") : "";
    const index = indexFor(campaign);
    index.byId.set(doc.id, name);
    if (!name) continue;
    // The first location with a name wins, as the app's own index has it. A
    // second one makes the name ambiguous, which only the migration minds.
    const lower = name.toLowerCase();
    if (index.byLowerName.has(lower)) index.ambiguous.add(lower);
    else index.byLowerName.set(lower, doc.id);
  }

  for (const {collection, label} of KINDS) {
    const query = db.collectionGroup(collection).select("location", "locationId", label);
    for await (const doc of query.stream()) {
      const campaign = campaignOf(doc.ref.path);
      if (!campaign) continue;
      const index = indexFor(campaign);
      yield {
        doc,
        campaign,
        kind: collection,
        label: String(doc.get(label) ?? ""),
        status: classify(doc.data(), index),
        index,
      };
    }
  }
}

/**
 * Count every located document by campaign, kind and status, and list those
 * that rely on the fallback.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @return {Promise<{counts: Record<string, Record<string, Record<string, number>>>,
 *   attention: Array<{path: string, kind: string, label: string,
 *   location: string, locationId: string, status: string}>}>}
 *   Counts per campaign, kind and status, and the documents that rely on the
 *   fallback (`dangling`, `legacy-id`, `legacy-name`)
 */
async function auditLocationIds(db) {
  const counts = {};
  const attention = [];
  for await (const {doc, campaign, kind, label, status} of scanLocated(db)) {
    counts[campaign] ??= {};
    counts[campaign][kind] ??= Object.fromEntries(STATUSES.map((s) => [s, 0]));
    counts[campaign][kind][status] += 1;

    if (status === "dangling" || status === "legacy-id" || status === "legacy-name") {
      attention.push({
        path: doc.ref.path,
        kind,
        label,
        location: String(doc.get("location") ?? ""),
        locationId: String(doc.get("locationId") ?? ""),
        status,
      });
    }
  }
  return {counts, attention};
}

/**
 * What the migration would write: the `locationId` the app resolves each
 * `legacy-id` and `legacy-name` document to, with the time each was read.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @return {Promise<{writes: Array<{path: string, label: string, status: string,
 *   location: string, locationId: string, previous: string|null,
 *   readTime: import("firebase-admin/firestore").Timestamp}>,
 *   ambiguous: Array<{path: string, label: string, location: string}>}>}
 *   The planned writes, and the documents left because their `location`
 *   matches more than one place
 */
async function planMigration(db) {
  const writes = [];
  const ambiguous = [];
  for await (const {doc, label, status, index} of scanLocated(db)) {
    if (status !== "legacy-id" && status !== "legacy-name") continue;
    const location = doc.get("location");
    if (status === "legacy-name" && index.ambiguous.has(location.toLowerCase())) {
      ambiguous.push({path: doc.ref.path, label, location});
      continue;
    }
    const previous = doc.get("locationId");
    writes.push({
      path: doc.ref.path,
      label,
      status,
      location,
      // By id first, as `classify` and the app do.
      locationId: status === "legacy-id" ? location : index.byLowerName.get(location.toLowerCase()),
      // "" and absent both mean "no id" to the app; the revert restores which.
      previous: typeof previous === "string" ? previous : null,
      readTime: doc.updateTime,
    });
  }
  return {writes, ambiguous};
}

/**
 * Make the planned writes: set `locationId` on each document, only if it has
 * not changed since the plan read it.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @param {Awaited<ReturnType<typeof planMigration>>} plan What to write
 * @param {string} project The project, recorded so that a revert cannot be
 *   aimed at another one
 * @return {Promise<{record: {project: string, migratedAt: string,
 *   writes: Array<{path: string, locationId: string, previous: string|null,
 *   writeTime: {seconds: number, nanoseconds: number}}>},
 *   refused: Array<{path: string, reason: string}>}>}
 *   The revert record of what was written, and what was not
 */
async function applyMigration(db, plan, project) {
  const writer = db.bulkWriter();
  // A refused precondition is a document someone edited: never retry it.
  writer.onWriteError((error) =>
    error.code !== FAILED_PRECONDITION && error.failedAttempts < 5);
  const written = [];
  const refused = [];
  const results = plan.writes.map((w) =>
    writer.update(db.doc(w.path), {locationId: w.locationId}, {lastUpdateTime: w.readTime}).then(
      (result) => written.push({
        path: w.path,
        locationId: w.locationId,
        previous: w.previous,
        writeTime: {seconds: result.writeTime.seconds, nanoseconds: result.writeTime.nanoseconds},
      }),
      (error) => refused.push({
        path: w.path,
        reason: error.code === FAILED_PRECONDITION ?
          "changed since it was read" : String(error.message ?? error),
      })
    )
  );
  await writer.close();
  await Promise.all(results);
  written.sort((a, b) => a.path.localeCompare(b.path));
  refused.sort((a, b) => a.path.localeCompare(b.path));
  return {record: {project, migratedAt: new Date().toISOString(), writes: written}, refused};
}

/**
 * Sort a revert record's documents into those unchanged since the migration
 * wrote them, which the revert restores, and those edited since, which it
 * leaves as they are.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @param {Awaited<ReturnType<typeof applyMigration>>["record"]} record The
 *   revert file's contents
 * @return {Promise<{unchanged: Array<{path: string, previous: string|null,
 *   writeTime: import("firebase-admin/firestore").Timestamp}>,
 *   changed: Array<{path: string}>}>} The two lists
 */
async function planRevert(db, record) {
  const unchanged = [];
  const changed = [];
  const docs = record.writes.length ?
    await db.getAll(...record.writes.map((w) => db.doc(w.path))) : [];
  record.writes.forEach((w, i) => {
    const writeTime = new Timestamp(w.writeTime.seconds, w.writeTime.nanoseconds);
    if (docs[i].exists && docs[i].updateTime.isEqual(writeTime)) {
      unchanged.push({path: w.path, previous: w.previous, writeTime});
    } else {
      changed.push({path: w.path});
    }
  });
  return {unchanged, changed};
}

/**
 * Restore each unchanged document's `locationId` to what it was before the
 * migration, only if the document is still as the migration left it.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @param {{unchanged: Awaited<ReturnType<typeof planRevert>>["unchanged"]}} plan
 *   What `planRevert` found unchanged
 * @return {Promise<{reverted: string[], refused: string[]}>} The paths of each
 */
async function applyRevert(db, plan) {
  const writer = db.bulkWriter();
  writer.onWriteError((error) =>
    error.code !== FAILED_PRECONDITION && error.failedAttempts < 5);
  const reverted = [];
  const refused = [];
  const results = plan.unchanged.map((u) =>
    writer.update(
      db.doc(u.path),
      {locationId: u.previous === null ? FieldValue.delete() : u.previous},
      {lastUpdateTime: u.writeTime}
    ).then(() => reverted.push(u.path), () => refused.push(u.path))
  );
  await writer.close();
  await Promise.all(results);
  return {reverted: reverted.sort(), refused: refused.sort()};
}

/**
 * The report as text: per campaign and kind, then totals, then the list.
 *
 * @param {Awaited<ReturnType<typeof auditLocationIds>>} report The audit
 * @return {string} What the script prints
 */
function formatReport({counts, attention}) {
  const lines = [];
  const totals = Object.fromEntries(KINDS.map(({collection}) =>
    [collection, Object.fromEntries(STATUSES.map((s) => [s, 0]))]));
  const row = (name, tally) =>
    `  ${name.padEnd(8)} ${STATUSES.map((s) => `${s} ${tally[s]}`).join(" · ")}`;

  for (const campaign of Object.keys(counts).sort()) {
    lines.push(campaign);
    for (const {collection} of KINDS) {
      const tally = counts[campaign][collection];
      if (!tally) continue;
      lines.push(row(collection, tally));
      for (const s of STATUSES) totals[collection][s] += tally[s];
    }
  }
  lines.push("", "Totals");
  for (const {collection} of KINDS) lines.push(row(collection, totals[collection]));

  const relying = KINDS.reduce((n, {collection}) =>
    n + totals[collection]["legacy-id"] + totals[collection]["legacy-name"], 0);
  const dangling = KINDS.reduce((n, {collection}) => n + totals[collection].dangling, 0);
  lines.push(
    "",
    `${relying} document(s) resolve their place only through the fallback` +
      ` (legacy-id, legacy-name); ${dangling} have a locationId that no longer resolves.`
  );
  if (attention.length) {
    lines.push("", "Documents relying on the fallback:");
    for (const a of attention) {
      const stored = a.status === "dangling" ?
        `locationId "${a.locationId}", location "${a.location}"` :
        `location "${a.location}"`;
      lines.push(`  [${a.status}] ${a.path}  "${a.label}"  ${stored}`);
    }
  }
  return lines.join("\n");
}

/**
 * The migration's plan as text, for the maintainer to read before `--apply`.
 *
 * @param {Awaited<ReturnType<typeof planMigration>>} plan The plan
 * @param {boolean} apply Whether the writes follow
 * @return {string} What the script prints
 */
function formatMigrationPlan({writes, ambiguous}, apply) {
  const lines = [`${writes.length} document(s) to be given a locationId:`];
  for (const w of writes) {
    lines.push(`  [${w.status}] ${w.path}  "${w.label}"  location "${w.location}" -> locationId "${w.locationId}"`);
  }
  if (ambiguous.length) {
    lines.push("", `${ambiguous.length} left alone: their location matches more than one place by name.`);
    for (const a of ambiguous) lines.push(`  ${a.path}  "${a.label}"  location "${a.location}"`);
  }
  lines.push("", apply ?
    "Writing them, each only if the document is unchanged since it was read." :
    "Nothing has been changed. Run again with --apply --revert-file <file> to write them.");
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
  const migrate = args.includes("--migrate");
  const projectId = valueOf("--project");
  const revertFrom = valueOf("--revert");
  const revertFile = valueOf("--revert-file");
  if (!projectId || (migrate && revertFrom) || (apply && !migrate && !revertFrom) ||
      (migrate && apply && !revertFile)) {
    console.error(
      "Usage: node scripts/audit-location-ids.js --project <project-id> [--emulator]\n" +
      "         [--migrate [--apply --revert-file <file>] | --revert <file> [--apply]]"
    );
    process.exitCode = 2;
    return;
  }
  if (emulator) {
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  } else {
    // Set by the dev shell or a test run, this would point "production" at
    // an emulator without saying so.
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
    const plan = await planRevert(db, record);
    console.log(`${plan.unchanged.length} document(s) unchanged since the migration, to be restored.`);
    if (plan.changed.length) {
      console.log(`${plan.changed.length} edited since, or gone, and left as they are:`);
      for (const c of plan.changed) console.log(`  ${c.path}`);
    }
    if (!apply) {
      console.log("Nothing has been changed. Run again with --apply to restore them.");
      return;
    }
    const {reverted, refused} = await applyRevert(db, plan);
    console.log(`Restored ${reverted.length}.`);
    if (refused.length) {
      console.log(`${refused.length} changed while this ran, and were left:`);
      for (const path of refused) console.log(`  ${path}`);
    }
    return;
  }

  if (migrate && !apply) {
    console.error(`Migrating ${where}, read-only...`);
    console.log(formatMigrationPlan(await planMigration(db), false));
    return;
  }

  if (migrate) {
    // Claim the revert file before writing anything: never overwrite one, and
    // never write documents with nowhere to record them.
    const out = fs.openSync(revertFile, "wx");
    console.error(`Migrating ${where}...`);
    let result;
    try {
      const plan = await planMigration(db);
      console.log(formatMigrationPlan(plan, true));
      result = await applyMigration(db, plan, projectId);
    } finally {
      // An empty record if it failed before writing: a revert of nothing.
      fs.writeFileSync(out, JSON.stringify(result?.record ??
        {project: projectId, migratedAt: new Date().toISOString(), writes: []}, null, 2));
      fs.closeSync(out);
    }
    console.log(`Wrote ${result.record.writes.length}; the revert file is ${revertFile}.`);
    if (result.refused.length) {
      console.log(`${result.refused.length} not written (run again to pick up the changed ones):`);
      for (const r of result.refused) console.log(`  ${r.path}  ${r.reason}`);
    }
    return;
  }

  console.error(`Auditing ${where}, read-only...`);
  console.log(formatReport(await auditLocationIds(db)));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  auditLocationIds,
  classify,
  formatReport,
  STATUSES,
  planMigration,
  applyMigration,
  planRevert,
  applyRevert,
  formatMigrationPlan,
};
