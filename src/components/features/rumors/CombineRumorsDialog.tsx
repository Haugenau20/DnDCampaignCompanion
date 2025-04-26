// src/components/features/rumors/CombineRumorsDialog.tsx
import React, { useState, useEffect } from 'react';
import { Rumor, RumorStatus } from '../../../types/rumor';
import Dialog from '../../core/Dialog';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Input from '../../core/Input';
import { X, Layers, AlertCircle } from 'lucide-react';

interface CombineRumorsDialogProps {
  open: boolean;
  onClose: () => void;
  rumorIds: string[];
  rumors: Rumor[];
  onCombine: (rumorIds: string[], newRumor: Partial<Rumor>) => Promise<string>;
}

/**
 * Dialog for combining multiple rumors into a single new rumor
 */
const CombineRumorsDialog: React.FC<CombineRumorsDialogProps> = ({
  open,
  onClose,
  rumorIds,
  rumors,
  onCombine
}) => {

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<RumorStatus>('unconfirmed');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRumorIds, setSelectedRumorIds] = useState<string[]>([]);

  // Generate ID from title - matches the logic in RumorContext
  const generateRumorId = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
  };

  // Pre-populate the form based on the selected rumors
  useEffect(() => {
    if (open && rumorIds.length > 0) {
      setSelectedRumorIds(rumorIds);
      
      // Generate a default title based on the date
      const now = new Date().toLocaleDateString();
      setTitle(`Combined Rumor (${now})`);
      
      // Combine content from all selected rumors
      const rumorsToMerge = rumorIds
        .map(id => rumors.find(r => r.id === id))
        .filter(Boolean) as Rumor[];
      
      const combinedContent = rumorsToMerge.map(rumor => 
        `${rumor.title} (from ${rumor.sourceName}): ${rumor.content}`
      ).join('\n\n');
      
      setContent(combinedContent);
    }
  }, [open, rumorIds, rumors]);

  // Remove a rumor from the selection
  const handleRemoveRumor = (rumorId: string) => {
    setSelectedRumorIds(prev => prev.filter(id => id !== rumorId));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (selectedRumorIds.length < 2) {
      setError('Please select at least 2 rumors to combine');
      return;
    }

    if (!title || !content) {
      setError('Title and content are required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Preview the ID that will be generated
      const id = generateRumorId(title);
      
      console.log(`Generated ID for combined rumor: ${id}`);
      
      await onCombine(selectedRumorIds, {
        title,
        content,
        status
      });
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to combine rumors');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get selected rumors objects
  const selectedRumors = selectedRumorIds
    .map(id => rumors.find(r => r.id === id))
    .filter(Boolean) as Rumor[];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Combine Rumors"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Selected Rumors */}
        <div>
          <Typography variant="h4" className="mb-3">
            Selected Rumors
          </Typography>
          {selectedRumors.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-lg card-content">
              {selectedRumors.map(rumor => (
                <div
                  key={rumor.id}
                  className="flex items-center justify-between p-2 rounded-lg selectable-item"
                >
                  <div className="flex-1">
                    <Typography variant="body-sm" className="font-medium">
                      {rumor.title}
                    </Typography>
                    <Typography variant="body-sm" color="secondary">
                      Source: {rumor.sourceName}
                    </Typography>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRumor(rumor.id)}
                    disabled={isSubmitting || selectedRumorIds.length <= 2}
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Typography color="secondary">
              No rumors selected. Please select at least 2 rumors to combine.
            </Typography>
          )}
        </div>

        {/* Combined Rumor Form */}
        <div className="space-y-4">
          <Typography variant="h4">
            Combined Rumor
          </Typography>

          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isSubmitting}
          />

          <Typography variant="body-sm" color="secondary" className="text-sm">
            ID will be: {title ? generateRumorId(title) : ''}
          </Typography>

          <Input
            label="Content *"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            isTextArea
            required
            disabled={isSubmitting}
          />

          <div>
            <label className="block text-sm font-medium mb-1 form-label">Status *</label>
            <select
              className="w-full rounded-lg border p-2 input"
              value={status}
              onChange={(e) => setStatus(e.target.value as RumorStatus)}
              required
              disabled={isSubmitting}
            >
              <option value="unconfirmed">Unconfirmed</option>
              <option value="confirmed">Confirmed</option>
              <option value="false">False</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 form-error">
            <AlertCircle size={16} />
            <Typography color="error">{error}</Typography>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedRumorIds.length < 2}
            startIcon={<Layers />}
            isLoading={isSubmitting}
          >
            Combine Rumors
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default CombineRumorsDialog;