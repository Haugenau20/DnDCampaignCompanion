// src/pages/notes/NotesPage.tsx
import React from "react";
import Button from "core/components/Button";
import { NotesList, useNotes, useCreateNote } from "features/collaboration";
import { useCampaigns } from "features/user-management";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { Plus } from "lucide-react";

/**
 * Notes index.
 *
 * Uses the `notes` page key, whose `requires` is `"group"` — `NoteContext`
 * fetches on `activeGroupId` and applies `activeCampaignId` as a filter, so a
 * member with a group but no campaign chosen has notes to read and must not be
 * sent to the campaign picker.
 *
 * Creating one still needs a campaign, which is why the action is additionally
 * gated on `activeCampaignId`.
 */
const NotesPage: React.FC = () => {
  const { isLoading } = useNotes();
  const { activeCampaignId, activeCampaign } = useCampaigns();
  const { createAndOpen } = useCreateNote();

  const gate = usePageGate("notes", { loading: isLoading });

  return (
    <PageShell
      className="notes-page"
      title="Notes"
      subtitle={
        activeCampaign
          ? `Your private notes for ${activeCampaign.name}. Only you can read them.`
          : "Your private notes. Only you can read them."
      }
      actions={
        gate.canAct &&
        activeCampaignId && (
          <Button
            onClick={createAndOpen}
            variant="primary"
            className="create-note-button"
            startIcon={<Plus className="w-5 h-5" />}
          >
            New note
          </Button>
        )
      }
    >
      <GatedContent gate={gate}>
        <NotesList />
      </GatedContent>
    </PageShell>
  );
};

export default NotesPage;
