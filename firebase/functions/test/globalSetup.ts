// functions/test/globalSetup.ts
import {EMULATOR_HOSTS} from "./emulator";

/**
 * Fails the run at once, and says why, when the emulators are not up.
 *
 * Without this every test fails on its own with a connection error several
 * seconds later, which reads like thirty broken tests rather than one missing
 * process.
 */
export default async function globalSetup(): Promise<void> {
  for (const [name, host] of Object.entries(EMULATOR_HOSTS)) {
    try {
      await fetch(`http://${host}/`);
    } catch {
      throw new Error(
        `The ${name} emulator is not reachable at ${host}. Start the ` +
        "emulators first: .\\scripts\\start-dev.ps1 -Action start"
      );
    }
  }
}
