// src/shared/components/entity-page/FieldLabel.tsx
import React from 'react';
import Typography from 'core/components/Typography';

/**
 * The uppercase micro-label a field on an entity page is introduced by --
 * "Status", "Description", "Notes". Muted, so that it reads as the name of a
 * value rather than as a heading over a card of its own.
 */
export const FieldLabel: React.FC<{ children: React.ReactNode; id?: string }> = ({
  children,
  id,
}) => (
  <Typography
    id={id}
    variant="body-sm"
    color="muted"
    className="text-[11px] font-semibold uppercase tracking-wider"
  >
    {children}
  </Typography>
);

export default FieldLabel;
