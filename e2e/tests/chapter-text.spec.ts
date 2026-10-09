// e2e/tests/chapter-text.spec.ts
import { test, expect } from "../support/test";
import { FIXTURES } from "../support/seed";

// T134: a chapter's text is a document of its own, read where the chapter is
// opened, so the story's listener no longer downloads the book. A chapter
// written before keeps its text on the chapter until the migration moves it;
// the app reads it there, and saving moves it -- under the production rules.

const { legacyChapter } = FIXTURES;

test("a new chapter's text is written, read and edited where it now lives", async ({ page }) => {
  await page.goto("/story/chapters/create");
  await page.getByLabel("Chapter Title").fill("The Lantern Goes Out");
  await page.getByLabel("Chapter Content", { exact: true }).fill("Every light on the coast went dark at once.");
  await page.getByRole("button", { name: "Create Chapter" }).click();
  await expect(page).toHaveURL("/story/chapters");

  await page.getByRole("button", { name: /The Lantern Goes Out/ }).click();
  await expect(page).toHaveURL(/\/story\/chapters\/chapter-/);
  await expect(page.getByText("Every light on the coast went dark at once.")).toBeVisible();
  const chapterUrl = page.url();

  await page.getByRole("button", { name: "Edit" }).first().click();
  const text = page.getByLabel("Chapter Content", { exact: true });
  await expect(text).toHaveValue("Every light on the coast went dark at once.");
  await text.fill("Every light on the coast went dark at once, but one.");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page).toHaveURL("/story/chapters");

  await page.goto(chapterUrl);
  await expect(page.getByText("Every light on the coast went dark at once, but one.")).toBeVisible();
});

test("a chapter written before reads as it did, and its text moves when it is saved", async ({ page }) => {
  await page.goto(`/story/chapters/${legacyChapter.id}`);
  await expect(page.getByText(legacyChapter.text)).toBeVisible();

  await page.goto(`/story/chapters/edit/${legacyChapter.id}`);
  const text = page.getByLabel("Chapter Content", { exact: true });
  await expect(text).toHaveValue(legacyChapter.text);
  await text.fill(`${legacyChapter.text} Nobody slept.`);
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page).toHaveURL("/story/chapters");

  await page.goto(`/story/chapters/${legacyChapter.id}`);
  await expect(page.getByText(`${legacyChapter.text} Nobody slept.`)).toBeVisible();
});
