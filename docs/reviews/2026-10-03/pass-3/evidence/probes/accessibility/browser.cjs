const fs = require('fs');
const assert = require('assert/strict');
const http = require('http');
const { chromium } = require('/opt/codex/cua_node/lib/node_modules/playwright-core');
const out = '/tmp/pass3-accessibility';
const observations = [];
let runningBrowser;
let runningServer;
const note = (name, value) => { observations.push({ name, value }); console.log(JSON.stringify({ name, value })); };
async function main() {
  const assets = { '/index.html': ['index.html', 'text/html'], '/bundle.js': ['bundle.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/axe.js': ['axe.js', 'text/javascript'] };
  const server = http.createServer((request, response) => {
    const asset = assets[new URL(request.url, 'http://127.0.0.1').pathname];
    if (!asset) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'content-type': asset[1] }); response.end(fs.readFileSync(`${out}/${asset[0]}`));
  });
  runningServer = server;
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  runningBrowser = browser;
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  const open = async (mode, width = 1280, height = 720) => {
    await page.setViewportSize({ width, height });
    await page.goto(`${origin}/index.html?mode=${encodeURIComponent(mode)}#${mode}`);
    await page.waitForFunction(() => window.__probe?.ready && document.documentElement.style.getPropertyValue('--surface-page-bg'));
    assert.equal(await page.evaluate(() => [...document.styleSheets].some(sheet => {
      try { return [...sheet.cssRules].some(rule => rule.cssText.includes('.button-primary') && rule.cssText.includes('--action-primary-bg')); } catch { return false; }
    })), true, 'Actual theme component CSS must be loaded before measuring geometry/contrast');
  };
  const log = () => page.evaluate(() => window.__probe);
  const focused = () => page.evaluate(() => ({ tag: document.activeElement.tagName, id: document.activeElement.id, text: document.activeElement.textContent, name: document.activeElement.getAttribute('aria-label') }));

  // Keys originate from native controls, rather than synthesized dispatch.
  await open('attach');
  await page.getByRole('button', { name: 'Attach to Who is in it', exact: true }).click();
  const filter = page.getByRole('textbox', { name: 'Filter the list' });
  await filter.fill('Ada');
  await filter.press('Space');
  const space = { value: await filter.inputValue(), log: await log() };
  assert.equal(space.value, 'Ada'); assert.deepEqual(space.log.attached, ['ada']);
  note('attach-filter-space-toggles-instead-of-typing', space);
  await page.getByRole('button', { name: 'Close', exact: true }).focus();
  await page.keyboard.press('Enter');
  const close = { stillOpen: await page.getByRole('listbox').isVisible(), log: await log() };
  assert.equal(close.stillOpen, true); assert.deepEqual(close.log.detached, ['ada']);
  note('attach-close-enter-detaches-and-does-not-close', close);
  await page.getByRole('button', { name: 'No such person yet — add one', exact: true }).focus();
  await page.keyboard.press('Enter');
  const hatch = await log();
  assert.equal(hatch.created.length, 0); assert.deepEqual(hatch.attached, ['ada', 'ada']);
  note('attach-new-button-enter-attaches-instead-of-creating', hatch);
  await filter.focus(); await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('listbox').count(), 0);
  note('attach-escape-control', await focused());

  await open('palette');
  await page.getByRole('button', { name: 'Open palette', exact: true }).click();
  await page.getByRole('combobox').waitFor();
  for (let i = 0; i < 22; i++) await page.keyboard.press('ArrowDown');
  const geometry = await page.evaluate(() => {
    const input = document.querySelector('[role="combobox"]');
    const row = document.getElementById(input.getAttribute('aria-activedescendant'));
    const panel = document.querySelector('[data-testid="command-palette"]');
    const rr = row.getBoundingClientRect(), pr = panel.getBoundingClientRect();
    return { activeId: row.id, activeRole: row.getAttribute('role'), focusIsInput: document.activeElement === input,
      row: { top: rr.top, bottom: rr.bottom }, panel: { top: pr.top, bottom: pr.bottom, scrollTop: panel.scrollTop, scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight },
      fullyOutside: rr.top >= pr.bottom || rr.bottom <= pr.top };
  });
  assert.equal(geometry.activeRole, 'option'); assert.equal(geometry.focusIsInput, true); assert.equal(geometry.fullyOutside, true); assert.equal(geometry.panel.scrollTop, 0);
  note('palette-arrow-selection-fully-outside-scroll-viewport', geometry);
  await page.screenshot({ path: `${out}/palette-offscreen.png` });
  await page.keyboard.press('Enter');
  assert.deepEqual((await log()).navigated, ['/npcs/person-22']);
  note('palette-enter-commits-hidden-selected-option', await log());
  await page.getByRole('button', { name: 'Open palette', exact: true }).click();
  await page.keyboard.press('Escape');
  assert.equal((await focused()).text, 'Open palette');
  note('palette-escape-restores-focus-control', await focused());

  // Empty submission runs actual validation and Input rendering; create IO stub must stay unused.
  await open('form');
  await page.getByRole('button', { name: 'Create & open', exact: true }).focus();
  await page.keyboard.press('Enter');
  const form = await page.evaluate(() => ({
    fields: [...document.querySelectorAll('input,textarea')].map(node => ({ tag: node.tagName, label: document.querySelector(`label[for="${CSS.escape(node.id)}"]`)?.textContent,
      invalid: node.getAttribute('aria-invalid'), describedBy: node.getAttribute('aria-describedby'), error: node.closest('.flex.flex-col')?.querySelector('.form-error')?.textContent })),
    alerts: document.querySelectorAll('[role="alert"], [aria-live]').length,
    focusText: document.activeElement.textContent, writes: window.__probe.writes,
  }));
  const cdp = await context.newCDPSession(page);
  const doc = await cdp.send('DOM.getDocument');
  const field = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input' });
  const ax = await cdp.send('Accessibility.getPartialAXTree', { nodeId: field.nodeId, fetchRelatives: false });
  form.accessibilityNode = ax.nodes.map(n => ({ role: n.role, name: n.name, description: n.description, properties: n.properties }));
  assert.equal(form.writes, 0); assert.equal(form.alerts, 0); assert.equal(form.focusText, 'Create & open');
  assert.ok(form.fields.every(f => f.invalid === 'true' && !f.describedBy && f.error));
  note('quick-add-field-errors-unassociated-and-not-announced', form);

  // Actual drawer at its CSS breakpoint, composed before reader content as StoryPage does.
  await open('rail', 390, 844);
  await page.locator('#rail-trigger').focus();
  await page.keyboard.press('Enter');
  const opened = await focused();
  assert.equal(opened.id, 'rail-trigger');
  await page.keyboard.press('Tab');
  const tabbed = await focused(); assert.equal(tabbed.id, 'reader-action');
  await page.keyboard.press('Escape');
  const drawer = { openedFocus: opened, tabbedFocus: tabbed,
    closeStillVisible: await page.getByRole('button', { name: 'Close chapter list', exact: true }).isVisible(),
    modalCount: await page.locator('[role="dialog"], [aria-modal="true"]').count() };
  assert.equal(drawer.closeStillVisible, true); assert.equal(drawer.modalCount, 0);
  note('chapter-drawer-leaves-keyboard-focus-behind-scrim', drawer);
  await page.screenshot({ path: `${out}/drawer-focus.png` });

  // Basic dialog keyboard contract control, exercising actual component.
  await open('dialog');
  await page.locator('#dialog-trigger').focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Synthetic decision', exact: true }); await dialog.waitFor();
  assert.equal(await dialog.evaluate(el => document.activeElement === el), true);
  await page.keyboard.press('Shift+Tab'); assert.equal((await focused()).id, 'last-dialog-button');
  await page.keyboard.press('Tab'); assert.equal((await focused()).name, 'Close dialog');
  await page.keyboard.press('Escape'); assert.equal((await focused()).id, 'dialog-trigger');
  note('basic-dialog-entry-wrap-and-return-control', { passed: true });

  await open('quick-dialog');
  await page.locator('#quick-trigger').focus(); await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor();
  const quickEntryFocus = await focused();
  await page.keyboard.press('Escape');
  const quickExitFocus = await focused();
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.equal(quickExitFocus.tag, 'BODY');
  note('actual-quick-add-loses-opener-after-child-autofocus', { entry: quickEntryFocus, exit: quickExitFocus });

  // Bounded contrast and focus measurements only; axe is diagnostic, not a certification claim.
  for (const theme of ['light', 'dark']) {
    await open('contrast');
    await page.evaluate(theme => localStorage.setItem('medieval-companion-theme', theme), theme);
    await page.reload(); await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
    const restingButton = await page.locator('#contrast-button').evaluate(el => {
      const s = getComputedStyle(el); return { background: s.backgroundColor, color: s.color, outline: s.outlineStyle, outlineColor: s.outlineColor, boxShadow: s.boxShadow };
    });
    await page.keyboard.press('Tab');
    const focus = await page.locator('#contrast-button').evaluate(el => {
      const s = getComputedStyle(el); return { focus: document.activeElement === el, focusVisible: el.matches(':focus-visible'), background: s.backgroundColor, color: s.color, outline: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, boxShadow: s.boxShadow };
    });
    assert.equal(focus.focus, true); assert.equal(focus.focusVisible, true);
    await page.screenshot({ path: `${out}/button-focus-${theme}.png` });
    await page.keyboard.press('Tab');
    const outlineButtonFocus = await page.locator('#contrast-outline').evaluate(el => {
      const s = getComputedStyle(el); return { focus: document.activeElement === el, focusVisible: el.matches(':focus-visible'), outline: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, boxShadow: s.boxShadow };
    });
    await page.addScriptTag({ path: `${out}/axe.js` });
    const axe = await page.evaluate(async () => {
      const result = await axe.run(document.querySelector('main'), { runOnly: ['color-contrast', 'button-name', 'label'] });
      return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: result.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) };
    });
    note(`bounded-${theme}-contrast-and-button-focus-control`, { restingButton, focus, outlineButtonFocus, axe });
  }
  note('browser-page-errors', errors); assert.deepEqual(errors, []);
  fs.writeFileSync(`${out}/observations.json`, JSON.stringify(observations, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
main().catch(async err => { console.error(err); fs.writeFileSync(`${out}/observations-partial.json`, JSON.stringify(observations, null, 2)); if (runningBrowser) await runningBrowser.close(); if (runningServer) await new Promise(resolve => runningServer.close(resolve)); process.exitCode = 1; });
