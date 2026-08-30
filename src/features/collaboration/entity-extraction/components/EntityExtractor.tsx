// src/features/collaboration/entity-extraction/components/EntityExtractor.tsx

import React from "react";
import { PotentialReference } from "../../notes/components/NoteReferences";
import CampaignLinksPanel from "../../notes/components/CampaignLinksPanel";

interface EntityExtractorProps {
  /** ID of the note to extract entities from */
  noteId: string;
  /**
   * @deprecated References are now read from context via `useNoteReferences`
   * inside `CampaignLinksPanel`. Kept only so `NotePage.tsx` (owned by a
   * later track) still type-checks; the value is ignored.
   */
  existingReferences?: PotentialReference[];
  /**
   * @deprecated `CampaignLinksPanel` derives its own loading state. Kept
   * only so `NotePage.tsx` still type-checks; the value is ignored.
   */
  referencesSearchComplete?: boolean;
  /** Callback when an entity is converted */
  onEntityConverted?: (entityId: string, createdId: string) => void;
  /** Function to get current editor content */
  getCurrentEditorContent?: () => { title: string; content: string };
  /** Function to save current editor content */
  saveCurrentEditorContent?: () => Promise<void>;
}

/**
 * Thin backward-compatible wrapper around `CampaignLinksPanel`.
 *
 * The extraction machinery that used to live here (dedup, filtering,
 * save-before-analysis, the usage-limit panel) moved to
 * `CampaignLinksPanel`, which also renders the "in your campaign" group
 * that used to be `NoteReferences`. This wrapper exists only so existing
 * consumers of `EntityExtractor` (and its props, `existingReferences` and
 * `referencesSearchComplete` included) keep working unchanged.
 */
const EntityExtractor: React.FC<EntityExtractorProps> = ({
  noteId,
  onEntityConverted,
  getCurrentEditorContent,
  saveCurrentEditorContent,
}) => {
  return (
    <CampaignLinksPanel
      noteId={noteId}
      getCurrentEditorContent={getCurrentEditorContent}
      saveCurrentEditorContent={saveCurrentEditorContent}
      onEntityConverted={onEntityConverted}
    />
  );
};

export default EntityExtractor;
