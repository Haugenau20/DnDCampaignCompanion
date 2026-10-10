// src/shared/utils/rumor-name.ts
import { deriveTitle } from './derived-title';

/**
 * How a rumour is named. It lives in `shared/` rather than with the rumours
 * because `shared/` components list rumours too -- the attach tray -- and are
 * rendered by the rumours' own pages, so importing the feature's barrel from
 * there would be an import cycle. `features/campaign-entities` re-exports it;
 * code outside `shared/` should keep using that.
 */

/** The fields a rumour's name is made from. */
type NamedRumor = { title?: string | null; content?: string | null };

/**
 * What a rumour is called when nobody has named it.
 *
 * The *only* rumour that should ever read "Untitled" — every other row shows
 * either a typed title or the opening of what was heard. Rendered muted by
 * the caller, so an unnamed rumour reads as unfinished rather than as a
 * record called "Untitled rumour".
 */
export const UNTITLED_RUMOR = 'Untitled rumor';

/**
 * The name a rumour shows in the list.
 *
 * A rumour is the one thing in this product written down *while somebody is
 * still talking*, so the composer takes what was heard and nothing else. The
 * title is what you write afterwards, once you know what the thing is —
 * which means most rumours do not have one yet, and the row still has to say
 * something.
 *
 * An explicit title always wins. Otherwise the first line of the content,
 * capped by {@link deriveTitle} at a length a row can actually render — the
 * complaint that started this was a typed title too long to ever be displayed
 * in full. `null` means the rumour has neither, and the caller renders
 * {@link UNTITLED_RUMOR}.
 *
 * Unlike a note, a rumour has no legacy placeholder title to special-case:
 * every rumour written before this change carries a title a human typed.
 */
export const rumorDisplayTitle = (
  rumor: NamedRumor
): string | null => {
  const explicit = (rumor.title ?? '').trim();
  if (explicit) return explicit;

  const derived = deriveTitle(rumor.content ?? '');
  return derived || null;
};

/**
 * The same value with the fallback already applied, for the many callers that
 * only ever want a string to print: aria labels, dialog lists, search results,
 * the activity feed. Surfaces that want to *style* the absence — the row,
 * which greys it — use {@link rumorDisplayTitle} and handle `null` themselves.
 */
export const rumorTitleText = (rumor: NamedRumor): string =>
  rumorDisplayTitle(rumor) ?? UNTITLED_RUMOR;
