// src/components/features/rumors/RumorBatchActions.tsx
import React, { useState } from 'react';
import Button from '../../core/Button';
import Typography from '../../core/Typography';
import { RumorStatus } from '../../../types/rumor';
import { useRumors } from '../../../context/RumorContext';
import { useTheme } from '../../../context/ThemeContext';
import DeleteConfirmationDialog from '../../shared/DeleteConfirmationDialog';
import clsx from 'clsx';
import { 
  CheckCircle, 
  HelpCircle, 
  XCircle, 
  Layers, 
  MessageSquare, 
  Trash,
  AlertCircle
} from 'lucide-react';
import CombineRumorsDialog from './CombineRumorsDialog';
import ConvertToQuestDialog from './ConvertToQuestDialog';
import Dialog from '../../core/Dialog';
import ReactDOM from 'react-dom';

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
  const { rumors, updateRumorStatus, deleteRumor, combineRumors, convertToQuest } = useRumors();
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
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
      
      for (const rumorId of selectedRumors) {
        await updateRumorStatus(rumorId, status);
      }
      
      onComplete?.();
    } catch (err) {
      setActionError(`Failed to update rumor status: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Failed to update rumor status:', err);
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
      
      for (const rumorId of selectedRumors) {
        await deleteRumor(rumorId);
      }
      
      setShowDeleteConfirmation(false);
      onComplete?.();
    } catch (err) {
      setActionError(`Failed to delete rumors: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Failed to delete rumors:', err);
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
      setActionError(`Failed to combine rumors: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Failed to combine rumors:', err);
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
      return questId;
    } catch (err) {
      setActionError(`Failed to convert rumors to quest: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Failed to convert rumors to quest:', err);
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
      {ReactDOM.createPortal(
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
            itemName={`${selectedRumors.size} rumors`}
            itemType="Rumor"
            message={`Are you sure you want to delete ${selectedRumors.size} rumors? This cannot be undone.`}
          />
        </>,
        document.body
      )}
    </>
  );

  return (
    <>
      <div className={clsx("flex flex-wrap items-center gap-3 p-3 rounded-lg", `${themePrefix}-bg-secondary`)}>
        <Typography variant="body-sm" className="font-medium">
          {selectedRumors.size} rumors selected
        </Typography>
        
        <div className="flex flex-wrap gap-2 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBatchStatusUpdate('confirmed')}
            startIcon={<CheckCircle size={16} className={`${themePrefix}-rumor-status-confirmed`} />}
            disabled={isProcessing}
          >
            Mark Confirmed
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBatchStatusUpdate('unconfirmed')}
            startIcon={<HelpCircle size={16} className={`${themePrefix}-rumor-status-unconfirmed`} />}
            disabled={isProcessing}
          >
            Mark Unconfirmed
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBatchStatusUpdate('false')}
            startIcon={<XCircle size={16} className={`${themePrefix}-rumor-status-false`} />}
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
            startIcon={<Trash size={16} className={`${themePrefix}-rumor-status-false`} />}
            disabled={isProcessing}
          >
            Delete
          </Button>
        </div>
      </div>
      
      {/* Error notification */}
      {actionError && (
        <div className={clsx("mt-2 p-2 rounded flex items-center gap-2", `${themePrefix}-status-failed bg-opacity-20`)}>
          <AlertCircle size={18} className={`${themePrefix}-status-failed`} />
          <Typography color="error">{actionError}</Typography>
        </div>
      )}

      {/* Render portals for dialogs */}
      {portalElements}
    </>
  );
};

export default RumorBatchActions;