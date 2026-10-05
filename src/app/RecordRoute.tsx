// src/app/RecordRoute.tsx
import React from 'react';
import { useParams } from 'react-router-dom';

export interface RecordRouteProps {
  /** The route parameter naming the record, e.g. `npcId`. */
  param: string;
  children: React.ReactNode;
}

/**
 * Gives each record its own page instance.
 *
 * React Router keeps a route's element mounted when only its parameter
 * changes, so going from one NPC to another through a related-person link,
 * Search or Back reused the page -- and every open editor on it. The draft
 * typed for the first record stayed in the field and was saved onto the
 * second (REACT-001); a note's queued save ran against the next note
 * (RECOVERY-001). Keying the page by the id makes "a different record" mean
 * "a different page": nothing typed for one record can reach another.
 *
 * What is typed and unsaved goes with the old page, as it does when leaving
 * for any other page: a note editor saves it on the way out (T085), and a
 * queued note save finishes against its own note (RECOVERY-001, pinned in
 * `NoteEditor.test.tsx`). A query string such as `?highlight=` changes
 * nothing here, because the record is the same.
 */
export const RecordRoute: React.FC<RecordRouteProps> = ({ param, children }) => {
  const id = useParams()[param];
  return <React.Fragment key={id}>{children}</React.Fragment>;
};

export default RecordRoute;
