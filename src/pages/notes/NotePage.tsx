// src/pages/notes/NotePage.tsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Typography from "../../components/core/Typography";
import Button from "../../components/core/Button";
import NoteEditor from "../../components/features/notes/NoteEditor";
import EntityExtractor from "../../components/features/notes/EntityExtractor";
import NoteReferences from "../../components/features/notes/NoteReferences";
import FloatingUsageIndicator from "../../components/features/notes/FloatingUsageIndicator";
import { useNavigation } from "../../hooks/useNavigation";
import { useNotes } from "../../context/NoteContext";
import { useCampaigns } from "../../context/firebase";
import { ArrowLeft, Trash2, AlertCircle, ExternalLink } from 'lucide-react';
import { PotentialReference } from "../../components/features/notes/NoteReferences";
import { Note } from "../../types/note";
import DocumentService from "../../services/firebase/data/DocumentService";
import { useAuth, useGroups } from "../../context/firebase";

/**
 * Page for viewing and editing an individual user note
 * Handles campaign context and cross-campaign note access
 * Now includes floating usage indicator for Smart Detection
 */
const NotePage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const { navigateToPage } = useNavigation();
  const { deleteNote, getNoteById } = useNotes();
  const { activeCampaignId, activeCampaign, campaigns } = useCampaigns();
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const [referenceUpdateTrigger, setReferenceUpdateTrigger] = useState(0);
  const [foundReferences, setFoundReferences] = useState<PotentialReference[]>([]);
  const [referencesSearchComplete, setReferencesSearchComplete] = useState(false);
  const [crossCampaignNote, setCrossCampaignNote] = useState<Note | null>(null);
  const [isLoadingCrossCampaignNote, setIsLoadingCrossCampaignNote] = useState(false);
  const documentService = DocumentService.getInstance();

  // Try to get the note from the current campaign context first
  const currentCampaignNote = noteId ? getNoteById(noteId) : undefined;

  // If note is not found in current campaign, try to fetch it from other campaigns
  useEffect(() => {
    // Only fetch if we have a noteId and meet all the conditions
    const shouldFetchCrossCampaignNote = noteId &&
                                        !currentCampaignNote && 
                                        !crossCampaignNote && 
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
          }
        } catch (error) {
          console.error("Error fetching cross-campaign note:", error);
        } finally {
          setIsLoadingCrossCampaignNote(false);
        }
      };

      fetchCrossCampaignNote();
    }
  }, [noteId, currentCampaignNote, crossCampaignNote, isLoadingCrossCampaignNote, user?.uid, activeGroupId, activeCampaignId, documentService]);

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
   * Delete this note and navigate back
   */
  const handleDeleteNote = async () => {
    try {
      await deleteNote(noteId);
      navigateToPage("/notes");
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };
  
  /**
   * Trigger a refresh of note references
   */
  const refreshReferences = () => {
    setReferenceUpdateTrigger(prev => prev + 1);
    setReferencesSearchComplete(false); // Reset search state when refreshing
  };

  /**
   * Handle references found by NoteReferences component
   */
  const handleReferencesFound = (references: PotentialReference[]) => {
    setFoundReferences(references);
  };

  /**
   * Handle when reference search is complete
   */
  const handleSearchComplete = () => {
    setReferencesSearchComplete(true);
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
      <div className="mb-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className={`back-button`}
          startIcon={<ArrowLeft className="w-5 h-5" />}
        >
          Back to Notes
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleDeleteNote}
          className={`delete-button`}
          startIcon={<Trash2 className="w-5 h-5" />}
          disabled={isFromDifferentCampaign} // Disable delete for cross-campaign notes to prevent confusion
        >
          Delete
        </Button>
      </div>

      {/* Warning banner for cross-campaign notes */}
      {isFromDifferentCampaign && (
        <div className="mb-6 p-4 rounded-lg border-l-4 status-warning">
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

      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-6 col-span-2">
          <NoteEditor 
            noteId={noteId}
            onSave={refreshReferences}
            readOnly={isFromDifferentCampaign} // Make cross-campaign notes read-only
          />
        </div>
        <div className="space-y-6">
          {/* Only show entity extraction for notes in the active campaign */}
          {!isFromDifferentCampaign && (
            <EntityExtractor 
              noteId={noteId}
              existingReferences={foundReferences}
              referencesSearchComplete={referencesSearchComplete}
              onEntityConverted={refreshReferences}
            />
          )}
          <NoteReferences 
            noteId={noteId} 
            key={referenceUpdateTrigger}
            onReferencesFound={handleReferencesFound}
            onSearchComplete={handleSearchComplete}
          />
        </div>
      </div>

      {/* Floating usage indicator - only shows on note pages */}
      <FloatingUsageIndicator />
    </div>
  );
};

export default NotePage;