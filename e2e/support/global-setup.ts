// e2e/support/global-setup.ts
import { seed } from "./seed";

/** Once per run, before any journey: fresh emulators holding the fixtures. */
export default async function globalSetup(): Promise<void> {
  await seed();
}
