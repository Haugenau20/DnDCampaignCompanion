// src/shared/components/quick-add/QuickAddDialog.tsx
import React from "react";
import Dialog from "core/components/Dialog";
import QuickAddForm from "./QuickAddForm";
import { QUICK_ADD_SPECS, type QuickAddCarry, type QuickAddEntity } from "./quickAddSpecs";

export interface QuickAddDialogProps {
  entity: QuickAddEntity | null;
  onClose: () => void;
  parentId?: string;
  noteId?: string;
  entityId?: string;
  carry?: QuickAddCarry;
  initialName?: string;
  initialLine?: string;
}

/**
 * Quick add's dialog mount -- a bottom sheet below the phone breakpoint, the
 * same centred panel above it.
 *
 * This passes Phase 14 §1 on all three questions rather than being an
 * exception to it (`00-entity-authoring.md` §4): the page behind it is the
 * context -- you are in the NPC list, adding an NPC to it -- there is no URL
 * worth returning to, and it holds one decision.
 *
 * Dismissal is the shared `Dialog`'s, not this component's. `Dialog` already
 * detects typing anywhere inside the panel and stops Escape and a backdrop
 * click from discarding it, which is Phase 14 §6's rule; quick add inherits it
 * without opting in.
 */
const QuickAddDialog: React.FC<QuickAddDialogProps> = ({
  entity,
  onClose,
  parentId,
  noteId,
  entityId,
  carry,
  initialName,
  initialLine,
}) => {
  if (!entity) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={QUICK_ADD_SPECS[entity].labels.title}
      maxWidth="max-w-lg"
      placement="sheet-on-phone"
    >
      <QuickAddForm
        // Remount on a change of entity so no field survives from the last
        // one. Opening "Add a quest" straight after "Add an NPC" must not
        // inherit the NPC's half-typed name.
        key={entity}
        entity={entity}
        parentId={parentId}
        noteId={noteId}
        entityId={entityId}
        carry={carry}
        initialName={initialName}
        initialLine={initialLine}
        onCreated={onClose}
        onCancel={onClose}
      />
    </Dialog>
  );
};

export default QuickAddDialog;
