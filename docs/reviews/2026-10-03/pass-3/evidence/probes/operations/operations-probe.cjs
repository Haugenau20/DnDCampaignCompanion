"use strict";

// Local diagnostic only. Actual source executes in VMs with a closed require
// allowlist; all Firebase/generator IO is synthetic. It never launches the CLI,
// runs PowerShell, reads .env files, or starts/stops processes or servers.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const repo = path.resolve(process.argv[2] || "/workspace/DnDCampaignCompanion");
const ts = require(path.join(repo, "node_modules/typescript"));
const read = (p) => fs.readFileSync(path.join(repo, p), "utf8");
const compile = (p) => ts.transpileModule(read(p), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true},
  fileName: p,
}).outputText;
const results = [];

function evaluate(code, filename, deps, events, extra = {}) {
  const module = {exports: {}};
  const requireStub = (id) => {
    assert.ok(Object.hasOwn(deps, id), `Unapproved dependency ${id}`);
    return deps[id];
  };
  requireStub.main = null;
  const consoleStub = {
    log: (...args) => events.push({kind: "log", message: String(args[0])}),
    error: (...args) => events.push({kind: "error", message: String(args[0]), detail: args[1]?.message}),
  };
  vm.runInNewContext(code, {
    module, exports: module.exports, require: requireStub, console: consoleStub,
    process: {env: {}, exit: (code) => events.push({kind: "exit", code})},
    ...extra,
  }, {filename});
  return module.exports;
}

async function generatorCase(mode) {
  const events = [];
  const deps = {
    "firebase/app": {initializeApp: () => {
      if (mode === "initialization-failure") throw new Error("synthetic initialization failure");
      return {};
    }},
    "firebase/firestore": {getFirestore: () => ({}), connectFirestoreEmulator: () => {}},
    "firebase/auth": {getAuth: () => ({}), connectAuthEmulator: () => {}},
    dotenv: {config: () => ({})},
    "./generators": {
      createSampleUsers: async () => ({users: [], userMapping: {}}),
      createUserProfiles: async () => {}, createGroups: async () => ({group1Id: "synthetic-g1", group2Id: "synthetic-g2"}),
      addUsersToGroups: async () => {},
      createCampaigns: async () => [{name: "synthetic campaign", groupId: "synthetic-g1", id: "synthetic-c1"}],
      generateContentForCampaign: async () => {
        events.push({kind: "content-attempt"});
        if (mode === "content-failure") throw new Error("synthetic content write failure");
        events.push({kind: "content-complete"});
      },
    },
  };
  const generator = evaluate(compile("src/utils/__dev__/dndSampleDataGenerator.ts"), "dndSampleDataGenerator.ts", deps, events);
  evaluate(compile("src/utils/__dev__/generateSampleData.ts"), "generateSampleData.ts", {"./dndSampleDataGenerator": generator}, events);
  await new Promise((resolve) => setImmediate(resolve));
  const summary = {
    case: mode,
    generatorError: events.some((e) => e.kind === "error" && e.message === "Error generating sample data:"),
    entryFailure: events.some((e) => e.kind === "error" && e.message === "Failed to generate sample data:"),
    entrySuccess: events.some((e) => e.kind === "log" && e.message === "Sample data generation completed successfully!"),
    completedContent: events.filter((e) => e.kind === "content-complete").length,
    exits: events.filter((e) => e.kind === "exit").map((e) => e.code),
  };
  assert.equal(summary.entrySuccess, true);
  assert.deepEqual(summary.exits, [0]);
  assert.equal(summary.generatorError, mode !== "success-control");
  assert.equal(summary.entryFailure, false);
  assert.equal(summary.completedContent, mode === "success-control" ? 1 : 0);
  results.push(summary);
}

async function functionsBuildCases() {
  const base = fs.mkdtempSync("/tmp/pass3-operations/functions-fixture-");
  const functionsDir = path.join(base, "functions");
  fs.mkdirSync(path.join(functionsDir, "src"), {recursive: true});
  const realPackage = JSON.parse(read("firebase/functions/package.json"));
  fs.writeFileSync(path.join(functionsDir, "package.json"), JSON.stringify({main: realPackage.main, scripts: {build: realPackage.scripts.build}}));
  fs.writeFileSync(path.join(functionsDir, "src/index.ts"), 'export const version = "new-source";\n');
  const events = [];
  class FirebaseError extends Error {}
  const cliBase = "firebase/node_modules/firebase-tools/lib/deploy/functions/runtimes/node/";
  const validate = evaluate(read(cliBase + "validate.js"), "firebase-tools/node/validate.js", {
    path, "../../../../error": {FirebaseError}, "../../../../logger": {logger: {debug: () => {}}},
    "../../../../fsutils": {fileExistsSync: (p) => fs.existsSync(p)},
    cjson: {load: (p) => JSON.parse(fs.readFileSync(p, "utf8"))},
  }, events);
  const nodeModule = read(cliBase + "index.js");
  const requireIds = [...nodeModule.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]);
  const delegateDeps = Object.fromEntries(requireIds.map((id) => [id, {}]));
  Object.assign(delegateDeps, {fs, path, os: require("node:os"), "./validate": validate, "../../../../error": {FirebaseError}});
  const {Delegate} = evaluate(nodeModule, "firebase-tools/node/index.js", delegateDeps, events);
  const delegate = new Delegate("demo-pass3-operations", base, functionsDir, "nodejs22");
  await delegate.build();
  const emittedPath = path.join(functionsDir, realPackage.main);
  assert.equal(fs.existsSync(emittedPath), false);
  let missingError;
  try { validate.packageJsonIsValid("functions", functionsDir, base); } catch (error) { missingError = error; }
  assert.match(missingError.message, /lib\/index\.js does not exist/);

  // Exercise the actual CLI method's error path without initializing an emulator.
  const emulatorFile = "firebase/node_modules/firebase-tools/lib/emulator/functionsEmulator.js";
  const emulatorText = read(emulatorFile);
  const parsed = ts.createSourceFile(emulatorFile, emulatorText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const emulatorClass = parsed.statements.find((s) => ts.isClassDeclaration(s) && s.name?.text === "FunctionsEmulator");
  const loadTriggers = emulatorClass.members.find((m) => m.name?.getText(parsed) === "loadTriggers");
  assert.ok(loadTriggers);
  const {Probe} = evaluate(`class Probe {${loadTriggers.getText(parsed)}}; module.exports = {Probe};`, "actual-loadTriggers-method.js", {}, events);
  const emulator = new Probe();
  emulator.discoverTriggers = async () => validate.packageJsonIsValid("functions", functionsDir, base);
  emulator.logger = {logLabeled: (...args) => events.push({kind: "emulator-log", level: args[0], message: args[2]})};
  const loadResult = await emulator.loadTriggers({});
  assert.equal(loadResult, undefined);
  assert.ok(events.some((e) => e.kind === "emulator-log" && e.level === "ERROR"));
  results.push({case: "fresh-functions-without-build", emittedJsExists: false, validationRejects: true, loadTriggersRejects: false, loadTriggersLogsError: true});

  fs.mkdirSync(path.dirname(emittedPath), {recursive: true});
  fs.writeFileSync(emittedPath, 'exports.version = "older-emitted-js";\n');
  await delegate.build();
  validate.packageJsonIsValid("functions", functionsDir, base);
  const emitted = require(emittedPath);
  assert.equal(emitted.version, "older-emitted-js");
  results.push({case: "typescript-edit-with-stale-functions-build", validationAccepts: true, sourceVersion: "new-source", emittedVersionAfterDelegateBuild: emitted.version});
}

(async () => {
  await generatorCase("initialization-failure");
  await generatorCase("content-failure");
  await generatorCase("success-control");
  await functionsBuildCases();
  console.log(JSON.stringify({diagnostic: "operations-actual-source-local-mocks", checks: results.length, results}, null, 2));
})().catch((error) => {console.error(error); process.exitCode = 1;});
