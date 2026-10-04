'use strict';
// Replay aid assembled after the review. It prepares files, not running services.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = '/workspace/DnDCampaignCompanion';
const staging = '/tmp/pass4-replay-runtime';
assert(fs.existsSync(path.join(root, 'firebase/functions/lib/index.js')),
  'Build firebase/functions before preparing replay');
assert(fs.existsSync(path.join(root, 'firebase/functions/node_modules')),
  'Install the Functions dependencies before preparing replay');
fs.mkdirSync(path.join(staging, 'functions'), { recursive: true });
fs.cpSync(path.join(root, 'firebase/functions/lib'), path.join(staging, 'functions/lib'), { recursive: true });
fs.copyFileSync(path.join(root, 'firebase/functions/package.json'), path.join(staging, 'functions/package.json'));
const dependencyLink = path.join(staging, 'functions/node_modules');
if (!fs.existsSync(dependencyLink)) {
  fs.symlinkSync(path.join(root, 'firebase/functions/node_modules'), dependencyLink, 'dir');
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'firebase/firebase.emulators.json'), 'utf8'));
config.functions.source = 'functions';
config.firestore.indexes = path.join(root, 'firebase/firestore.indexes.json');
config.storage.rules = path.join(root, 'firebase/storage.rules');
for (const emulator of Object.values(config.emulators)) emulator.host = '127.0.0.1';
fs.writeFileSync(path.join(staging, 'firebase.emulators.json'), JSON.stringify(config, null, 2) + '\n');
console.log(JSON.stringify({ staging, project: 'demo-review-pass4', copied: ['lib', 'package.json'], startsServices: false }));
