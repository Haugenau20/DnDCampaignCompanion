/*
 * Verify that the extraction model is pinned server-side.  (T050)
 *
 *   cd firebase/functions && npm run build && node scripts/verify-model-pin.js
 *
 * Exits 0 only if BOTH cases below behave. Not wired into any CI gate, because
 * this package has none -- run it after touching the OpenAI call.
 *
 * `firebase/functions` has no jest, so this stands in for one. It invokes the
 * compiled callable directly via `.run()`, with `openai` and `firebase-admin`
 * intercepted, and records which model actually reached the OpenAI SDK.
 *
 * It runs TWO cases, because a script that only exercises the new code proves
 * the new code runs, not that it changed anything:
 *   FIXED   -- lib/entityExtraction.js as built
 *   CONTROL -- the same file with the old `request.data.model` behaviour
 *              patched back in, which MUST show the injected model
 */
const Module = require("module");
const fs = require("fs");
const path = require("path");

// Resolved from this file, not hard-coded, so the script survives a clone
// anywhere. `scripts/` sits directly under the functions package root.
const FN_DIR = path.resolve(__dirname, "..");
const BUILT = path.join(FN_DIR, "lib/entityExtraction.js");

let recordedModel = null;

class FakeOpenAI {
  constructor() {
    this.chat = {
      completions: {
        create: async (args) => {
          recordedModel = args.model;
          return {
            choices: [{
              message: {
                function_call: {
                  name: "extract_entities",
                  arguments: JSON.stringify({ entities: [] }),
                },
              },
            }],
          };
        },
      },
    };
  }
}
FakeOpenAI.default = FakeOpenAI;

const fakeAdmin = {
  initializeApp: () => {},
  apps: [{}],
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        get: async () => ({
          exists: true,
          data: () => ({ entityExtractionUsage: { isUnlimited: true } }),
        }),
        set: async () => {},
      }),
    }),
  }),
};

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "openai") return FakeOpenAI;
  if (request === "firebase-admin" || request === "firebase-admin/app") return fakeAdmin;
  return origLoad.apply(this, arguments);
};

process.env.OPENAI_API_KEY = "sk-test-not-a-real-key";
process.env.GCLOUD_PROJECT = "demo-test";

async function runCase(label, sourcePath) {
  recordedModel = null;
  delete require.cache[require.resolve(sourcePath)];
  const mod = require(sourcePath);
  const res = await mod.extractEntities.run({
    auth: { uid: "user-1", token: {} },
    data: { content: "Gandalf met Frodo in Bree.", model: "gpt-5.2-pro" },
    rawRequest: { headers: {} },
  });
  console.log(`  ${label}: model sent to OpenAI = ${JSON.stringify(recordedModel)}` +
              `  (success=${res && res.success})`);
  return recordedModel;
}

(async () => {
  console.log("\nInjecting  model: 'gpt-5.2-pro'  ($21/$168 per 1M) in the request payload.\n");

  const fixed = await runCase("FIXED  ", BUILT);

  // Build the control: restore `const { content, model = "gpt-3.5-turbo" } = request.data`
  const src = fs.readFileSync(BUILT, "utf8");
  const controlSrc = src
    .replace('const { content } = request.data;',
             'const { content, model = "gpt-3.5-turbo" } = request.data;')
    .replace('model: EXTRACTION_MODEL,', 'model: model,');
  if (controlSrc === src) {
    console.log("  CONTROL: could not patch old behaviour back in -- script is stale.");
    process.exit(2);
  }
  // Must live beside the original so its `firebase-functions` import resolves.
  const controlPath = path.join(FN_DIR, "lib", "entityExtraction.control.js");
  fs.writeFileSync(controlPath, controlSrc);
  const control = await runCase("CONTROL", controlPath);
  fs.unlinkSync(controlPath);

  console.log("");
  const okFixed = fixed === "gpt-4.1-mini";
  const okControl = control === "gpt-5.2-pro";
  console.log(`  FIXED   pinned to gpt-4.1-mini ................ ${okFixed ? "PASS" : "FAIL"}`);
  console.log(`  CONTROL took the injected model (proves the`);
  console.log(`          script would have caught a regression) ${okControl ? "PASS" : "FAIL"}`);
  process.exit(okFixed && okControl ? 0 : 1);
})().catch((e) => { console.error("ERROR:", e && e.message); process.exit(3); });
