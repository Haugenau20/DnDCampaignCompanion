// src/core/components/__tests__/Markdown.suspense.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { flushLazy } from '@/test-utils/flush-lazy';
import Markdown from '../Markdown';

/**
 * The Suspense contract, in its own file on purpose.
 *
 * `React.lazy` caches its resolved module on the lazy object itself, so only
 * the *first* mount in a jest module registry is ever cold. Asserting the
 * cold behaviour therefore only works as the first render of a file — in
 * `Markdown.test.tsx` it would pass or fail depending on which test ran
 * before it, which is exactly the kind of order-dependent test that gets
 * deleted in frustration a year later.
 *
 * What it protects: `Markdown` renders its wrapper immediately and its prose
 * once the parser chunk arrives. If the fallback were ever left in place
 * permanently — a broken import path, a rejected chunk — every other test in
 * the suite that only asserts *absence* would still pass, and this is the one
 * that would not.
 */
it('renders the wrapper before the parser chunk arrives, and the prose after', async () => {
  const { container } = render(<Markdown content="Deferred prose." />);

  expect(container.firstElementChild).toHaveClass('markdown-body');
  expect(container.querySelector('p')).toBeNull();

  await flushLazy();

  expect(container.querySelector('p')).toHaveTextContent('Deferred prose.');
});
