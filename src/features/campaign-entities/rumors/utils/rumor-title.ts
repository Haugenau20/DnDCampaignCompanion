// src/features/campaign-entities/rumors/utils/rumor-title.ts
import type { Rumor } from '../types';

// The naming rule moved to `shared/` so the attach tray can use it without an
// import cycle; it is re-exported here so the rumours keep one place to look.
export { UNTITLED_RUMOR, rumorDisplayTitle, rumorTitleText } from 'shared/utils/rumor-name';

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
