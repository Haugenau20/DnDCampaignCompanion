// e2e/support/test.ts
import { test as base, expect } from "@playwright/test";
import { E2E } from "./env";

/**
 * Playwright's `test`, with two rules for every journey:
 *
 * - **Nothing leaves the machine.** Requests to anything but the app and the
 *   emulators are aborted (Analytics, fonts), so a journey cannot depend on,
 *   or write to, a real service.
 * - **An uncaught error in the page fails the journey**, even when the screen
 *   looked right: jsdom never sees most of them, which is why these exist.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  context: async ({ context }, use) => {
    await context.route((url) => url.hostname !== E2E.host, (route) => route.abort());
    await use(context);
  },
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
