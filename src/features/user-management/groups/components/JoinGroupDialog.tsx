// src/components/features/groups/JoinGroupDialog.tsx
import React from 'react';
import Dialog from 'core/components/Dialog';
import JoinGroupForm from './JoinGroupForm';

interface JoinGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * The join-a-group form, in a dialog.
 *
 * The form itself now lives in {@link JoinGroupForm} so that `/join` can
 * render the same thing as a page. This wrapper is unchanged in behaviour and
 * still the surface every existing caller opens; 14-5 is what retires it, once
 * the route has replaced every entry point.
 */
const JoinGroupDialog: React.FC<JoinGroupDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    title="Join a Group"
    maxWidth="max-w-md"
  >
    <JoinGroupForm onCancel={onClose} onSuccess={onSuccess} />
  </Dialog>
);

export default JoinGroupDialog;
