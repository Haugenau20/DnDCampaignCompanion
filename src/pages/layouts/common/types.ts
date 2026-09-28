// src/pages/layouts/common/types.ts

/**
 * One row of the dashboard's activity feed, built from any content type.
 *
 * Lives here rather than in `HomePage.tsx`, which builds it, because the
 * layout sections that render it are imported *by* `HomePage`: declaring it
 * there made every consumer an import back into the page, a cycle `lint`'s
 * `import/no-cycle` now refuses. `HomePage` re-exports it.
 */
export interface Activity {
  id: string;
  type: 'chapter' | 'npc' | 'quest' | 'rumor' | 'location';
  title: string;
  description?: string;
  actor: string;
  timestamp: Date;
  link: string;
}
