// src/core/components/EntitySigil.tsx
import React from 'react';
import clsx from 'clsx';
import { sigilIndexFor, sigilInitialFor } from 'core/utils/entity-sigil';

export interface EntitySigilProps {
  /** The entity's document id. Determines the hue, and only the hue. */
  entityId: string;
  /** The entity's display name. Determines the letter. */
  name: string;
  /** Rendered size in pixels. Defaults to 28, the density of a scanned row. */
  size?: number;
  className?: string;
}

/**
 * A small deterministic mark identifying one entity.
 *
 * The same NPC or location looks like itself everywhere it appears, because
 * both the hue and the letter are derived rather than stored -- there is no
 * migration, no per-entity record and no art.
 *
 * It is `aria-hidden` on purpose. The mark never carries meaning alone: it sits
 * beside the entity's name every time it is used, so to a screen reader it is
 * pure duplication. Announcing "letter K, Kerowyn Hucrele" would be noise, and
 * the mark's hue says nothing a sighted user can act on either.
 */
export const EntitySigil: React.FC<EntitySigilProps> = ({
  entityId,
  name,
  size = 28,
  className,
}) => {
  const index = sigilIndexFor(entityId);

  return (
    <span
      aria-hidden="true"
      data-testid="entity-sigil"
      data-sigil-index={index}
      className={clsx(
        'inline-flex items-center justify-center shrink-0 select-none',
        'rounded-md font-medium entity-sigil',
        className
      )}
      // The hue comes from `data-sigil-index` and a CSS rule per index, not an
      // inline colour. Paint stays in the stylesheet where a theme can reach it,
      // and the component states only which entity this is. Everything else --
      // radius, ink, weight -- is identical for every entity, which is what
      // keeps a long list reading as one system rather than a row of stickers.
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.45),
      }}
    >
      {sigilInitialFor(name)}
    </span>
  );
};

export default EntitySigil;
