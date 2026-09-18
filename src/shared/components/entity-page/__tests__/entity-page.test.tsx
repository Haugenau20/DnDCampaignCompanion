// src/shared/components/entity-page/__tests__/entity-page.test.tsx
//
// The shell `15-4` builds and `15-5` and `15-6` consume unchanged. What is
// pinned here is the part those PRs depend on rather than re-derive: the band's
// shape, the column order a phone collapses into, and the rule that an empty
// section renders a prompt rather than an empty box.

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EntityPageShell from '../EntityPageShell';
import EntityPageSection from '../EntityPageSection';
import FieldPrompt from '../FieldPrompt';

const renderShell = (props: Partial<React.ComponentProps<typeof EntityPageShell>> = {}) =>
  render(
    <MemoryRouter>
      <EntityPageShell
        breadcrumb={[{ label: 'Locations', href: '/locations' }, { label: 'Gondolin' }]}
        entityId="gondolin"
        name="Gondolin"
        meta="City in Beleriand · 2 places inside"
        {...props}
      >
        <div data-testid="body">prose and structure</div>
      </EntityPageShell>
    </MemoryRouter>
  );

describe('EntityPageShell', () => {
  it('names the record as the page’s only h1', () => {
    renderShell();
    expect(screen.getByRole('heading', { level: 1, name: 'Gondolin' })).toBeInTheDocument();
  });

  it('carries one metadata line under the name', () => {
    renderShell();
    expect(screen.getByText('City in Beleriand · 2 places inside')).toBeInTheDocument();
  });

  it('leads back through the trail it is given', () => {
    renderShell();
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(trail).getByText('Locations')).toHaveAttribute('href', '/locations');
  });

  it('draws the band from the band surface, naming no colour of its own', () => {
    // `colour-schema.md` §5.2 solves `accent.*` against page, card and sunken
    // and not against the band (~1.9:1, T040). An implementing PR may not close
    // that gap, so nothing here may reach for an accent.
    const { container } = renderShell();
    const band = container.querySelector('.hero-band') as HTMLElement;
    expect(band).toBeTruthy();
    expect(band.className).not.toMatch(/accent/);
  });

  it('puts prose and structure before relations, which is the order a phone reads', () => {
    const { container } = renderShell({
      aside: <div data-testid="aside">relations and record</div>,
    });
    const body = screen.getByTestId('body');
    const aside = screen.getByTestId('aside');
    // One column on a phone, in DOM order: the sidebar must not land between
    // the name and the description.
    expect(body.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('.grid-cols-1')).toBeTruthy();
  });

  it('renders a single column when there is no aside', () => {
    const { container } = renderShell();
    expect(container.querySelector('[class*="lg:grid-cols-["]')).toBeNull();
  });

  it('places the state control and the actions together on the band', () => {
    renderShell({
      bandControl: <button type="button">Knowledge</button>,
      actions: <button type="button">Add a place inside</button>,
    });
    const band = screen
      .getByRole('button', { name: 'Knowledge' })
      .closest('.hero-band') as HTMLElement;
    expect(within(band).getByRole('button', { name: 'Add a place inside' })).toBeInTheDocument();
  });
});

describe('EntityPageSection', () => {
  it('names what is under it, in the application’s voice', () => {
    render(<EntityPageSection title="Notable features">content</EntityPageSection>);
    expect(screen.getByText('Notable features')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders the empty state instead of the body when there is nothing', () => {
    render(
      <EntityPageSection title="Notes" empty={<span>Nothing written yet</span>}>
        {null}
      </EntityPageSection>
    );
    expect(screen.getByText('Nothing written yet')).toBeInTheDocument();
  });

  it('treats an all-falsy list as empty, which is what a filtered list leaves behind', () => {
    render(
      <EntityPageSection title="Notes" empty={<span>Nothing written yet</span>}>
        {[null, false]}
      </EntityPageSection>
    );
    expect(screen.getByText('Nothing written yet')).toBeInTheDocument();
  });

  it('shows a count beside the heading only when it is given one', () => {
    const { rerender } = render(
      <EntityPageSection title="Notes" count={3}>x</EntityPageSection>
    );
    expect(screen.getByText('3')).toBeInTheDocument();

    rerender(<EntityPageSection title="Notes">x</EntityPageSection>);
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });
});

describe('FieldPrompt', () => {
  it('asks a question, and is a control a keyboard can reach', () => {
    // §10: prompts are questions, not labels. An unwritten section renders
    // "+ What do they want?", not an empty box under the word "Personality".
    const onClick = jest.fn();
    render(<FieldPrompt onClick={onClick}>What is this place?</FieldPrompt>);

    const prompt = screen.getByRole('button', { name: /What is this place\?/ });
    prompt.focus();
    expect(prompt).toHaveFocus();
  });

  it('is at least 44px tall on a phone, because it is the section’s only target', () => {
    render(<FieldPrompt onClick={jest.fn()}>What is this place?</FieldPrompt>);
    expect(screen.getByRole('button').className).toContain('min-h-[44px]');
  });
});
