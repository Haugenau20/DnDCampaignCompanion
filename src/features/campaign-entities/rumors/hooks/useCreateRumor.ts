// src/features/campaign-entities/rumors/hooks/useCreateRumor.ts
import { useCallback } from 'react';
import { useNavigation } from 'shared/hooks/useNavigation';
import { useRumors } from '../context/RumorContext';

/**
 * Creates an empty rumour and opens its row in the list.
 *
 * **The rumour is the one entity with no page** (§2.1), which is exactly why
 * the global create menu could not keep sending people to `/rumors/create`.
 * Every other entity's quick add either opens a dialog or lands on the
 * record's own address; a rumour has neither, so the honest equivalent is to
 * write the record and land on the row that holds it.
 *
 * Nothing is filled in. A rumour created this way has no title, no content
 * and no source, so the list shows it as "Untitled rumour" and the row opens
 * with the caret waiting -- there is no placeholder title like "New rumour",
 * because a stored placeholder is indistinguishable from one somebody typed,
 * which is the mistake `LEGACY_DEFAULT_TITLE` is still cleaning up after on
 * the notes side.
 *
 * Arrival is via `?highlight=<id>`, the same query the directory already
 * honours for a pasted link and for the retired `/rumors/edit/:id` redirect.
 * That means one mechanism opens the row, not two.
 *
 * Failure is logged rather than thrown, as `useCreateNote` does: the call
 * site is a menu item with no error surface of its own, and navigating to a
 * highlight for a rumour that was never written would be worse than doing
 * nothing.
 */
export function useCreateRumor(): { createAndOpen: () => Promise<void> } {
  const { addRumor } = useRumors();
  const { navigateToPage, createPath } = useNavigation();

  const createAndOpen = useCallback(async () => {
    try {
      const id = await addRumor({
        title: '',
        content: '',
        status: 'unconfirmed',
        // Absent, not 'other': nobody has been asked where this came from.
        sourceName: '',
        relatedNPCs: [],
        relatedLocations: [],
        notes: [],
      });
      navigateToPage(createPath('/rumors', {}, { highlight: id }));
    } catch (error) {
      console.error('Failed to create rumor:', error);
    }
  }, [addRumor, navigateToPage, createPath]);

  return { createAndOpen };
}

export default useCreateRumor;
