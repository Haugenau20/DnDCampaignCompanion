// src/features/campaign-entities/rumors/components/RumorBatchActions.tsx
import React, { useState } from 'react';
import Button from '../../../../core/components/Button';
import { RosterBatchBar } from 'core/components/Roster';
import { RumorStatus } from '../types';
import { useRumors } from '../context/RumorContext';
import DeleteConfirmationDialog from 'shared/components/DeleteConfirmationDialog';
import { useNavigation } from 'shared/hooks/useNavigation';
import { 
  CheckCircle, 
  HelpCircle, 
  XCircle, 
  Layers, 
  MessageSquare, 
  Trash
} from 'lucide-react';
import CombineRumorsDialog from './CombineRumorsDialog';
import ConvertToQuestDialog from './ConvertToQuestDialog';

interface RumorBatchActionsProps {
  selectedRumors: Set<string>;
  onComplete?: () => void;
}

/**
 * Component that displays and handles batch actions for rumors.
 * Appears when selection mode is active and rumors are selected.
 */
const RumorBatchActions: React.FC<RumorBatchActionsProps> = ({
  selectedRumors,
  onComplete
}) => {
  const { rumors, updateRumorsStatus, deleteRumors, combineRumors, convertToQuest } = useRumors();
  const { navigateToPage } = useNavigation();
  
  // Dialog state
  const [showCombineDialog, setShowCombineDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Selected rumors
  const selectedRumorIds = Array.from(selectedRumors);
  const selectedRumorObjects = rumors.filter(rumor => selectedRumors.has(rumor.id));

  // Batch status update
  const handleBatchStatusUpdate = async (status: RumorStatus) => {
    try {
      setIsProcessing(true);
      setActionError(null);
      
      // One write for the whole selection (T032, PERF-06).
      await updateRumorsStatus(selectedRumorIds, status);
      
      onComplete?.();
    } catch (err) {
      setActionError(`Failed to update rumour status: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Failed to update rumour status:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch delete
  const handleBatchDelete = async () => {
    setShowDeleteConfirmation(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      setIsProcessing(true);
      setActionError(null);
      
      // One write for the whole selection (T032, PERF-06).
      await deleteRumors(selectedRumorIds);
      
      setShowDeleteConfirmation(false);
      onComplete?.();
    } catch (err) {
      setActionError(`Failed to delete rumours: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Failed to delete rumours:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle combine rumors
  const handleCombineSubmit = async (rumorIds: string[], newRumor: any) => {
    try {
      setIsProcessing(true);
      setActionError(null);
      
      const newRumorId = await combineRumors(rumorIds, newRumor);
      setShowCombineDialog(false);
      onComplete?.();
      return newRumorId;
    } catch (err) {
      setActionError(`Failed to combine rumours: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Failed to combine rumours:', err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle convert to quest
  const handleConvertSubmit = async (rumorIds: string[], questData: any) => {
    try {
      setIsProcessing(true);
      setActionError(null);
      
      const questId = await convertToQuest(rumorIds, questData);
      setShowConvertDialog(false);
      onComplete?.();
      // The quest that was just authored, at its own address (`15-5` item 11).
      // Conversion used to leave you in the rumour list with the new quest
      // nowhere on screen -- the record existed and nothing linked to it.
      navigateToPage(`/quests/${questId}`);
      return questId;
    } catch (err) {
      setActionError(`Failed to convert rumours to quest: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Failed to convert rumours to quest:', err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedRumors.size === 0) {
    return null;
  }

  // Create portal elements for dialogs to render them at the root level
  const portalElements = (
    <>
      {/* Render dialogs in portal to make them appear above everything */}
        <>
          <CombineRumorsDialog
            open={showCombineDialog}
            onClose={() => setShowCombineDialog(false)}
            rumorIds={selectedRumorIds}
            rumors={selectedRumorObjects}
            onCombine={handleCombineSubmit}
          />
          
          <ConvertToQuestDialog
            open={showConvertDialog}
            onClose={() => setShowConvertDialog(false)}
            rumorIds={selectedRumorIds}
            rumors={selectedRumorObjects}
            onConvert={handleConvertSubmit}
          />
          
          <DeleteConfirmationDialog
            isOpen={showDeleteConfirmation}
            onClose={() => setShowDeleteConfirmation(false)}
            onConfirm={confirmDelete}
            itemName={`${selectedRumors.size} rumours`}
            itemType="Rumour"
            message={`Are you sure you want to delete ${selectedRumors.size} rumours? This cannot be undone.`}
          />
        </>
    </>
  );

  return (
    <>
      <RosterBatchBar label={`${selectedRumors.size} rumours selected`} error={actionError}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleBatchStatusUpdate('confirmed')}
          startIcon={<CheckCircle size={16} className="feedback-success" />}
          disabled={isProcessing}
        >
          Mark Confirmed
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleBatchStatusUpdate('unconfirmed')}
          startIcon={<HelpCircle size={16} className="feedback-warning" />}
          disabled={isProcessing}
        >
          Mark Unconfirmed
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleBatchStatusUpdate('false')}
          startIcon={<XCircle size={16} className="feedback-error" />}
          disabled={isProcessing}
        >
          Mark False
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCombineDialog(true)}
          startIcon={<Layers size={16} />}
          disabled={selectedRumors.size < 2 || isProcessing}
        >
          Combine
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConvertDialog(true)}
          startIcon={<MessageSquare size={16} />}
          disabled={isProcessing}
        >
          Convert to Quest
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBatchDelete}
          startIcon={<Trash size={16} className="feedback-error" />}
          disabled={isProcessing}
        >
          Delete
        </Button>
      </RosterBatchBar>

      {/* Render portals for dialogs */}
      {portalElements}
    </>
  );
};

export default RumorBatchActions;