'use strict';
// Prepared for CENTRAL execution only. This module starts no browser or server.
const assert = require('node:assert/strict');
const path = require('node:path');
const IDS = {
  queue: 'recovery-queue-a', queueB: 'recovery-queue-b',
  unmount: 'recovery-unmount', reload: 'recovery-reload',
  tabs: 'recovery-tabs', crossA: 'recovery-cross-a',
  crossB: 'recovery-cross-b', missing: 'recovery-missing'
};
const CAMPAIGN_B = 'review-recovery-b';
const stamp = '2026-10-04T00:00:00.000Z';
function localBase(api) {
  const u = new URL(api.baseUrl);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname), 'Only local app traffic is allowed');
  assert.equal(u.protocol, 'http:');
  return u.origin;
}
function notePath(api, id) { return `${api.notesPath}/${id}`; }
function noteData(api, id, campaignId = api.campaignId) {
  return { id, title: `Recovery ${id}`, content: `Original body for ${id}.`,
    campaignId, status: 'active', tags: [], extractedEntities: [], updatedAt: stamp,
    createdBy: api.uid, modifiedBy: api.uid, dateAdded: stamp, dateModified: stamp };
}
async function seed(api) {
  localBase(api);
  assert.equal(api.groupId, 'review-group');
  assert.equal(api.uid, 'review-user');
  await api.db.doc(`groups/${api.groupId}/campaigns/${CAMPAIGN_B}`).set({
    id: CAMPAIGN_B, groupId: api.groupId, name: 'Recovery second campaign',
    description: 'Synthetic fourth-pass recovery fixture', isActive: true,
    createdAt: stamp, createdBy: api.uid
  });
  for (const [key, id] of Object.entries(IDS)) {
    if (key === 'missing') { await api.db.doc(notePath(api, id)).delete(); continue; }
    await api.db.doc(notePath(api, id)).set(noteData(api, id,
      key === 'crossA' || key === 'crossB' ? CAMPAIGN_B : api.campaignId));
  }
}
async function read(api, id) {
  const snap = await api.db.doc(notePath(api, id)).get();
  return snap.exists ? snap.data() : null;
}
async function resetNote(api, id) {
  await api.db.doc(notePath(api, id)).set(noteData(api, id));
}
async function settleDoc(api, id, content, timeout = 15000) {
  const end = Date.now() + timeout;
  let actual;
  while (Date.now() < end) {
    actual = await read(api, id);
    if (actual?.content === content) return actual;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Local document ${id} did not reach expected content; last=${JSON.stringify(actual)}`);
}
async function state(page) {
  return page.evaluate(() => ({ route: location.pathname,
    headings: [...document.querySelectorAll('h1')].map(n => n.textContent),
    title: document.querySelector('input[aria-label="Note title"]')?.value,
    content: document.querySelector('.note-textarea')?.value,
    editorText: document.querySelector('.note-editor')?.textContent,
    bodyText: document.body.innerText.slice(-14000) }));
}
async function open(api, id, page = api.page) {
  await page.goto(`${localBase(api)}/notes/${id}`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Note content', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForFunction(id => document.querySelector('.note-textarea')?.value === `Original body for ${id}.`, id, { timeout: 20000 });
}
// BrowserRouter receives a genuine popstate event for a synthetic same-document
// history entry. No component/provider is directly called or replaced.
async function spa(page, urlPath) {
  assert.ok(urlPath.startsWith('/'));
  await page.evaluate(urlPath => {
    const previous = history.state || {};
    history.pushState({ ...previous, idx: (previous.idx || 0) + 1, key: `recovery-${Date.now()}` }, '', urlPath);
    dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  }, urlPath);
  await page.waitForFunction(urlPath => location.pathname === urlPath, urlPath);
}
async function screenshot(api, name, page = api.page) {
  if (api.outDir) await page.screenshot({ path: path.join(api.outDir, `recovery-${name}.png`), fullPage: true });
}
async function fallbackIdentity(api) {
  const page = api.page;
  await page.goto(`${localBase(api)}/notes/${IDS.missing}`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Note Not Found', { exact: true }).waitFor({ timeout: 20000 });
  await spa(page, `/notes/${IDS.crossA}`);
  await page.waitForTimeout(1000);
  const missingToExisting = await state(page);
  const persistedCrossA = await read(api, IDS.crossA);
  api.report('fallback-missing-to-existing', { missingToExisting, persistedCrossA });
  await screenshot(api, 'fallback-missing-to-existing');
  await page.goto(`${localBase(api)}/notes/${IDS.crossA}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: `Recovery ${IDS.crossA}`, exact: true }).waitFor({ timeout: 20000 });
  const loaded = await state(page);
  await spa(page, `/notes/${IDS.crossB}`);
  await page.waitForTimeout(1000);
  const firstToSecond = await state(page);
  api.report('fallback-loaded-to-other', { loaded, firstToSecond,
    persistedCrossB: await read(api, IDS.crossB) });
  await screenshot(api, 'fallback-loaded-to-other');
}
async function queuedRouteOwnership(api) {
  const { page, context } = api;
  await resetNote(api, IDS.queue);
  await resetNote(api, IDS.queueB);
  await open(api, IDS.queue);
  // Prime the ordinary header search online, then use its result for the
  // record transition. This exercises a player-facing route change.
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('combobox').fill(`Recovery ${IDS.queueB}`);
  await page.locator(`#cmdk-option-note-${IDS.queueB}`).waitFor({ timeout: 10000 });
  await page.keyboard.press('Escape');
  const first = 'First explicitly submitted version of note A.';
  const latest = 'Latest explicitly queued version of note A.';
  const beforeB = await read(api, IDS.queueB);
  await context.setOffline(true);
  try {
    await page.getByLabel('Note content', { exact: true }).fill(first);
    await page.keyboard.press('Control+s');
    await page.getByText('Saving...', { exact: true }).waitFor({ timeout: 8000 });
    await page.getByLabel('Note content', { exact: true }).fill(latest);
    await page.keyboard.press('Control+s');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.locator(`#cmdk-option-note-${IDS.queueB}`).waitFor({ timeout: 10000 });
    await page.locator(`#cmdk-option-note-${IDS.queueB}`).click();
    await page.waitForURL(`**/notes/${IDS.queueB}`);
    await page.waitForFunction(id => document.querySelector('.note-textarea')?.value === `Original body for ${id}.`, IDS.queueB, { timeout: 8000 });
    await page.waitForTimeout(100);
    api.report('queued-route-before-reconnect', { ui: await state(page), A: await read(api, IDS.queue), B: beforeB, first, latest });
  } finally { await context.setOffline(false); }
  await settleDoc(api, IDS.queue, first);
  await page.waitForTimeout(1500);
  api.report('queued-route-after-reconnect', { ui: await state(page), A: await read(api, IDS.queue), B: await read(api, IDS.queueB), expectedA: latest, beforeB });
  await screenshot(api, 'queued-route-after-reconnect');
}
async function queuedUnmountControl(api) {
  const { page, context } = api;
  await resetNote(api, IDS.unmount);
  await open(api, IDS.unmount);
  const first = 'First submitted before full editor unmount.';
  const latest = 'Latest queued save retained after full editor unmount.';
  await context.setOffline(true);
  try {
    await page.getByLabel('Note content', { exact: true }).fill(first);
    await page.keyboard.press('Control+s');
    await page.getByText('Saving...', { exact: true }).waitFor({ timeout: 8000 });
    await page.getByLabel('Note content', { exact: true }).fill(latest);
    await page.keyboard.press('Control+s');
    await page.getByRole('button', { name: 'All notes', exact: true }).click();
    await page.waitForURL('**/notes');
    api.report('queued-unmount-offline', { server: await read(api, IDS.unmount), first, latest });
  } finally { await context.setOffline(false); }
  const saved = await settleDoc(api, IDS.unmount, latest);
  api.report('queued-unmount-reconnected', { saved, route: new URL(page.url()).pathname });
}
async function multipleTabs(api) {
  const pageA = api.page;
  await resetNote(api, IDS.tabs);
  await open(api, IDS.tabs);
  const pageB = await api.context.newPage();
  try {
    await open(api, IDS.tabs, pageB);
    const remote = 'A newer body persisted by the first tab.';
    await pageA.getByLabel('Note content', { exact: true }).fill(remote);
    await pageA.keyboard.press('Control+s');
    await settleDoc(api, IDS.tabs, remote);
    await pageB.waitForTimeout(600);
    const beforeBAction = await state(pageB);
    await pageB.getByLabel('Note title', { exact: true }).fill('A title changed independently in the second tab');
    await pageB.keyboard.press('Control+s');
    await pageB.waitForTimeout(600);
    api.report('same-account-tabs', { beforeBAction, storedAfterB: await read(api, IDS.tabs), remote,
      knownMapping: 'DATA-003; field-patch/collaboration evidence, no new count' });
    await screenshot(api, 'same-account-tabs', pageB);
  } finally { await pageB.close(); }
}
async function localWriteReload(api) {
  const { page } = api;
  await resetNote(api, IDS.reload);
  await open(api, IDS.reload);
  const latest = 'A save already queued in the SDK before browser reload.';
  const matcher = u => {
    const parsed = new URL(u);
    return ['127.0.0.1', 'localhost'].includes(parsed.hostname) && parsed.port === '8080' && parsed.pathname.includes('google.firestore.v1.Firestore/Write/channel');
  };
  let blocked = 0;
  const handler = async route => { blocked++; await route.abort('internetdisconnected'); };
  await page.route(matcher, handler);
  try {
    await page.getByLabel('Note content', { exact: true }).fill(latest);
    await page.keyboard.press('Control+s');
    await page.getByText('Saving...', { exact: true }).waitFor({ timeout: 8000 });
    await page.waitForTimeout(700);
    api.report('local-write-block-before-reload', { blocked, latest, server: await read(api, IDS.reload), ui: await state(page) });
    await page.reload({ waitUntil: 'domcontentloaded' });
  } finally { await page.unroute(matcher, handler); }
  await page.getByLabel('Note content', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(600);
  api.report('local-write-block-after-reload', { blocked, latest, server: await read(api, IDS.reload), ui: await state(page),
    knownMapping: 'REACT-003 broader durability evidence; map after observed queue boundary' });
  await screenshot(api, 'local-write-block-after-reload');
}
// Changes ONE notes-target server frame as the browser reads actual local XHR.
// The local emulator remains healthy. This tests a terminal onSnapshot callback,
// not an ordinary transport outage, production denial, auth, or deployed rules.
async function installWatchFault(page, api, collectionPath = api.notesPath) {
  await page.addInitScript(({ collectionPath, campaignId }) => {
    const state = window.__recoveryFault = { enabled: true, targetIds: [], injected: false, changed: null };
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const responseDescriptor = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
    const info = new WeakMap();
    function localListen(url) {
      try { const u = new URL(url, location.href); return ['127.0.0.1','localhost'].includes(u.hostname) && u.port === '8080' && u.pathname.includes('google.firestore.v1.Firestore/Listen/channel'); }
      catch (_) { return false; }
    }
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      info.set(this, { local: localListen(String(url)), replacement: null });
      return originalOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function(body) {
      const meta = info.get(this);
      if (meta?.local && typeof body === 'string') {
        for (const [key, value] of new URLSearchParams(body)) {
          if (!key.endsWith('___data__')) continue;
          try {
            const message = JSON.parse(value), target = message.addTarget;
            if (target?.query?.parent?.endsWith(`/documents/${collectionPath.split('/').slice(0,-1).join('/')}`) &&
                target.query.structuredQuery?.from?.some(x => x.collectionId === collectionPath.split('/').at(-1)) &&
                JSON.stringify(target.query).includes(campaignId)) {
              state.targetIds.push(target.targetId);
            }
          } catch (_) {}
        }
      }
      return originalSend.call(this, body);
    };
    function rewrite(raw, meta) {
      if (meta.replacement) {
        const { start, end, text } = meta.replacement;
        return raw.length >= end ? raw.slice(0,start) + text + raw.slice(end) : raw;
      }
      if (!state.enabled || state.injected || !state.targetIds.length) return raw;
      let at = 0;
      while (at < raw.length) {
        while (raw[at] === '\n' || raw[at] === '\r') at++;
        const start = at, newline = raw.indexOf('\n', start);
        if (newline < 0) break;
        const prefix = raw.slice(start,newline);
        if (!/^\d+$/.test(prefix)) break;
        const payloadStart = newline+1, payloadEnd = payloadStart + Number(prefix);
        if (payloadEnd > raw.length) break;
        let payload;
        try { payload = JSON.parse(raw.slice(payloadStart,payloadEnd)); } catch (_) { at = payloadEnd; continue; }
        let changed = false;
        function visit(value) {
          if (!value || typeof value !== 'object') return;
          if (value.targetChange?.targetIds?.some(id => state.targetIds.includes(id))) {
            state.changed = JSON.parse(JSON.stringify(value));
            value.targetChange = { targetChangeType: 'REMOVE', targetIds: value.targetChange.targetIds.filter(id => state.targetIds.includes(id)),
              cause: { code: 14, message: 'Synthetic local transient notes collection failure' } };
            changed = true;
          } else for (const child of Object.values(value)) visit(child);
        }
        visit(payload);
        if (changed) {
          const json = JSON.stringify(payload);
          meta.replacement = { start, end: payloadEnd, text: `${new TextEncoder().encode(json).length}\n${json}` };
          state.injected = true;
          return raw.slice(0,start) + meta.replacement.text + raw.slice(payloadEnd);
        }
        at = payloadEnd;
      }
      return raw;
    }
    if (!responseDescriptor?.get) throw new Error('No native XHR responseText getter');
    Object.defineProperty(XMLHttpRequest.prototype, 'responseText', { ...responseDescriptor, get() {
      const raw = responseDescriptor.get.call(this), meta = info.get(this);
      return meta?.local ? rewrite(raw, meta) : raw;
    }});
  }, { collectionPath, campaignId: api.campaignId });
}
async function terminalNotesRecovery(api) {
  const page = await api.context.newPage();
  try {
    await installWatchFault(page, api);
    await page.goto(`${localBase(api)}/notes`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__recoveryFault?.injected, null, { timeout: 15000 });
    await page.getByText('Failed to fetch notes', { exact: true }).waitFor({ timeout: 10000 });
    const fault = await page.evaluate(() => { window.__recoveryFault.enabled = false; return window.__recoveryFault; });
    const failed = await state(page);
    await spa(page, '/privacy');
    await page.waitForTimeout(100);
    await spa(page, '/notes');
    await page.waitForTimeout(700);
    api.report('terminal-note-listener', { fault, failed, afterFaultRemovedAndReturn: await state(page),
      serverNote: await read(api, IDS.unmount), injectedCause: 'Synthetic local Watch target REMOVE with code14; emulator healthy' });
    await screenshot(api, 'terminal-note-listener', page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    // Init script runs again on reload, so disable before the note demand opens.
    await page.evaluate(() => { window.__recoveryFault.enabled = false; });
    await page.waitForTimeout(1000);
    api.report('terminal-note-listener-reload', await state(page));
  } finally { await page.close(); }
}
async function run(api) {
  localBase(api);
  const selected = process.env.PASS4_RECOVERY_CASES?.split(',');
  const cases = { fallback: fallbackIdentity, queueRoute: queuedRouteOwnership,
    queueUnmount: queuedUnmountControl, tabs: multipleTabs,
    reload: localWriteReload, terminal: terminalNotesRecovery };
  for (const [name, fn] of Object.entries(cases)) {
    if (selected && !selected.includes(name)) continue;
    try { await fn(api); api.report(`recovery-case-${name}`, { completed: true }); }
    catch (error) { api.report(`recovery-case-${name}`, { completed: false, error: error.stack }); }
    finally { await api.context.setOffline(false); }
  }
}
module.exports = { seed, run, installWatchFault, IDS, CAMPAIGN_B };
