"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const root = "/workspace/DnDCampaignCompanion";
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const production = JSON.parse(read("firebase/firebase.json"));
const development = JSON.parse(read("firebase/firebase.emulators.json"));
const indexes = JSON.parse(read("firebase/firestore.indexes.json"));
assert.deepEqual(production.functions, development.functions);
assert.deepEqual(production.firestore, development.firestore);
assert.equal(production.firestore.rules, undefined);
assert.equal(production.storage, undefined);
assert.equal(development.firestore.rules, undefined);
assert.equal(development.storage.rules, "storage.rules");
for (const emulator of ["auth", "firestore", "functions", "ui"]) assert.deepEqual(production.emulators[emulator], development.emulators[emulator]);
const files = ["AGENTS.md", "TODO.md", "scripts/start-dev.ps1", "scripts/manage-dev-data.ps1", "firebase/firebase.json", "firebase/firebase.emulators.json", "firebase/.firebaserc", "firebase/firestore.indexes.json", "firebase/firestore.rules", "firebase/firestore.rules.prod", "firebase/storage.rules", "firebase/storage.rules.prod", "firebase/package.json", "firebase/functions/package.json", "firebase/functions/src/index.ts", ".github/workflows/firebase-hosting-merge.yml", ".github/workflows/firebase-hosting-pull-request.yml", ".github/workflows/firebase-hosting-pull-request-cleanup.yml", ".github/workflows/test.yml", "docker/Dockerfile.frontend.prod", "src/core/services/firebase/config/firebaseConfig.ts", "src/core/services/firebase/core/BaseFirebaseService.ts", "src/core/types/storedImage.ts"];
const policy = JSON.parse(fs.readFileSync("/etc/codex/network-policy.json"));
const result = {
  sourceBaseline: "4ebd53362c34840871745386b99f7905de75c26a",
  applicationBaseline: "64fe19512b1d3bd14427fad8996403a742fbe8a9",
  files: files.map(file => ({ path: file, sha256: crypto.createHash("sha256").update(read(file)).digest("hex") })),
  configAgreement: { functions: true, firestoreIndexes: true, commonEmulatorPorts: true, productionRulesKeysPresent: false, developmentFirestorePermissiveDefault: true, developmentStorageRules: development.storage.rules },
  indexDefinitions: indexes.indexes.length,
  fieldOverrides: indexes.fieldOverrides.length,
  functionNodeEngine: JSON.parse(read("firebase/functions/package.json")).engines.node,
  pinnedFirebaseCli: JSON.parse(read("firebase/node_modules/firebase-tools/package.json")).version,
  network: { type: policy.http_network_policy.type, publicHostingAllowed: policy.http_network_policy.egress_rules.some(entry => entry.host === "dnd-campaign-companion.web.app"), vpnConfigured: policy.vpn_configured, tcpDomainGrants: policy.tcp_network_access.domains.length, tcpIpGrants: policy.tcp_network_access.ip_ranges.length },
  availableShells: { windowsPowerShell: false, powerShellCore: false },
  deployedInspection: { attempted: false, cause: "No configured cloud identities/credentials; target Hosting host outside enforced allowlist. No proxy bypass or login attempted." },
};
fs.writeFileSync("/tmp/pass5-restore/source-snapshot.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify({ configAgreement: result.configAgreement, indexDefinitions: result.indexDefinitions, fieldOverrides: result.fieldOverrides, functionNodeEngine: result.functionNodeEngine, pinnedFirebaseCli: result.pinnedFirebaseCli, network: result.network, availableShells: result.availableShells }));
