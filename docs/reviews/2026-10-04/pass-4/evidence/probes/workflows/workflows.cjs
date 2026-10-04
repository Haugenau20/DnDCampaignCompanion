"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const buildFixtures = require("./fixtures.cjs");

exports.seed = async function seed(api) {
  const fixture = buildFixtures(api);
  for (const document of fixture.documents) await api.db.doc(document.path).set(document.data);
  if (api.report) api.report("workflow-fixtures", { documents: fixture.documents.map(document => document.path), modelRequests: 0 });
};

/** Caller owns browser, login, server/emulators and teardown. Exercises the real App. */
exports.run = async function run(api) {
  const { page, db, report, go, outDir } = api;
  const fixture = buildFixtures(api);
  const { campaignPath, notePath, noteId, ids, names } = fixture;
  const created = {};
  const results = [];
  page.setDefaultTimeout(15000);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const read = async documentPath => (await db.doc(documentPath).get()).data();
  const poll = async (fn, description) => {
    const deadline = Date.now() + 16000;
    let value;
    while (Date.now() < deadline) {
      value = await fn();
      if (value) return value;
      await sleep(150);
    }
    throw new Error(`Timed out: ${description}`);
  };
  const saved = async (collection, id, predicate) => poll(async () => {
    const data = await read(`${campaignPath}/${collection}/${id}`);
    return data && predicate(data) ? data : false;
  }, `${collection}/${id} persisted expected fields`);
  const step = async (name, fn) => {
    if (api.caseFilter && !name.includes(api.caseFilter)) return;
    try {
      const detail = await fn();
      const result = { name, status: "observed", detail: detail ?? null, url: page.url() };
      results.push(result); report(name, result);
    } catch (error) {
      const result = { name, status: "diagnostic-error", error: String(error.stack || error), url: page.url(), body: (await page.locator("body").innerText().catch(() => "")).slice(0, 10000) };
      if (outDir) {
        const imagePath = path.join(outDir, `workflow-${name.replace(/[^a-z0-9]+/gi, "-")}.png`);
        await page.screenshot({ path: imagePath, fullPage: true }).catch(() => {});
        result.screenshot = imagePath;
      }
      results.push(result); report(name, result);
    }
  };
  const quickCreate = async (kind, name, line) => {
    const plural = { npc: "npcs", quest: "quests", location: "locations" }[kind];
    await go(`/${plural}/create`);
    await page.getByLabel(kind === "quest" ? "Title" : "Name", { exact: true }).fill(name);
    await page.getByLabel({ npc: "Who are they, in a line?", quest: "What was the party asked to do?", location: "What is this place, in a line?" }[kind], { exact: true }).fill(line);
    await page.getByRole("button", { name: "Create & open", exact: true }).click();
    await page.waitForURL(url => url.pathname.startsWith(`/${plural}/`) && !url.pathname.endsWith("/create"));
    const id = new URL(page.url()).pathname.split("/").pop();
    return { id, name, plural };
  };
  const trayPick = async (trigger, candidate) => {
    await page.getByRole("button", { name: trigger, exact: true }).click();
    await page.getByRole("listbox").getByRole("option").filter({ hasText: candidate }).click();
    const close = page.getByRole("button", { name: "Close", exact: true });
    if (await close.isVisible().catch(() => false)) await close.click();
  };

  for (const kind of ["npc", "location", "quest"]) {
    await step(`ordinary-${kind}-create-edit-reopen`, async () => {
      const current = await quickCreate(kind, `Browser Route ${kind.toUpperCase()}`, `Synthetic ${kind} created through the actual route.`);
      created[kind] = current;
      await saved(current.plural, current.id, data => (data.name || data.title) === current.name);
      if (kind === "npc") await page.getByRole("button", { name: `Edit the name ${current.name}`, exact: true }).click();
      else await page.getByRole("button", { name: "Rename", exact: true }).click();
      const renamed = `${current.name} Edited`;
      await page.getByLabel(kind === "quest" ? "Title" : "Name", { exact: true }).fill(renamed);
      await page.getByRole("button", { name: kind === "quest" ? "Save title" : "Save name", exact: true }).click();
      const persisted = await saved(current.plural, current.id, data => (data.name || data.title) === renamed);
      current.name = renamed;
      await go(`/${current.plural}/${current.id}`);
      await page.getByText(renamed, { exact: true }).first().waitFor({ state: "visible" });
      return { id: current.id, name: renamed, persisted };
    });
  }

  await step("ordinary-npc-attach-detach", async () => {
    const current = created.npc; assert(current);
    await go(`/npcs/${current.id}`);
    const trigger = `Attach to what ${current.name} is linked to`;
    await trayPick(trigger, names.location);
    await saved("npcs", current.id, data => data.locationId === ids.location);
    await trayPick(trigger, names.quest);
    await saved("npcs", current.id, data => data.connections.relatedQuests.includes(ids.quest));
    await trayPick(trigger, names.quest);
    await saved("npcs", current.id, data => !data.connections.relatedQuests.includes(ids.quest));
    await trayPick(trigger, names.location);
    const final = await saved("npcs", current.id, data => !data.locationId);
    return { attachedThenDetached: [ids.location, ids.quest], final };
  });

  for (const kind of ["location", "quest"]) {
    await step(`ordinary-${kind}-attach-detach`, async () => {
      const current = created[kind]; assert(current);
      await go(`/${current.plural}/${current.id}`);
      await trayPick(`Attach to the people in ${current.name}`, names.npc);
      const field = kind === "location" ? "connectedNPCs" : "relatedNPCIds";
      await saved(current.plural, current.id, data => data[field].includes(ids.npc));
      await page.getByRole("button", { name: `Remove ${names.npc} from ${current.name}`, exact: true }).click();
      const final = await saved(current.plural, current.id, data => !data[field].includes(ids.npc));
      return { attachedThenDetached: ids.npc, final };
    });
  }

  await step("ordinary-rumor-create-edit-attach-detach", async () => {
    await go("/rumors");
    const content = "Browser Route rumour: the synthetic bridge is open.";
    await page.getByLabel("Heard something? Write it down here", { exact: true }).fill(content);
    await page.getByRole("button", { name: "Add rumour", exact: true }).click();
    await page.getByLabel("What was heard", { exact: true }).waitFor();
    const title = "Browser Route Rumour Edited";
    await page.getByLabel("Call it", { exact: true }).fill(title);
    await page.getByLabel("What was heard", { exact: true }).fill(`${content} Updated.`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const found = await poll(async () => {
      const snapshot = await db.collection(`${campaignPath}/rumors`).where("title", "==", title).get();
      return snapshot.empty ? false : { id: snapshot.docs[0].id, data: snapshot.docs[0].data() };
    }, "rumour written through composer/editor");
    created.rumor = { id: found.id, name: title, plural: "rumors" };
    await trayPick(`Attach to what ${title} points at`, names.npc);
    await saved("rumors", found.id, data => data.relatedNPCs.includes(ids.npc));
    await trayPick(`Attach to what ${title} points at`, names.location);
    await saved("rumors", found.id, data => data.locationId === ids.location);
    await page.getByRole("button", { name: `Detach ${names.npc}`, exact: true }).click();
    await page.getByRole("button", { name: `Detach ${names.location}`, exact: true }).click();
    const final = await saved("rumors", found.id, data => !data.locationId && !data.relatedNPCs.includes(ids.npc));
    await go(`/rumors?highlight=${found.id}`);
    assert.equal(await page.getByLabel("What was heard", { exact: true }).inputValue(), `${content} Updated.`);
    return { id: found.id, final };
  });

  await step("ordinary-note-create-autosave-reopen", async () => {
    await go("/notes");
    await page.getByRole("button", { name: "New note", exact: true }).click();
    await page.waitForURL(url => url.pathname.startsWith("/notes/"));
    const id = new URL(page.url()).pathname.split("/").pop();
    created.note = { id, name: "Browser Route Note", plural: "notes" };
    await page.getByLabel("Note title", { exact: true }).fill(created.note.name);
    const content = "The party took ordinary synthetic notes at the harbor. This paragraph was written through the full NoteEditor and saved by its idle autosave.";
    await page.getByLabel("Note content", { exact: true }).fill(content);
    const persisted = await poll(async () => {
      const data = await read(`${notePath}/${id}`);
      return data && data.content === content && data.title === created.note.name ? data : false;
    }, "new note autosave");
    await go("/notes");
    await page.getByRole("button", { name: created.note.name, exact: true }).click();
    assert.equal(await page.getByLabel("Note content", { exact: true }).inputValue(), content);
    return { id, persisted };
  });

  for (const kind of ["npc", "location", "quest", "rumor"]) {
    await step(`prepared-note-${kind}-conversion`, async () => {
      await go(`/notes/${noteId}`);
      const entity = fixture.documents.find(document => document.path.endsWith(`/${noteId}`)).data.extractedEntities.find(candidate => candidate.type === kind);
      const text = page.locator(".campaign-links").getByText(entity.text, { exact: true });
      await text.waitFor();
      await text.locator("..").locator("..").getByRole("button", { name: "Add", exact: true }).click();
      let id;
      const plural = { npc: "npcs", location: "locations", quest: "quests", rumor: "rumors" }[kind];
      if (kind !== "rumor") {
        await page.waitForURL(url => url.pathname === `/${plural}/create`);
        assert.equal(await page.getByLabel(kind === "quest" ? "Title" : "Name", { exact: true }).inputValue(), entity.text);
        await page.getByRole("button", { name: "Create & open", exact: true }).click();
        await page.waitForURL(url => url.pathname.startsWith(`/${plural}/`) && !url.pathname.endsWith("/create"));
        id = new URL(page.url()).pathname.split("/").pop();
      } else {
        await page.waitForURL(url => url.pathname === "/rumors" && url.searchParams.has("highlight"));
        id = new URL(page.url()).searchParams.get("highlight");
      }
      const source = await poll(async () => {
        const note = await read(`${notePath}/${noteId}`);
        const detection = note.extractedEntities.find(candidate => candidate.id === entity.id);
        return detection.isConverted && detection.convertedToId === id ? detection : false;
      }, "conversion marked source detection with actual target id");
      const target = await read(`${campaignPath}/${plural}/${id}`);
      if (kind === "npc") { assert.equal(target.locationId, ids.location); assert.equal(target.relationship, "friendly"); }
      if (kind === "location") assert.equal(target.parentId, ids.location);
      if (kind === "quest") { assert.deepEqual(target.relatedNPCIds, [ids.npc]); assert.equal(target.objectives.length, 2); assert(target.objectives.every(objective => typeof objective.description === "string")); }
      if (kind === "rumor") { assert.equal(target.sourceType, "npc"); assert.equal(target.sourceName, names.npc); }
      await go(`/notes/${noteId}`);
      await page.getByLabel("Note content", { exact: true }).waitFor();
      await poll(async () => !(await page.locator(".campaign-links").getByText(entity.text, { exact: true }).locator("..").locator("..").getByRole("button", { name: "Add", exact: true }).count()), "converted source no longer offers Add");
      return { id, source, target, paidModelRequests: 0 };
    });
  }

  await step("ordinary-chapter-create-edit-read", async () => {
    await go("/story/chapters/create");
    const title = "Browser Route Chapter";
    await page.getByLabel("Chapter Title", { exact: true }).fill(title);
    await page.getByLabel("Chapter Content", { exact: true }).fill("# A synthetic crossing\n\nThe party crossed the river safely.\n\nThis chapter was created through the full app.");
    await page.getByLabel("Chapter Summary (optional)", { exact: true }).fill("Synthetic crossing summary.");
    await page.getByRole("button", { name: "Create Chapter", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/story/chapters");
    const found = await poll(async () => {
      const snapshot = await db.collection(`${campaignPath}/chapters`).where("title", "==", title).get();
      return snapshot.empty ? false : { id: snapshot.docs[0].id, data: snapshot.docs[0].data() };
    }, "chapter creation");
    created.chapter = { id: found.id, name: `${title} Edited`, plural: "chapters" };
    await go(`/story/chapters/edit/${found.id}`);
    await page.getByLabel("Chapter Title", { exact: true }).fill(created.chapter.name);
    await page.getByLabel("Chapter Content", { exact: true }).fill("# The return crossing\n\nThe party returned over the synthetic river. This is the edited chapter body.");
    await page.getByRole("button", { name: "Save Changes", exact: true }).click();
    await saved("chapters", found.id, data => data.title === created.chapter.name && data.content.includes("edited chapter body"));
    await go(`/story/chapters/${found.id}`);
    await page.getByRole("heading", { name: created.chapter.name, exact: true }).waitFor();
    await page.getByText(/This is the edited chapter body/).waitFor();
    const progressPath = `groups/${api.groupId}/users/${api.uid}/story-progress/${api.campaignId}`;
    const progress = await poll(async () => {
      const data = await read(progressPath);
      return data && data.currentChapter === found.id && data.chapterProgress?.[found.id]?.isComplete ? data : false;
    }, "actual short reader completion persisted");
    return { id: found.id, progress };
  });

  await step("ordinary-saga-create-edit-read", async () => {
    const sagaPath = `${campaignPath}/saga/sagaData`;
    for (const version of ["Created", "Edited"]) {
      await go("/story/saga/edit");
      const title = `Browser Route Saga ${version}`;
      const content = `# The synthetic saga\n\nThis campaign saga was ${version.toLowerCase()} through the full app.\n\nThe party crossed the river.`;
      await page.getByLabel("Saga Title", { exact: true }).fill(title);
      await page.getByLabel("Saga Content", { exact: true }).fill(content);
      await page.getByRole("button", { name: "Save Saga", exact: true }).click();
      await page.waitForURL(url => url.pathname === "/story/saga");
      await poll(async () => {
        const data = await read(sagaPath);
        return data && data.title === title && data.content === content ? data : false;
      }, `saga ${version.toLowerCase()} persisted`);
      await page.getByRole("heading", { name: title, exact: true }).first().waitFor();
      await page.getByText(`This campaign saga was ${version.toLowerCase()} through the full app.`, { exact: true }).waitFor();
    }
    return { saga: await read(sagaPath) };
  });

  await step("ordinary-global-search-navigation", async () => {
    const routes = [];
    for (const kind of ["npc", "location", "quest", "rumor", "note", "chapter"]) {
      const current = created[kind]; assert(current, `${kind} prior fixture exists`);
      await go("/");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page.getByPlaceholder("Search stories, quests, NPCs...").fill(current.name);
      const option = page.locator(`#cmdk-option-${kind === "chapter" ? "story" : kind}-${current.id}`);
      // Result kind is observed from actual option identity; chapters may be named chapter/story by current schema.
      const foundOption = page.getByRole("option").filter({ hasText: current.name }).first();
      await foundOption.waitFor();
      await foundOption.click();
      const expected = kind === "rumor" ? `/rumors?highlight=${current.id}` : kind === "chapter" ? `/story/chapters/${current.id}` : `/${current.plural}/${current.id}`;
      await page.waitForURL(url => url.pathname + url.search === expected);
      routes.push({ kind, expected, observed: new URL(page.url()).pathname + new URL(page.url()).search, optionIdentityExists: await option.count() });
    }
    return routes;
  });

  await step("candidate-attachment-create-add-another", async () => {
    await go(`/locations/${ids.location}`);
    await page.getByRole("button", { name: `Attach to the people in ${names.location}`, exact: true }).click();
    await page.getByRole("button", { name: /no such person yet.*add one/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name", { exact: true }).fill("Browser Escape Hatch Another");
    await dialog.getByLabel("Who are they, in a line?", { exact: true }).fill("Synthetic person created while attaching to a location.");
    await dialog.getByRole("button", { name: "Create & add another", exact: true }).click();
    await dialog.getByText("1 NPC added", { exact: true }).waitFor();
    const snapshot = await db.collection(`${campaignPath}/npcs`).where("name", "==", "Browser Escape Hatch Another").get();
    assert.equal(snapshot.size, 1);
    const firstId = snapshot.docs[0].id;
    const afterFirst = await read(`${campaignPath}/locations/${ids.location}`);
    // Capture the defect as an observation; compare the ordinary sibling action as control.
    await dialog.getByLabel("Name", { exact: true }).fill("Browser Escape Hatch Open");
    await dialog.getByLabel("Who are they, in a line?", { exact: true }).fill("Synthetic positive-control person created through the sibling action.");
    await dialog.getByRole("button", { name: "Create & open", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    const secondSnapshot = await db.collection(`${campaignPath}/npcs`).where("name", "==", "Browser Escape Hatch Open").get();
    assert.equal(secondSnapshot.size, 1);
    const secondId = secondSnapshot.docs[0].id;
    const afterSecond = await saved("locations", ids.location, data => data.connectedNPCs.includes(secondId));
    return { firstId, firstExists: true, firstAttachedAfterAddAnother: afterFirst.connectedNPCs.includes(firstId), secondId, secondAttachedAfterCreateOpen: afterSecond.connectedNPCs.includes(secondId), stayedOnLocation: new URL(page.url()).pathname === `/locations/${ids.location}`, locationAfterFirst: afterFirst, locationAfterSecond: afterSecond };
  });

  await step("known-REACT-003-leave-before-note-autosave", async () => {
    await go(`/notes/${noteId}`);
    const field = page.getByLabel("Note content", { exact: true });
    await field.waitFor();
    const before = await field.inputValue();
    const unsaved = `${before}\nAn immediate navigation leaves this synthetic final line unsaved.`;
    await field.fill(unsaved);
    await page.getByRole("button", { name: "All notes", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/notes");
    await sleep(2200);
    const persisted = await read(`${notePath}/${noteId}`);
    await go(`/notes/${noteId}`);
    await field.waitFor();
    const reopened = await field.inputValue();
    return { overlap: "REACT-003; validation only, no new finding", persistedHasFinalLine: persisted.content === unsaved, reopenedHasFinalLine: reopened === unsaved, reopenedEqualsPriorSaved: reopened === before };
  });

  await step("known-FUNC-003-optional-npc-role-clear", async () => {
    await go(`/npcs/${ids.npc}`);
    await page.getByRole("button", { name: "Edit role", exact: true }).click();
    await page.getByLabel("Role", { exact: true }).fill("");
    const saveDisabled = await page.getByRole("button", { name: "Save role", exact: true }).isDisabled();
    const persisted = await read(`${campaignPath}/npcs/${ids.npc}`);
    return { overlap: "FUNC-003; validation only, no new finding", saveDisabled, persistedRole: persisted.occupation };
  });

  await step("candidate-new-chapter-cancel-destination", async () => {
    await go("/story/chapters/create");
    await page.getByLabel("Chapter Title", { exact: true }).fill("Cancelled synthetic chapter");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForURL(url => url.pathname !== "/story/chapters/create");
    await page.getByRole("heading", { name: "Workflow Opening Chapter", exact: true }).waitFor();
    return { expected: "/story/chapters", actual: new URL(page.url()).pathname, readerHeading: await page.getByRole("heading", { level: 1 }).allTextContents(), cancelledDraftWritten: !(await db.collection(`${campaignPath}/chapters`).where("title", "==", "Cancelled synthetic chapter").get()).empty };
  });

  for (const kind of ["npc", "quest", "location", "rumor"]) {
    await step(`ordinary-${kind}-delete`, async () => {
      const current = created[kind]; assert(current);
      await go(kind === "rumor" ? `/rumors?highlight=${current.id}` : `/${current.plural}/${current.id}`);
      if (kind === "rumor") {
        await page.getByRole("button", { name: "Delete", exact: true }).click();
        await page.getByRole("button", { name: `Delete ${current.name}`, exact: true }).click();
      } else {
        await page.getByRole("button", { name: kind === "npc" ? "Delete" : `Delete ${kind}`, exact: true }).click();
        await page.getByRole("dialog").getByRole("button", { name: kind === "npc" ? "Delete NPC" : `Delete ${current.name}`, exact: true }).click();
      }
      await poll(async () => !(await db.doc(`${campaignPath}/${current.plural}/${current.id}`).get()).exists, "entity deleted in emulator");
      return { id: current.id, documentExists: false };
    });
  }
  report("workflow-complete", { results, created, runtimeBoundary: "Full actual CRA App; actual Firebase local emulator writes; prepared detections only; no AI model requests." });
  return results;
};
