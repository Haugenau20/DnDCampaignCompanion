/*
 * Read-only audit (T079): which NPCs, quests and rumors still name their place
 * only in the free-text `location`, with no `locationId`?
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
 * IT WRITES NOTHING: every call below is a read.
 *
 * Run it against production with your own Google account, which needs read
 * access to the project's Firestore (an owner or editor has it). No password,
 * service-account key or App Check token is involved: the Admin SDK uses the
 * Application Default Credentials that gcloud stores for you.
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
 */
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

/** The located kinds, and the field each one is called by. */
const KINDS = [
  {collection: "npcs", label: "name"},
  {collection: "quests", label: "title"},
  {collection: "rumors", label: "title"},
];

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
 * fields the audit needs are fetched.
 *
 * @param {import("firebase-admin/firestore").Firestore} db The database
 * @return {Promise<{counts: Record<string, Record<string, Record<string, number>>>,
 *   attention: Array<{path: string, kind: string, label: string,
 *   location: string, locationId: string, status: string}>}>}
 *   Counts per campaign, kind and status, and the documents that rely on the
 *   fallback (`dangling`, `legacy-id`, `legacy-name`)
 */
async function auditLocationIds(db) {
  /** @type {Map<string, {byId: Map<string, string>, byLowerName: Map<string, string>}>} */
  const indexes = new Map();
  const indexFor = (campaign) => {
    if (!indexes.has(campaign)) indexes.set(campaign, {byId: new Map(), byLowerName: new Map()});
    return indexes.get(campaign);
  };

  for await (const doc of db.collectionGroup("locations").select("name").stream()) {
    const campaign = campaignOf(doc.ref.path);
    if (!campaign) continue;
    const name = typeof doc.get("name") === "string" ? doc.get("name") : "";
    const index = indexFor(campaign);
    index.byId.set(doc.id, name);
    // The first location with a name wins, as the app's own index has it.
    if (name && !index.byLowerName.has(name.toLowerCase())) {
      index.byLowerName.set(name.toLowerCase(), doc.id);
    }
  }

  const counts = {};
  const attention = [];
  for (const {collection, label} of KINDS) {
    const query = db.collectionGroup(collection).select("location", "locationId", label);
    for await (const doc of query.stream()) {
      const campaign = campaignOf(doc.ref.path);
      if (!campaign) continue;
      const data = doc.data();
      const status = classify(data, indexFor(campaign));

      counts[campaign] ??= {};
      counts[campaign][collection] ??= Object.fromEntries(STATUSES.map((s) => [s, 0]));
      counts[campaign][collection][status] += 1;

      if (status === "dangling" || status === "legacy-id" || status === "legacy-name") {
        attention.push({
          path: doc.ref.path,
          kind: collection,
          label: String(data[label] ?? ""),
          location: String(data.location ?? ""),
          locationId: String(data.locationId ?? ""),
          status,
        });
      }
    }
  }
  return {counts, attention};
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
 * Parse the arguments, connect, audit, print.
 *
 * @return {Promise<void>}
 */
async function main() {
  const args = process.argv.slice(2);
  const emulator = args.includes("--emulator");
  const flag = args.indexOf("--project");
  const projectId = flag >= 0 ? args[flag + 1] : undefined;
  if (!projectId) {
    console.error("Usage: node scripts/audit-location-ids.js --project <project-id> [--emulator]");
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
  console.error(`Auditing ${projectId}${emulator ? " (emulator)" : ""}, read-only...`);

  const app = getApps()[0] ?? initializeApp({projectId});
  const report = await auditLocationIds(getFirestore(app));
  console.log(formatReport(report));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {auditLocationIds, classify, formatReport, STATUSES};
