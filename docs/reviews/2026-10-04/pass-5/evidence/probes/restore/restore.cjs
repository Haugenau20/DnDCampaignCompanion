"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const out = "/tmp/pass5-restore";
const hash = data => crypto.createHash("sha256").update(data).digest("hex");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64");
const token = "synthetic-pass5-restore-token";
function stable(value) {
  if (value && typeof value.toDate === "function") return { firestoreTimestamp: value.toDate().toISOString(), nanoseconds: value.nanoseconds };
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
function fixture(api) {
  const { basePath, notesPath, uid, campaignId, admin, now, attribution } = api;
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
  assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, "127.0.0.1:9199");
  const bucket = admin.app().options.storageBucket;
  assert(bucket.startsWith("demo-review-pass5"));
  const objectPath = `${basePath}/npcs/restore5-guide/restore5-image.png`;
  const url = `http://127.0.0.1:9199/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
  const base = { ...attribution, dateModified: now };
  const names = { npc: "Restore5 Guide", location: "Restore5 Harbor", quest: "Restore5 Voyage", chapter: "Restore5 Arrival", note: "Restore5 Session" };
  const docs = [
    { path: `${basePath}/npcs/restore5-guide`, data: { ...base, id: "restore5-guide", name: names.npc, title: "", race: "human", occupation: "Guide", description: "Synthetic restore guide beside the restored harbor.", location: names.location, locationId: "restore5-harbor", appearance: "", personality: "", background: "", status: "alive", relationship: "friendly", connections: { relatedNPCs: [], relatedQuests: ["restore5-voyage"], affiliations: [] }, notes: [], tags: ["restore-control"], image: { path: objectPath, url, width: 1, height: 1, uploadedBy: uid, uploadedAt: now } } },
    { path: `${basePath}/locations/restore5-harbor`, data: { ...base, id: "restore5-harbor", name: names.location, description: "Synthetic harbor retained by export and import.", type: "town", status: "known", parentId: "", features: [], connectedNPCs: ["restore5-guide"], relatedQuests: ["restore5-voyage"], notes: [], tags: [] } },
    { path: `${basePath}/quests/restore5-voyage`, data: { ...base, id: "restore5-voyage", title: names.quest, description: "Sail to the restored harbor.", background: "", status: "active", objectives: [{ id: "restore5-objective", description: "Meet the guide", completed: false }], leads: [], complications: [], rewards: [], keyLocations: [], relatedNPCIds: ["restore5-guide"], location: names.location, locationId: "restore5-harbor", levelRange: "" } },
    { path: `${basePath}/chapters/restore5-arrival`, data: { ...base, id: "restore5-arrival", title: names.chapter, content: "# Restore5 Arrival\n\nThe guide greeted the party at the synthetic harbor after the restart.", summary: "Synthetic restore chapter.", order: 1 } },
    { path: `${notesPath}/restore5-session`, data: { ...base, id: "restore5-session", campaignId, title: names.note, content: "Synthetic restore note: the party met the guide and prepared the voyage.", status: "active", tags: [], extractedEntities: [], updatedAt: now } },
    { path: `${basePath}/saga/sagaData`, data: { ...base, title: "Restore5 Saga", content: "The synthetic harbor remains after restart.", lastUpdated: now, version: "1.0" } },
    { path: `${basePath}/restore-diagnostics/value-types`, data: { synthetic: true, title: "Export codec diagnostic; not an application schema assertion", timestamp: admin.firestore.Timestamp.fromDate(new Date("2025-06-02T12:34:56.789Z")), nested: { array: [1, "two", false, null], unicode: "Æ Harbor — 🌊", empty: "" }, number: 0, enabled: false } },
  ];
  return { docs, names, objectPath, bucket, url };
}
function metadata(value) {
  return stable({ name: value.name, bucket: value.bucket, contentType: value.contentType, cacheControl: value.cacheControl, size: String(value.size), md5Hash: value.md5Hash, metadata: value.metadata });
}
exports.seed = async function seed(api) {
  const f = fixture(api);
  await api.admin.storage().bucket(f.bucket).file(f.objectPath).save(png, { resumable: false, metadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable", metadata: { firebaseStorageDownloadTokens: token, reviewPurpose: "pass5-synthetic-restore" } } });
  for (const doc of f.docs) await api.db.doc(doc.path).set(doc.data);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "fixture-manifest.json"), JSON.stringify({ projectId: api.admin.app().options.projectId, bucket: f.bucket, documentPaths: f.docs.map(doc => doc.path), objectPath: f.objectPath, binarySha256: hash(png), binaryBytes: png.length, note: "Fresh synthetic review fixtures only; no Auth assertion." }, null, 2));
  api.report?.("restore-seed", { documentCount: f.docs.length, binarySha256: hash(png), binaryBytes: png.length });
};
exports.readback = async function readback(api, phase = "before") {
  const f = fixture(api);
  const docs = [];
  for (const expected of f.docs) {
    const snap = await api.db.doc(expected.path).get();
    assert(snap.exists, expected.path);
    assert.deepEqual(stable(snap.data()), stable(expected.data), `Retained synthetic values: ${expected.path}`);
    docs.push({ path: expected.path, sha256: hash(JSON.stringify(stable(snap.data()))) });
  }
  const object = api.admin.storage().bucket(f.bucket).file(f.objectPath);
  const [binary] = await object.download();
  const [rawMetadata] = await object.getMetadata();
  assert.deepEqual(binary, png);
  assert.equal(rawMetadata.contentType, "image/png");
  assert.equal(rawMetadata.cacheControl, "public, max-age=31536000, immutable");
  assert.equal(rawMetadata.metadata.firebaseStorageDownloadTokens, token);
  assert.equal(rawMetadata.metadata.reviewPurpose, "pass5-synthetic-restore");
  const result = { phase, docs, storage: { sha256: hash(binary), bytes: binary.length, metadata: metadata(rawMetadata) } };
  if (phase === "after") {
    const before = JSON.parse(fs.readFileSync(path.join(out, "readback-before.json")));
    assert.deepEqual(result.docs, before.docs);
    assert.deepEqual(result.storage, before.storage);
  }
  fs.writeFileSync(path.join(out, `readback-${phase}.json`), JSON.stringify(result, null, 2));
  api.report?.(`restore-independent-readback-${phase}`, result);
  return result;
};
exports.run = async function run(api) {
  const phase = api.restorePhase || "before";
  const f = fixture(api);
  const backend = await exports.readback(api, phase);
  const { page, go, report } = api;
  const reads = [];
  for (const [route, heading, prose] of [
    ["/npcs/restore5-guide", f.names.npc, "Synthetic restore guide beside the restored harbor."],
    ["/locations/restore5-harbor", f.names.location, "Synthetic harbor retained by export and import."],
    ["/quests/restore5-voyage", f.names.quest, "Sail to the restored harbor."],
    ["/story/chapters/restore5-arrival", f.names.chapter, "The guide greeted the party at the synthetic harbor after the restart."],
    ["/notes/restore5-session", f.names.note, "Synthetic restore note: the party met the guide and prepared the voyage."],
    ["/story/saga", "Restore5 Saga", "The synthetic harbor remains after restart."],
  ]) {
    await go(route);
    await page.getByText(heading, { exact: true }).first().waitFor({ timeout: 45000 });
    if (route.startsWith("/notes")) assert((await page.locator("textarea").allTextContents()).join(" ").includes(prose) || await page.locator("textarea").evaluateAll(nodes => nodes.map(node => node.value).join(" ")).then(text => text.includes(prose)) || (await page.locator("body").innerText()).includes(prose));
    else await page.getByText(prose, { exact: false }).first().waitFor({ timeout: 30000 });
    if (route.startsWith("/npcs")) {
      await page.waitForFunction(objectPath => [...document.images].some(img => img.src.includes(encodeURIComponent(objectPath)) && img.complete && img.naturalWidth === 1), f.objectPath, { timeout: 30000 });
      const detail = await page.locator("img").evaluateAll((nodes, objectPath) => nodes.filter(img => img.src.includes(encodeURIComponent(objectPath))).map(img => ({ complete: img.complete, width: img.naturalWidth, height: img.naturalHeight })), f.objectPath);
      reads.push({ route, heading, portrait: detail });
    } else reads.push({ route, heading, proseVisible: true });
  }
  const response = await fetch(f.url);
  assert.equal(response.status, 200);
  assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(png));
  const result = { phase, backend, reads, tokenizedMediaStatus: response.status };
  fs.writeFileSync(path.join(out, `browser-${phase}.json`), JSON.stringify(result, null, 2));
  report?.(`restore-browser-${phase}`, result);
  return result;
};
