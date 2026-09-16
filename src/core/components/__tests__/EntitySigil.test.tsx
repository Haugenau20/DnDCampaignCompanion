// src/core/components/__tests__/EntitySigil.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import EntitySigil from '../EntitySigil';
import { sigilIndexFor } from '../../utils/entity-sigil';

describe('EntitySigil', () => {
  test('shows the name initial, not the id initial', () => {
    // The id is a slug and may carry a disambiguating suffix; the reader should
    // see the name's letter.
    render(<EntitySigil entityId="kerowyn-hucrele-2" name="Kerowyn Hucrele" />);
    expect(screen.getByTestId('entity-sigil')).toHaveTextContent('K');
  });

  test('takes its hue from the id, not the name', () => {
    const { rerender } = render(<EntitySigil entityId="oakhurst" name="Oakhurst" />);
    const first = screen.getByTestId('entity-sigil').getAttribute('data-sigil-index');

    // Same entity, renamed: the mark must not move, or the identity it is
    // supposed to carry is not stable.
    rerender(<EntitySigil entityId="oakhurst" name="Oakhurst Village" />);
    expect(screen.getByTestId('entity-sigil').getAttribute('data-sigil-index')).toBe(first);
    expect(first).toBe(String(sigilIndexFor('oakhurst')));
  });

  test('renders the same mark for the same entity in two places', () => {
    render(
      <>
        <EntitySigil entityId="the-old-forest" name="The Old Forest" />
        <EntitySigil entityId="the-old-forest" name="The Old Forest" />
      </>
    );
    const [a, b] = screen.getAllByTestId('entity-sigil');
    expect(a.getAttribute('data-sigil-index')).toBe(b.getAttribute('data-sigil-index'));
    expect(a.textContent).toBe(b.textContent);
  });

  test('is hidden from assistive technology', () => {
    // The mark always sits beside the entity's name, so announcing it would be
    // pure duplication -- and its hue means nothing on its own.
    render(<EntitySigil entityId="thorin" name="Thorin" />);
    expect(screen.getByTestId('entity-sigil')).toHaveAttribute('aria-hidden', 'true');
  });

  test('never renders empty for a name with no letters', () => {
    render(<EntitySigil entityId="x" name="!!!" />);
    expect(screen.getByTestId('entity-sigil').textContent).toBeTruthy();
  });

  test('honours a custom size', () => {
    render(<EntitySigil entityId="x" name="X" size={40} />);
    expect(screen.getByTestId('entity-sigil')).toHaveStyle({ width: '40px', height: '40px' });
  });

  test('carries no inline colour, so a theme owns the paint', () => {
    // The hue is applied by a stylesheet rule keyed on data-sigil-index. An
    // inline colour would put paint beyond a theme's reach.
    render(<EntitySigil entityId="oakhurst" name="Oakhurst" />);
    const el = screen.getByTestId('entity-sigil');
    expect(el.getAttribute('style')).not.toMatch(/background/i);
    expect(el).toHaveAttribute('data-sigil-index', String(sigilIndexFor('oakhurst')));
  });
});
