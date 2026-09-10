// src/test-utils/flush-lazy.ts
import { act } from '@testing-library/react';

/**
 * Resolve a `React.lazy` boundary that the render under test just suspended
 * on, so the component's real output is in the DOM before you assert on it.
 *
 * Needed because `Markdown` keeps the CommonMark parser behind a dynamic
 * import — `react-markdown` and its unified tree are 43 kB gzipped and would
 * otherwise sit in `main.js` (D82). Any test that asserts on rendered prose
 * has to cross that boundary.
 *
 * Two things to know, both learned the hard way:
 *
 * - **`findBy*` does not work for this.** Its polling never wraps the lazy
 *   resolution, so it waits out its full timeout and then fails as if the
 *   content were missing. Flushing inside `act` resolves it immediately.
 * - **Only the first mount per file is cold.** `React.lazy` caches the
 *   resolved module on the lazy object, so later renders in the same file are
 *   synchronous. That makes it tempting to skip the flush — don't: which test
 *   is "first" is an accident of ordering, and a test that only asserts
 *   *absence* (no `<script>` element, say) passes vacuously against a
 *   suspended boundary that rendered nothing at all.
 */
export async function flushLazy(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  await act(async () => {});
}
