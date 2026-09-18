// src/shared/components/entity-page/FieldPrompt.tsx
import React from 'react';
import clsx from 'clsx';
import { Plus } from 'lucide-react';

export interface FieldPromptProps {
  /** The question, e.g. "What is this place?". Never a field name. */
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

/**
 * The invitation an unwritten field shows instead of an empty box.
 *
 * §10: **prompts are questions, not labels.** A location created through quick
 * add has a name and one line and nothing else, and a page that answers that
 * with six empty boxes reads as broken rather than new (design language §8,
 * §12.7). Each box becomes a question with somewhere to type.
 *
 * Deliberately a button rather than a click target dressed as text: it is the
 * only thing in the section, so a keyboard has to be able to reach it.
 */
export const FieldPrompt: React.FC<FieldPromptProps> = ({
  children,
  onClick,
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-md',
      'border border-dashed card-border selectable-item typography-secondary',
      'min-h-[44px] sm:min-h-[38px]',
      className
    )}
  >
    <Plus size={14} aria-hidden="true" className="shrink-0" />
    <span className="text-sm">{children}</span>
  </button>
);

export default FieldPrompt;
