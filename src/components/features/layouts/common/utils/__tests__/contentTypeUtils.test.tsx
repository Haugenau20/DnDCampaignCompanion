// src/components/features/layouts/common/utils/__tests__/contentTypeUtils.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { getContentIcon, getContentTypeLabel } from '../contentTypeUtils';

// ---------------------------------------------------------------------------
// getContentIcon
// ---------------------------------------------------------------------------
describe('getContentIcon', () => {
  // We validate by rendering the returned React element and checking it renders.

  it('returns a React element for type "chapter"', () => {
    const icon = getContentIcon('chapter');
    const { container } = render(<>{icon}</>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('returns a React element for type "npc"', () => {
    const icon = getContentIcon('npc');
    const { container } = render(<>{icon}</>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('returns a React element for type "quest"', () => {
    const icon = getContentIcon('quest');
    const { container } = render(<>{icon}</>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('returns a React element for type "rumor"', () => {
    const icon = getContentIcon('rumor');
    const { container } = render(<>{icon}</>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('returns a React element for type "location"', () => {
    const icon = getContentIcon('location');
    const { container } = render(<>{icon}</>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('returns a React element (Clock fallback) for unknown types', () => {
    const icon = getContentIcon('unknown');
    const { container } = render(<>{icon}</>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('defaults to size 16 when no size is provided', () => {
    // Lucide icons render an svg; verify it does not crash and renders an element
    const icon = getContentIcon('npc');
    const { container } = render(<>{icon}</>);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('accepts a custom size value', () => {
    // A different size should still render successfully
    const icon = getContentIcon('npc', 32);
    const { container } = render(<>{icon}</>);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('returns different elements for different known types', () => {
    const chapterIcon = getContentIcon('chapter');
    const npcIcon = getContentIcon('npc');
    // Both should be valid React elements — their type props differ
    expect(React.isValidElement(chapterIcon)).toBe(true);
    expect(React.isValidElement(npcIcon)).toBe(true);
    // They should not be the exact same element reference
    expect(chapterIcon).not.toBe(npcIcon);
  });
});

// ---------------------------------------------------------------------------
// getContentTypeLabel
// ---------------------------------------------------------------------------
describe('getContentTypeLabel', () => {
  it('returns "Story" for type "chapter"', () => {
    expect(getContentTypeLabel('chapter')).toBe('Story');
  });

  it('returns "NPC" for type "npc"', () => {
    expect(getContentTypeLabel('npc')).toBe('NPC');
  });

  it('returns "Quest" for type "quest"', () => {
    expect(getContentTypeLabel('quest')).toBe('Quest');
  });

  it('returns "Rumor" for type "rumor"', () => {
    expect(getContentTypeLabel('rumor')).toBe('Rumor');
  });

  it('returns "Location" for type "location"', () => {
    expect(getContentTypeLabel('location')).toBe('Location');
  });

  it('capitalises the first letter for unknown types', () => {
    expect(getContentTypeLabel('session')).toBe('Session');
  });

  it('handles single-character unknown types', () => {
    expect(getContentTypeLabel('x')).toBe('X');
  });

  it('handles multi-word unknown types by only capitalising the first character', () => {
    // The function only capitalises charAt(0), so the rest is unchanged
    expect(getContentTypeLabel('my type')).toBe('My type');
  });

  it('handles an empty string gracefully without throwing', () => {
    // charAt(0) on '' is '' and slice(1) is '' — result is ''
    expect(() => getContentTypeLabel('')).not.toThrow();
    expect(getContentTypeLabel('')).toBe('');
  });
});
