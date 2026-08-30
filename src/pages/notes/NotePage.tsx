// src/pages/notes/NotePage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Typography from "../../core/components/Typography";
import Button from "../../core/components/Button";
import Dialog from "core/components/Dialog";
import { useNavigation } from "shared/hooks/useNavigation";
import { useNotes, NoteEditor, NoteEditorRef, CampaignLinksPanel, UsageMeter, Note } from "features/collaboration";
import { useCampaigns } from "features/user-management";
import { ArrowLeft, AlertCircle, ExternalLink } from 'lucide-react';
import DocumentService from "core/services/firebase/data/DocumentService";
import { useAuth, useGroups } from "features/user-management";

/**
 * Page for viewing and editing an individual user note
 * Handles campaign context and cross-campaign note access
 */
const NotePage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const { navigateToPage } = useNavigation();
  const { deleteNote, getNoteById, archiveNote } = useNotes();
  const { activeCampaignId, activeCampaign, campaigns } = useCampaigns();
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [crossCampaignNote, setCrossCampaignNote] = useState<Note | null>(null);
  const [isLoadingCrossCampaignNote, setIsLoadingCrossCampaignNote] = useState(false);
  const [crossCampaignNotFound, setCrossCampaignNotFound] = useState(false);
  const documentService = DocumentService.getInstance();

  // Ref to access NoteEditor methods for auto-save functionality
  const noteEditorRef = useRef<NoteEditorRef>(null);

  // Try to get the note from the current campaign context first
  const currentCampaignNote = noteId ? getNoteById(noteId) : undefined;

  // If note is not found in current campaign, try to fetch it from other campaigns
  useEffect(() => {
    // Only fetch if we have a noteId and meet all the conditions
    const shouldFetchCrossCampaignNote = noteId &&
                                        !currentCampaignNote &&
                                        !crossCampaignNote &&
                                        !crossCampaignNotFound &&
                                        !isLoadingCrossCampaignNote &&
                                        user?.uid &&
                                        activeGroupId &&
                                        activeCampaignId; // Only fetch if we have an active campaign to compare against

    if (shouldFetchCrossCampaignNote) {
      const fetchCrossCampaignNote = async () => {
        setIsLoadingCrossCampaignNote(true);
        try {
          // Try to fetch the note directly from the user's notes collection
          const notesPath = `groups/${activeGroupId}/users/${user.uid}/notes`;
          const note = await documentService.getDocument<Note>(notesPath, noteId);
          
          // Only set as cross-campaign note if it exists AND belongs to a different campaign
          if (note && note.campaignId && note.campaignId !== activeCampaignId) {
            setCrossCampaignNote(note);
          } else if (note && note.campaignId === activeCampaignId) {
            // Note belongs to current campaign but wasn't found in context
            // This could happen due to timing issues - don't treat as cross-campaign
            setCrossCampaignNote(null);
            setCrossCampaignNotFound(true);
          } else {
            // note is null — not found in Firestore. Mark as not found so the
            // effect does not re-trigger on every isLoadingCrossCampaignNote
            // state change (fixes infinite re-fetch loop, bug #800).
            setCrossCampaignNotFound(true);
          }
        } catch (error) {
          console.error("Error fetching cross-campaign note:", error);
          setCrossCampaignNotFound(true);
        } finally {
          setIsLoadingCrossCampaignNote(false);
        }
      };

      fetchCrossCampaignNote();
    }
  }, [noteId, currentCampaignNote, crossCampaignNote, crossCampaignNotFound, isLoadingCrossCampaignNote, user?.uid, activeGroupId, activeCampaignId, documentService]);

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

  if (!noteId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Typography color="error">Invalid note ID</Typography>
      </div>
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
   * Archive this note and navigate back
   */
  const handleArchiveNote = async () => {
    try {
      await archiveNote(noteId);
      navigateToPage("/notes");
    } catch (error) {
      console.error("Failed to archive note:", error);
    }
  };

  /**
   * Deleting a note is irreversible and used to happen on a single click,
   * while leaving a group and deleting an account both ask first.
   */
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteNote(noteId);
      navigateToPage("/notes");
    } catch (error) {
      console.error("Failed to delete note:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Loading state for cross-campaign note
  if (isLoadingCrossCampaignNote && !currentCampaignNote) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-8">
          <Typography color="secondary">Loading note...</Typography>
        </div>
      </div>
    );
  }

  // Note not found state
  if (!noteToDisplay) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
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
          <AlertCircle className="w-12 h-12 mx-auto mb-4 status-failed" />
          <Typography variant="h3" className="mb-2">
            Note Not Found
          </Typography>
          <Typography color="secondary">
            The note you're looking for doesn't exist or you don't have access to it.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 note-page`}>
      {/* Warning banner for cross-campaign notes */}
      {isFromDifferentCampaign && (
        <div className="mb-6 p-4 rounded-lg border-l-4 status-unknown">
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <NoteEditor
          ref={noteEditorRef}
          noteId={noteId}
          readOnly={isFromDifferentCampaign} // Make cross-campaign notes read-only
          onBack={handleBackClick}
          onArchive={handleArchiveNote}
          onDelete={() => setIsDeleteDialogOpen(true)}
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
  );
};

export default NotePage;