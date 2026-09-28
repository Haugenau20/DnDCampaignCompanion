// src/app/RouteFallback.tsx
import React from "react";

/**
 * What the main column shows while a route's chunk is on its way.
 *
 * Only a cold load of a deep link ever sees it. Moving between pages does
 * not: the router runs navigation as a transition (`v7_startTransition` in
 * `index.tsx`), and React keeps the page you are on until the next one can
 * render, rather than swapping it for this and back -- the flash-to-skeleton
 * that `15-7` found and removed from every write.
 *
 * It draws the same bars as the page gate's skeleton, in `PageShell`'s frame,
 * because that is what the page itself shows next while the session restores;
 * the hand-over is then bars to bars rather than blank to bars.
 */
const RouteFallback: React.FC = () => (
  <div
    className="max-w-7xl mx-auto px-4 py-8"
    role="status"
    aria-busy="true"
    data-testid="route-fallback"
  >
    <span className="sr-only">Loading</span>
    <div className="space-y-4" aria-hidden="true">
      <div className="h-10 w-1/3 rounded animate-pulse bg-secondary" />
      <div className="h-24 rounded animate-pulse bg-secondary" />
      <div className="h-24 rounded animate-pulse bg-secondary" />
    </div>
  </div>
);

export default RouteFallback;
