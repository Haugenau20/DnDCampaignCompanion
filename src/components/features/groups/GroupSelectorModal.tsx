// src/components/features/groups/GroupSelectorModal.tsx
import React from 'react';
import { useGroups } from '../../../context/firebase';
import Dialog from '../../core/Dialog';
import GroupSelector from './GroupSelector';

/**
 * Modal wrapper for the GroupSelector component
 * This can be shown anytime to switch between groups
 */
const GroupSelectorModal: React.FC = () => {
  const { showGroupSelector, setShowGroupSelector } = useGroups();
  
  return (
    <Dialog
      open={showGroupSelector}
      onClose={() => setShowGroupSelector(false)}
      title="Group Selector"
      maxWidth="max-w-5xl"
    >
      <GroupSelector />
    </Dialog>
  );
};

export default GroupSelectorModal;