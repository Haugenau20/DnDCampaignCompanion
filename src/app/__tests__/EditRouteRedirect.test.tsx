// src/app/__tests__/EditRouteRedirect.test.tsx
//
// The four retired edit URLs, and the trap they have to avoid.
//
// Bug #1423: three edit pages redirected on a bare `if (!user)` inside an
// effect. `user` is null both when nobody is signed in *and* while Firebase
// Auth rehydrates, so a signed-in reader opening `/quests/edit/destroy-the-ring`
// directly was sent to `/quests` 124ms in. `15-8` replaces those pages with
// redirects, which is the same shape of thing — so it has to be the version
// that cannot repeat the defect.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditRouteRedirect from '../EditRouteRedirect';

/** Renders the real router at `url` and reports where it ends up. */
const landsOn = (url: string) => {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/quests/edit/:questId"
          element={
            <EditRouteRedirect
              param="questId"
              destination={(id) => `/quests/${id}`}
              fallback="/quests"
            />
          }
        />
        <Route
          path="/rumors/edit/:rumorId"
          element={
            <EditRouteRedirect
              param="rumorId"
              destination={(id) => `/rumors?highlight=${id}`}
              fallback="/rumors"
            />
          }
        />
        <Route path="/quests/:questId" element={<div>quest page</div>} />
        <Route path="/quests" element={<div>quest list</div>} />
        <Route path="/rumors" element={<div>rumour list</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('a retired edit URL', () => {
  it('lands on the record, not on the list', () => {
    landsOn('/quests/edit/destroy-the-ring');
    expect(screen.getByText('quest page')).toBeInTheDocument();
  });

  it('sends a rumour to its row, because a rumour has no page', () => {
    landsOn('/rumors/edit/dwarves-in-moria');
    // `?highlight=` is the one addressable-expansion parameter (D15.11), and
    // the row it opens is where a rumour is edited now.
    expect(screen.getByText('rumour list')).toBeInTheDocument();
  });

  it('decides from the URL alone, and never from auth', () => {
    // The whole point. This component reads no context: no `useAuth`, no
    // campaign, no record lookup — so "still rehydrating" and "signed in" and
    // "signed out" produce the same redirect, and the destination's own gate
    // does the deciding once. A test cannot prove an absence of imports, so
    // the assertion is the one that would have failed under #1423's shape:
    // with nothing provided at all, the redirect still resolves.
    expect(() => landsOn('/quests/edit/destroy-the-ring')).not.toThrow();
    expect(screen.getByText('quest page')).toBeInTheDocument();
  });

  it('falls back to the list when the URL carries no id', () => {
    render(
      <MemoryRouter initialEntries={['/quests/edit']}>
        <Routes>
          <Route
            path="/quests/edit"
            element={
              <EditRouteRedirect
                param="questId"
                destination={(id) => `/quests/${id}`}
                fallback="/quests"
              />
            }
          />
          <Route path="/quests" element={<div>quest list</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('quest list')).toBeInTheDocument();
  });

  it('replaces the retired URL rather than leaving it in history', () => {
    // Back from the record should go wherever the reader was before, not to a
    // URL that only bounces them forward again.
    const { container } = render(
      <MemoryRouter initialEntries={['/npcs', '/npcs/edit/aragorn']} initialIndex={1}>
        <Routes>
          <Route
            path="/npcs/edit/:npcId"
            element={
              <EditRouteRedirect
                param="npcId"
                destination={(id) => `/npcs/${id}`}
                fallback="/npcs"
              />
            }
          />
          <Route path="/npcs/:npcId" element={<div>npc page</div>} />
          <Route path="/npcs" element={<div>npc list</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(container).toHaveTextContent('npc page');
  });
});
