"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { chromium } = require("/opt/codex/cua_node/lib/node_modules/playwright-core");
const helper = require("/tmp/pass5-runtime/helpers.cjs");
const probe = require("./restore.cjs");
const phase = process.argv[2];
assert(["before", "after"].includes(phase));
let browser;
(async () => {
  const records = [];
  const report = (name, value) => {
    records.push({ name, value });
    fs.writeFileSync(`/tmp/pass5-restore/observations-${phase}.json`, JSON.stringify(records, null, 2));
    console.log(JSON.stringify({ name, value }));
  };
  let api;
  if (phase === "before") {
    api = await helper.seedBase("restore");
    await probe.seed(api);
    const context = Object.fromEntries(["uid", "groupId", "campaignId", "basePath", "notesPath", "baseUrl", "email", "attribution", "now"].map(key => [key, api[key]]));
    fs.writeFileSync("/tmp/pass5-restore/synthetic-context.json", JSON.stringify(context, null, 2));
  } else {
    api = { ...JSON.parse(fs.readFileSync("/tmp/pass5-restore/synthetic-context.json")), db: helper.db, admin: helper.admin };
  }
  Object.assign(api, { report, restorePhase: phase });
  await probe.readback(api, phase);
  browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const blocked = [], errors = [];
  await context.route("**/*", async route => {
    const u = new URL(route.request().url());
    if (["127.0.0.1", "localhost", "[::1]"].includes(u.hostname)) return route.continue();
    blocked.push({ origin: u.origin, path: u.pathname });
    return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  Object.assign(api, { page, context, outDir: "/tmp/pass5-restore", go: route => page.goto(api.baseUrl + route) });
  await helper.signIn(page, api);
  const notice = page.getByRole("button", { name: "Got it", exact: true });
  if (await notice.isVisible()) await notice.click();
  await probe.run(api);
  await page.screenshot({ path: `/tmp/pass5-restore/restore-${phase}.png`, fullPage: true });
  report(`restore-runtime-${phase}`, { blockedRemoteRequests: blocked, pageErrors: errors, exportAuthAssertions: 0, seededContentAfterImport: phase === "after" ? false : null });
})().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  await helper.db.terminate();
});
