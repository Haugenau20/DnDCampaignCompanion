"use strict";
const assert = require("node:assert/strict");
const buildFixtures = require("./fixtures.cjs");
const workflows = require("./workflows.cjs");
exports.seed = async api => {
  await workflows.seed(api);
  await api.db.doc(`${api.basePath}/rumors/workflow-search-rumor`).set({ ...api.attribution, id: "workflow-search-rumor", title: "Workflow Search Rumour", content: "A synthetic search navigation fixture.", status: "unconfirmed", sourceName: "", relatedNPCs: [], relatedLocations: [], notes: [] });
};
exports.run = async api => {
  const { page, db, admin, go, report } = api;
  const fixture = buildFixtures(api);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const poll = async (fn, description) => {
    const deadline = Date.now() + 16000;
    while (Date.now() < deadline) {
      const value = await fn();
      if (value) return value;
      await pause(120);
    }
    throw new Error(`Timed out: ${description}`);
  };
  await workflows.run({ ...api, caseFilter: "known-" });
  const targets = [
    { type: "npc", id: fixture.ids.npc, title: fixture.names.npc, route: `/npcs/${fixture.ids.npc}` },
    { type: "location", id: fixture.ids.location, title: fixture.names.location, route: `/locations/${fixture.ids.location}` },
    { type: "quest", id: fixture.ids.quest, title: fixture.names.quest, route: `/quests/${fixture.ids.quest}` },
    { type: "rumors", id: "workflow-search-rumor", title: "Workflow Search Rumour", route: "/rumors?highlight=workflow-search-rumor" },
    { type: "note", id: fixture.noteId, title: "Workflow Conversion Session", route: `/notes/${fixture.noteId}` },
    { type: "story", id: fixture.ids.chapter, title: "Workflow Opening Chapter", route: `/story/chapters/${fixture.ids.chapter}` },
  ];
  // Warm real reference providers before measuring destination correctness.
  await go(`/notes/${fixture.noteId}`);
  await page.getByLabel("Note content", { exact: true }).waitFor();
  await poll(() => page.getByRole("button", { name: "Scan note", exact: true }).isEnabled(), "note's ordinary reference collections ready; no scan is invoked");
  const search = [];
  for (const target of targets) {
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const input = page.getByPlaceholder("Search stories, quests, NPCs...");
    await input.fill(target.title);
    const selector = `#cmdk-option-${target.type}-${target.id}`;
    const option = page.locator(selector);
    let queryReissued = false;
    if (!(await option.isVisible().catch(() => false))) {
      await pause(700);
      if (!(await option.isVisible().catch(() => false))) {
        // This is the prior REACT-007 lifecycle boundary, not a destination failure.
        queryReissued = true;
        await input.fill("");
        await input.fill(target.title);
      }
    }
    await option.waitFor();
    const label = await option.innerText();
    await option.click();
    await page.waitForURL(url => url.pathname + url.search === target.route);
    const row = { type: target.type, id: target.id, selector, label, queryReissued, route: new URL(page.url()).pathname + new URL(page.url()).search };
    search.push(row); report(`search-exact-${target.type}`, row);
  }
  report("ordinary-search-navigation-corrected", { result: "all six exact record options opened their actual destinations", search, originalHarnessIssue: "Text-based option selector could select the named-create action while data arrived; exact record DOM identity fixes the harness." });

  await go(`/npcs/${fixture.ids.npc}`);
  await page.getByRole("button", { name: "Add portrait", exact: true }).waitFor();
  // Generated diagnostic pixels only: no external file, asset, model or real image data.
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 16; canvas.height = 12;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#2563eb"; ctx.fillRect(0, 0, 16, 12);
    ctx.fillStyle = "#fbbf24"; ctx.fillRect(3, 3, 6, 5);
    return canvas.toDataURL("image/png");
  });
  const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
  await page.locator('input[type="file"][data-testid="image-upload-input"]').setInputFiles({ name: "synthetic-workflow-portrait.png", mimeType: "image/png", buffer: bytes });
  const npcPath = `${api.basePath}/npcs/${fixture.ids.npc}`;
  const uploaded = await poll(async () => {
    const data = (await db.doc(npcPath).get()).data();
    return data?.image ? data.image : false;
  }, "actual browser image upload saved on NPC");
  assert.equal(uploaded.width, 16); assert.equal(uploaded.height, 12);
  assert(uploaded.path.startsWith(`${api.basePath}/npcs/${fixture.ids.npc}/`));
  assert(new URL(uploaded.url).hostname === "127.0.0.1" || new URL(uploaded.url).hostname === "localhost");
  const bucket = admin.storage().bucket();
  const [existsAfterUpload] = await bucket.file(uploaded.path).exists();
  assert(existsAfterUpload);
  const image = page.getByRole("img", { name: `Portrait of ${fixture.names.npc}`, exact: true });
  await image.waitFor();
  await poll(() => image.evaluate(el => el.complete && el.naturalWidth === 16 && el.naturalHeight === 12), "real image decoded in Chromium");
  await go(`/npcs/${fixture.ids.npc}`);
  await image.waitFor();
  await poll(() => image.evaluate(el => el.complete && el.naturalWidth === 16), "persisted portrait reloaded from local Storage");
  await page.getByRole("button", { name: "Remove portrait", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete portrait", exact: true }).click();
  await poll(async () => (await db.doc(npcPath).get()).data().image === null, "portrait document reference cleared");
  await poll(async () => !(await bucket.file(uploaded.path).exists())[0], "old image binary removed from Storage emulator");
  await go(`/npcs/${fixture.ids.npc}`);
  await page.getByRole("button", { name: "Add portrait", exact: true }).waitFor();
  const existsAfterRemove = (await bucket.file(uploaded.path).exists())[0];
  const final = { fixtureBytes: bytes.length, uploaded, existsAfterUpload, existsAfterRemove, portraitAbsentOnReopen: (await image.count()) === 0, documentImage: (await db.doc(npcPath).get()).data().image };
  assert.equal(final.portraitAbsentOnReopen, true);
  report("ordinary-npc-image-upload-reopen-remove-reopen", final);
};
