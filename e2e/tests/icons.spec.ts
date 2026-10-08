// e2e/tests/icons.spec.ts
import { test, expect } from "../support/test";

/**
 * The site has an icon (T121). Without one, `/favicon.ico` was answered with
 * the app's own page: every unknown path is rewritten to `index.html`, so a
 * missing icon never fails, it just serves HTML as the picture.
 */
test("every icon the page and its manifest name is served as an image", async ({ page, request }) => {
  await page.goto("/");
  const linked = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
  const manifest = await (await request.get("/manifest.json")).json();
  const named: string[] = (manifest.icons ?? []).map((icon: { src: string }) => icon.src);

  for (const path of new Set(["/favicon.ico", ...linked, ...named])) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(response.headers()["content-type"], path).toMatch(/^image\//);
  }
  expect(linked, "icons linked from the page").not.toHaveLength(0);
  expect(named, "icons named by the manifest").not.toHaveLength(0);
});
