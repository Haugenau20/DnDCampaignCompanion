"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const exportDir = path.resolve(process.argv[2]);
assert(exportDir.startsWith("/tmp/pass5-restore/"));
const metadata = JSON.parse(fs.readFileSync(path.join(exportDir, "firebase-export-metadata.json")));
assert(metadata.firestore && metadata.storage, "Fresh export contains both Firestore and Storage metadata");
assert.equal(metadata.version, "15.22.4");
assert.equal(metadata.auth, undefined, "Restore export intentionally excludes Auth");
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile()) {
      const bytes = fs.readFileSync(absolute);
      files.push({ path: path.relative(exportDir, absolute), bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
    } else throw new Error("Unexpected link/special export entry");
  }
}
walk(exportDir);
const manifest = { exportDir, metadata, files: files.sort((a,b) => a.path.localeCompare(b.path)), note: "Hashes only; fresh synthetic Firestore/Storage export stays outside the repository." };
fs.writeFileSync("/tmp/pass5-restore/export-manifest.json", JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ exportDir, fileCount: files.length, firestore: !!metadata.firestore, storage: !!metadata.storage, authExported: false }));
