// src/pages/notes/NotePage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Typography from "../../core/components/Typography";
import Button from "../../core/components/Button";
import Dialog from "core/components/Dialog";
import { useNavigation } from "shared/hooks/useNavigation";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { useNotes, NoteEditor, NoteEditorRef, CampaignLinksPanel, UsageMeter, Note } from "features/collaboration";
import { useCampaigns } from "features/user-management";
import { ArrowLeft, AlertCircle, ExternalLink } from 'lucide-react';
import DocumentService from "core/services/firebase/data/DocumentService";
import { useAuth, useGroups } from "features/user-management";

/**
 * Page for viewing and editing an individual user note.
 *
 * Uses the `notes` page key, same as `NotesPage` — `notes` now requires a
 * campaign, since `NoteContext` returns nothing without one, so a member with
 * a group but no campaign chosen is sent to the campaign picker rather than
 * reaching this page's own "Note Not Found" copy (which used to be shown, and
 * was untrue: the note wasn't missing, there was simply no campaign to look
 * for it in). `usePageGate`/`GatedContent` own the signed-out and
 * still-resolving states; everything below (invalid id, cross-campaign fetch,
 * not-found) is this note's own business, handled only once the gate says
 * `ready`.
 */
/**
 * The reason a write failed, in words for the page.
 * @param error What the write rejected with
 */
const describeFailure = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : "Something went wrong. Try again.";

const NotePage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const { navigateToPage } = useNavigation();
  const { deleteNote, getNoteById, archiveNote, isLoading } = useNotes();
  const { activeCampaignId, activeCampaign, campaigns } = useCampaigns();
  const { user } = useAuth();
  const { activeGroupId } = useGroups();

  const gate = usePageGate("notes", { loading: isLoading });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  /** Why the last delete failed, shown in its dialog until the next attempt. */
  const [deleteError, setDeleteError] = useState<string | null>(null);
  /** Why the last archive failed, shown above the note until the next attempt. */
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const documentService = DocumentService.getInstance();

  /**
   * Who is asking for which note, under which campaign. The direct read below
   * answers for exactly this, and its answer is used for nothing else: a
   * campaign switch on the same note route used to keep the previous answer,
   * so a stale "Note Not Found", or the copy fetched under another campaign,
   * outlived the question it answered (T085, RECOVERY-002).
   */
  const fallbackScope = noteId && user?.uid && activeGroupId && activeCampaignId
    ? `${activeGroupId}/${user.uid}/${activeCampaignId}/${noteId}`
    : null;
  const [fallback, setFallback] = useState<{
    scope: string;
    status: "loading" | "found" | "missing";
    note: Note | null;
  } | null>(null);
  /** The scope the last direct read was started for. */
  const requestedScopeRef = useRef<string | null>(null);
  const currentFallback = fallback && fallback.scope === fallbackScope ? fallback : null;
  const crossCampaignNote = currentFallback?.note ?? null;
  const isLoadingCrossCampaignNote = currentFallback?.status === "loading";

  // Ref to access NoteEditor methods for auto-save functionality
  const noteEditorRef = useRef<NoteEditorRef>(null);

  // Try to get the note from the current campaign context first
  const currentCampaignNote = noteId ? getNoteById(noteId) : undefined;

  /*
    A note the active campaign's list does not hold may be one of the user's
    notes from another campaign: read it directly, once per scope, and only
    once the list has loaded -- a list still on its way would make every note
    look missing, and that "missing" used to stick.
  */
  useEffect(() => {
    if (!fallbackScope || !noteId || !user?.uid || !activeGroupId || !activeCampaignId) return;
    if (currentCampaignNote || isLoading) return;
    if (requestedScopeRef.current === fallbackScope) return;
    requestedScopeRef.current = fallbackScope;
    setFallback({ scope: fallbackScope, status: "loading", note: null });

    const scope = fallbackScope;
    const commit = (status: "found" | "missing", note: Note | null) => {
      // An answer for a question no longer asked is dropped.
      if (requestedScopeRef.current === scope) setFallback({ scope, status, note });
    };
    documentService
      .getDocument<Note>(`groups/${activeGroupId}/users/${user.uid}/notes`, noteId)
      .then((note) => {
        // Only a note from ANOTHER campaign is shown this way; one that claims
        // the active campaign but is not in its list is not shown at all.
        if (note && note.campaignId && note.campaignId !== activeCampaignId) {
          commit("found", note);
        } else {
          commit("missing", null);
        }
      })
      .catch((error) => {
        console.error("Error fetching cross-campaign note:", error);
        commit("missing", null);
      });
  }, [fallbackScope, noteId, user?.uid, activeGroupId, activeCampaignId, currentCampaignNote, isLoading, documentService]);

  // Functions to expose editor content to CampaignLinksPanel
  const getCurrentEditorContent = () => {
    if (noteEditorRef.current) {
      return noteEditorRef.current.getCurrentContent();
    }
    return { title: "", content: "" };
  };

  const saveCurrentEditorContent = async () => {
    if (noteEditorRef.current) {
      await noteEditorRef.current.saveCurrentContent();
    }
  };

  // An invalid route is its own case, ahead of the note-lookup logic below --
  // narrows `noteId` to `string` for the rest of the component, same as the
  // guard this replaces used to.
  if (!noteId) {
    return (
      <PageShell title="Note">
        <GatedContent gate={gate}>
          <Typography color="error">Invalid note ID</Typography>
        </GatedContent>
      </PageShell>
    );
  }

  // Determine which note to display and if it's truly from a different campaign
  const noteToDisplay = currentCampaignNote || crossCampaignNote;
  const isFromDifferentCampaign = !!crossCampaignNote && 
                                  crossCampaignNote.campaignId !== activeCampaignId &&
                                  !!activeCampaignId; // Only show as different if we have an active campaign to compare

  // Find the campaign this note belongs to (for display purposes)
  const noteCampaign = crossCampaignNote && isFromDifferentCampaign
    ? campaigns.find(c => c.id === crossCampaignNote.campaignId)
    : activeCampaign;

  /**
   * Navigate back to notes list
   */
  const handleBackClick = () => {
    navigateToPage("/notes");
  };

  /**
   * Archive this note and navigate back. A failure stays on the note and says
   * why, rather than only logging it (WRITES-001).
   */
  const handleArchiveNote = async () => {
    setArchiveError(null);
    try {
      await archiveNote(noteId);
      navigateToPage("/notes");
    } catch (error) {
      console.error("Failed to archive note:", error);
      setArchiveError(describeFailure(error));
    }
  };

  const openDeleteDialog = () => {
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Deleting a note is irreversible and used to happen on a single click,
   * while leaving a group and deleting an account both ask first. A failure
   * keeps the dialog open with the reason, so Delete can simply be pressed
   * again (WRITES-001).
   */
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteNote(noteId);
      setIsDeleteDialogOpen(false);
      navigateToPage("/notes");
    } catch (error) {
      console.error("Failed to delete note:", error);
      setDeleteError(describeFailure(error));
    } finally {
      setIsDeleting(false);
    }
  };

  // A generic fallback carries the h1 through the states where no note has
  // loaded yet (invalid id, still fetching, not found) -- PageShell renders
  // a title in every state, this one just isn't always a note's own.
  const pageTitle = noteToDisplay?.title || "Note";

  return (
    <PageShell title={pageTitle}>
      <GatedContent gate={gate}>
        {isLoadingCrossCampaignNote && !currentCampaignNote ? (
          <div className="flex items-center justify-center py-8">
            <Typography color="secondary">Loading note...</Typography>
          </div>
        ) : !noteToDisplay ? (
          <>
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={handleBackClick}
                className={`back-button`}
                startIcon={<ArrowLeft className="w-5 h-5" />}
              >
                Back to Notes
              </Button>
            </div>

            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 feedback-error" />
              <Typography variant="h3" className="mb-2">
                Note Not Found
              </Typography>
              <Typography color="secondary">
                The note you're looking for doesn't exist or you don't have access to it.
              </Typography>
            </div>
          </>
        ) : (
          <div className="note-page">
            {/* Warning banner for cross-campaign notes */}
            {isFromDifferentCampaign && (
              <div className="mb-6 p-4 rounded-lg border-l-4 feedback-banner feedback-banner-warning">
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <Typography variant="body" className="font-medium mb-1">
                      Note from Different Campaign
                    </Typography>
                    <Typography variant="body-sm" color="secondary">
                      This note belongs to <span className="font-medium">{noteCampaign?.name || 'Unknown Campaign'}</span>,
                      not your currently active campaign ({activeCampaign?.name}).
                      You can view it but some features like entity extraction may not work as expected.
                    </Typography>
                  </div>
                </div>
              </div>
            )}

            {archiveError && (
              <Typography variant="body-sm" color="error" role="alert" className="mb-4">
                Couldn't archive this note: {archiveError}
              </Typography>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
              <NoteEditor
                // A note that turns read-only under a campaign switch gets a
                // fresh editor: the editable one leaves, which saves what was
                // typed in it (T085). The same editor would have kept the text
                // and, now read-only, never written it.
                key={isFromDifferentCampaign ? "read-only" : "editable"}
                ref={noteEditorRef}
                noteId={noteId}
                // The active campaign's notes cannot supply this one, so the
                // editor is handed the copy fetched above (FUNC-001).
                note={isFromDifferentCampaign ? crossCampaignNote ?? undefined : undefined}
                readOnly={isFromDifferentCampaign} // Make cross-campaign notes read-only
                onBack={handleBackClick}
                onArchive={handleArchiveNote}
                onDelete={openDeleteDialog}
              />

              <div className="space-y-4">
                {/* Only show campaign links for notes in the active campaign */}
                {!isFromDifferentCampaign && (
                  <CampaignLinksPanel
                    noteId={noteId}
                    getCurrentEditorContent={getCurrentEditorContent}
                    saveCurrentEditorContent={saveCurrentEditorContent}
                  />
                )}
                <UsageMeter />
              </div>
            </div>

            <Dialog
              open={isDeleteDialogOpen}
              onClose={() => setIsDeleteDialogOpen(false)}
              title="Delete this note?"
            >
              <Typography color="secondary" className="mb-4">
                This permanently removes the note and everything in it. This cannot be undone.
              </Typography>
              {deleteError && (
                <Typography variant="body-sm" color="error" role="alert" className="mb-4">
                  Couldn't delete this note: {deleteError}
                </Typography>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleConfirmDelete} disabled={isDeleting}>
                  Delete note
                </Button>
              </div>
            </Dialog>
          </div>
        )}
      </GatedContent>
    </PageShell>
  );
};

export default NotePage;