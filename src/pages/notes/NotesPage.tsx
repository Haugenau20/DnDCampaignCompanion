// src/pages/notes/NotesPage.tsx
import React from "react";
import Typography from "../../core/components/Typography";
import Button from "../../core/components/Button";
import { NotesList, useNotes, useCreateNote } from "features/collaboration";
import { useCampaigns } from "features/user-management";
import { Plus, AlertCircle } from "lucide-react";

/**
 * Notes index: the page header, then the list itself.
 *
 * `isLoading` is read purely to suppress the "no campaign selected" warning
 * while auth/campaign context is still being restored (bug #1413).
 * NoteContext already folds `useCampaignContextStatus().isResolving` into it,
 * so this needs no additional hook here — which also keeps NotesPage off the
 * `useAuth`/`useGroups` surface its test does not mock.
 */
const NotesPage: React.FC = () => {
  const { isLoading } = useNotes();
  const { activeCampaignId, activeCampaign } = useCampaigns();
  const { createAndOpen } = useCreateNote();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 notes-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Typography variant="h2" className="typography-heading">
            Notes
          </Typography>

          {activeCampaign && (
            <Typography variant="body" color="secondary" className="mt-1">
              Your private notes for {activeCampaign.name}. Only you can read them.
            </Typography>
          )}

          {!isLoading && !activeCampaignId && (
            <div className="flex items-center mt-2 gap-2">
              <AlertCircle className="w-4 h-4 status-unknown" />
              <Typography variant="body-sm" color="secondary">
                No campaign selected - select a campaign to view and create notes
              </Typography>
            </div>
          )}
        </div>

        {activeCampaignId && (
          <Button
            onClick={createAndOpen}
            variant="primary"
            className="create-note-button"
            startIcon={<Plus className="w-5 h-5" />}
          >
            New note
          </Button>
        )}
      </div>

      <NotesList />
    </div>
  );
};

export default NotesPage;
