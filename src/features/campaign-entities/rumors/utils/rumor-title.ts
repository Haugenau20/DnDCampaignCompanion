// src/features/campaign-entities/rumors/utils/rumor-title.ts
import { deriveTitle } from 'shared/utils/derived-title';
import type { Rumor } from '../types';

/**
 * What a rumour is called when nobody has named it.
 *
 * The *only* rumour that should ever read "Untitled" — every other row shows
 * either a typed title or the opening of what was heard. Rendered muted by
 * the caller, so an unnamed rumour reads as unfinished rather than as a
 * record called "Untitled rumour".
 */
export const UNTITLED_RUMOR = 'Untitled rumour';

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
  rumor: Pick<Rumor, 'title' | 'content'>
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
export const rumorTitleText = (rumor: Pick<Rumor, 'title' | 'content'>): string =>
  rumorDisplayTitle(rumor) ?? UNTITLED_RUMOR;

/**
 * A rumour written out as one paragraph, for the dialogs that merge several
 * of them into a single body of text.
 *
 * **Prints the name only when somebody typed one.** The obvious version —
 * `` `${rumor.title}: ${rumor.content}` `` — is what these call sites used to
 * do, and it now yields "Traders say the road is busy: Traders say the road is
 * busy" for every rumour created since the composer stopped asking for a
 * title, because the name of an unnamed rumour *is* the opening of its
 * content.
 *
 * @param attributed Include "from <source>", for the combine dialog's list
 */
export const rumorParagraph = (
  rumor: Pick<Rumor, 'title' | 'content' | 'sourceName'>,
  { attributed = false }: { attributed?: boolean } = {}
): string => {
  const explicit = (rumor.title ?? '').trim();
  const body = (rumor.content ?? '').trim();
  const source = attributed ? (rumor.sourceName ?? '').trim() : '';

  if (explicit && source) return `${explicit} (from ${source}): ${body}`;
  if (explicit) return `${explicit}: ${body}`;
  if (source) return `From ${source}: ${body}`;
  return body;
};
