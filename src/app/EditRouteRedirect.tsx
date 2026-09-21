// src/app/EditRouteRedirect.tsx
import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

export interface EditRouteRedirectProps {
  /** The route parameter carrying the record's id, e.g. `questId`. */
  param: string;
  /** Where that id belongs now. */
  destination: (id: string) => string;
  /** Where to go when the URL carries no id at all. */
  fallback: string;
}

/**
 * An old `/{entity}/edit/:id` URL, sent to the record itself.
 *
 * Phase 15 made every field editable where it is read, so these four routes
 * have nothing left to do. They are **redirected rather than deleted**: the
 * URLs are in browser histories, in bookmarks, and quite possibly written into
 * campaign notes, and a 404 for a record that still exists is a worse answer
 * than any of the reasons the route went away.
 *
 * **It decides nothing except from the URL.** Bug #1423 is this exact class of
 * defect: three edit pages redirected on a bare `if (!user)` inside an effect,
 * and since `user` is null both when nobody is signed in *and* while Firebase
 * Auth rehydrates, a signed-in reader opening one directly was bounced to the
 * list 124-375ms in. Nothing here reads auth, the campaign, or the record --
 * the id is in the path, the destination is a pure function of it, and the
 * redirect is therefore the same whether or not anything has finished
 * restoring. The gate on the destination page does the deciding, once.
 *
 * `replace` on purpose: the retired URL should not sit in history as a place
 * Back can return to.
 */
export const EditRouteRedirect: React.FC<EditRouteRedirectProps> = ({
  param,
  destination,
  fallback,
}) => {
  const id = useParams()[param];
  return <Navigate to={id ? destination(id) : fallback} replace />;
};

export default EditRouteRedirect;
