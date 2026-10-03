/* Diagnostic only. Actual TS handler/service, all IO replaced, no network. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = process.env.REVIEW_REPO || '/workspace/DnDCampaignCompanion';
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const Ajv = require(path.join(ROOT, 'node_modules/ajv'));
const clone = x => JSON.parse(JSON.stringify(x));
const diagnostics = [];
const quietConsole = { ...console, error: (...args) => diagnostics.push(args.map(x => x?.message || String(x)).join(' ')) };

function sourceLoader(overrides) {
  const cache = new Map();
  return function load(file) {
    file = path.resolve(file);
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      esModuleInterop: true, jsx: ts.JsxEmit.React,
    }, fileName: file }).outputText;
    const localRequire = name => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
      throw new Error('Unmocked external module: ' + name);
    };
    const compiled = vm.runInNewContext('(function(require,module,exports){' + js + '\n})', {
      console: quietConsole, process: { env: { OPENAI_API_KEY: 'synthetic-test-value' } },
      Date, Math, Error, JSON, Set,
    }, { filename: file });
    compiled(localRequire, module, module.exports);
    return module.exports;
  };
}

class HttpsError extends Error {
  constructor(code, message, details) { super(message); this.code = code; this.details = details; }
}
let userData = {}, completion, modelCalls = 0, requestBody, constructorOptions;
const db = { collection: name => {
  assert.equal(name, 'users');
  return { doc: uid => ({
    get: async () => ({ exists: !!userData.entityExtractionUsage, data: () => clone(userData) }),
    set: async value => { userData = clone(value); },
  }) };
} };
class FakeOpenAI {
  constructor(options) {
    constructorOptions = options;
    this.chat = { completions: { create: async body => {
      modelCalls++; requestBody = body;
      if (completion instanceof Error) throw completion;
      return clone(completion);
    } } };
  }
}
const serverLoad = sourceLoader({
  'firebase-functions/v2/https': { HttpsError, onCall: (options, handler) => ({ options, run: handler }) },
  'firebase-admin': { firestore: () => db },
  'openai': FakeOpenAI,
});
const { extractEntities, getUsageStatus } = serverLoad(path.join(ROOT, 'firebase/functions/src/entityExtraction.ts'));
const request = { auth: { uid: 'synthetic-reader' }, data: { content: 'Barliman serves the travelers at the Prancing Pony in Bree.' } };
const npc = (overrides = {}) => ({ type: 'npc', text: 'Barliman', confidence: .9,
  name: 'Barliman', title: null, race: null, occupation: null, location: null,
  relationship: null, description: null, context: 'Barliman serves the travelers.', ...overrides });
const answer = (payload, finish_reason = 'tool_calls') => ({ choices: [{ finish_reason, message: {
  refusal: null, tool_calls: [{ type: 'function', function: { name: 'extract_entities', arguments: typeof payload === 'string' ? payload : JSON.stringify(payload) } }],
} }] });
let callableResult;
const clientLoad = sourceLoader({
  'firebase/functions': { httpsCallable: () => async () => ({ data: callableResult }) },
  'core/services/firebase/core/BaseFirebaseService': class { getCurrentUser() { return { uid: 'synthetic-reader' }; } getActiveGroupId() { return undefined; } },
  'core/services/firebase/core/ServiceRegistry': { getInstance: () => ({ register() {} }) },
});
const Service = clientLoad(path.join(ROOT, 'src/features/collaboration/entity-extraction/services/EntityExtractionService.ts')).default;
const service = Service.getInstance();

async function invoke(label, value) {
  userData = {}; completion = value; modelCalls = 0;
  let result, error;
  try { result = await extractEntities.run(request); } catch (caught) { error = caught; }
  const row = { case: label, success: result?.success || false,
    entities: result?.entities, error: error ? { code: error.code, message: error.message, details: error.details ?? null } : null,
    dailyCount: userData.entityExtractionUsage?.daily.count, modelCalls };
  console.log(JSON.stringify(row));
  return { result, error };
}

(async () => {
  let observed = await invoke('valid', answer({ entities: [npc()] }));
  assert.equal(observed.result.entities.length, 1);
  const validate = new Ajv({ allErrors: true }).compile(requestBody.tools[0].function.parameters);
  for (const confidence of [90, -0.4]) {
    const payload = { entities: [npc({ confidence })] };
    assert.equal(validate(payload), true);
    observed = await invoke('schema-valid confidence ' + confidence, answer(payload));
    callableResult = observed.result;
    const mapped = await service.extractEntities(request.data.content);
    assert.equal(mapped[0].confidence, confidence);
    console.log(JSON.stringify({ case: 'client confidence', confidence: mapped[0].confidence, displayedPercent: Math.round(mapped[0].confidence * 100) }));
  }
  observed = await invoke('valid empty', answer({ entities: [] }));
  assert.deepEqual(observed.result.entities, []);
  observed = await invoke('missing choices', { choices: [] });
  assert.equal(observed.error.code, 'internal');
  observed = await invoke('empty arguments', answer(''));
  assert.equal(observed.error.code, 'internal');
  observed = await invoke('malformed JSON', answer('{"entities": ['));
  assert.equal(observed.error.code, 'internal');
  observed = await invoke('truncated JSON', answer('{"entities": [', 'length'));
  assert.equal(observed.error.code, 'internal');
  observed = await invoke('complete JSON with length finish', answer({ entities: [npc()] }, 'length'));
  assert.equal(observed.result.success, true);
  observed = await invoke('wrong entities container', answer({ entities: {} }));
  assert.equal(observed.result.success, true);
  callableResult = observed.result;
  await assert.rejects(() => service.extractEntities(request.data.content), /map is not a function/);
  observed = await invoke('wrong text type', answer({ entities: [npc({ text: 42 })] }));
  assert.equal(observed.result.success, true);
  callableResult = observed.result;
  assert.equal((await service.extractEntities(request.data.content))[0].text, 42);
  observed = await invoke('refusal', { choices: [{ finish_reason: 'stop', message: { refusal: 'Synthetic refusal', tool_calls: [] } }] });
  assert.equal(observed.error.code, 'internal');
  observed = await invoke('upstream transient failure', new Error('Synthetic upstream unavailable'));
  assert.equal(observed.error.code, 'internal');
  assert.equal(observed.error.details, undefined);
  assert.equal(userData.entityExtractionUsage.daily.count, 1);
  const refreshed = await getUsageStatus.run(request);
  assert.equal(refreshed.usage.usage.daily.count, 1);
  console.log(JSON.stringify({ case: 'request deadline options', clientOptionKeys: Object.keys(constructorOptions), completionHasSignal: Object.hasOwn(requestBody, 'signal'), functionTimeoutSeconds: extractEntities.options.timeoutSeconds ?? null }));
  console.log('ALL AI RESPONSE PROBES COMPLETED');
})().catch(error => { console.error(error); process.exitCode = 1; });
