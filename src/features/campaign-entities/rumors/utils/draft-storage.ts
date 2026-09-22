// src/features/campaign-entities/rumors/utils/draft-storage.ts
import type { RumorDraft } from '../components/RumorRowEditor';

/**
 * Typed text that outlives the rumours list, but nothing else.
 *
 * A draft already survives filtering, sorting and another player's write,
 * because `15-7` item 8 put it in the directory rather than in the row. What
 * it could not survive was a **route change**: navigating to `/npcs` unmounts
 * the directory and the half-written sentence goes with it.
 *
 * **Deliberately not an autosave.** Nothing here reaches Firestore. A rumour
 * is shared with the whole campaign, so saving on a timer would broadcast
 * half-written text to everyone at the table and race other players' writes
 * for the privilege -- which is the difference between this and `NoteEditor`,
 * whose notes are private to one person. The only writes to the database
 * remain the explicit Save and the controls that were always immediate.
 *
 * **`sessionStorage`, not `localStorage`**, and for the same reason the
 * marker on the row has to be loud: a draft that quietly outlives a browser
 * restart, visible only if you happen to open this page again, is a worse
 * trap than losing it was. Session-scoped matches how the text is used --
 * you are coming back in a minute, not next week.
 */
const PREFIX = 'dnd:rumor-drafts:';

/** Keyed per campaign, so switching campaign cannot cross-contaminate. */
const keyFor = (campaignId: string) => `${PREFIX}${campaignId}`;

/**
 * Every access is wrapped: `sessionStorage` throws in a private window, with
 * site data blocked, and in some embedded webviews. A draft that cannot be
 * kept is the behaviour this feature had before it existed, so failing to
 * read or write one must never break the list.
 */
export const readDrafts = (campaignId?: string | null): Record<string, RumorDraft> => {
  if (!campaignId) return {};
  try {
    const raw = window.sessionStorage.getItem(keyFor(campaignId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Anything else in this key is not ours, whatever put it there.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const writeDrafts = (
  campaignId: string | null | undefined,
  drafts: Record<string, RumorDraft>
): void => {
  if (!campaignId) return;
  try {
    if (Object.keys(drafts).length === 0) {
      window.sessionStorage.removeItem(keyFor(campaignId));
      return;
    }
    window.sessionStorage.setItem(keyFor(campaignId), JSON.stringify(drafts));
  } catch {
    // Out of quota, or storage refused. The draft still lives in React state
    // for as long as the list is mounted, which is where it lived before.
  }
};
