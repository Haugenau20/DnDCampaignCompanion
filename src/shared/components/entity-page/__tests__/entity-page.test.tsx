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

  describe('the picture', () => {
    const { firebaseConfig } = jest.requireActual('core/services/firebase/config/firebaseConfig');
    const picture = {
      path: 'groups/g/campaigns/c/locations/gondolin/p.webp',
      url: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/p.webp?alt=media&token=t`,
      width: 1600,
      height: 900,
      uploadedBy: 'u1',
      uploadedAt: '2026-09-25T12:00:00.000Z',
    };
    const upload = { subject: 'picture', onUpload: jest.fn(), onRemove: jest.fn() };

    it('is drawn inside the band, behind the name, rather than above it', () => {
      const { container } = renderShell({ image: picture, imageAlt: 'Gondolin' });
      const band = container.querySelector('.hero-band') as HTMLElement;
      const img = screen.getByRole('img', { name: 'Gondolin' });

      expect(band.contains(img)).toBe(true);
      expect(img).toHaveAttribute('src', picture.url);
      // Heads the page: lazy loading would only delay it.
      expect(img).toHaveAttribute('loading', 'eager');
      expect(
        img.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('lays a scrim in the band colour between the picture and the text', () => {
      // Readability does not depend on what was uploaded: the text sits on the
      // scrim, which is the band's own surface colour (see `.hero-picture-scrim`).
      const { container } = renderShell({ image: picture, imageAlt: 'Gondolin' });
      const scrim = container.querySelector('.hero-band .hero-picture-scrim');
      expect(scrim).not.toBeNull();
      expect(
        screen.getByRole('img', { name: 'Gondolin' }).compareDocumentPosition(scrim as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('draws no picture from outside the app’s own bucket', () => {
      // A member can write any string into a document; a planted URL would log
      // everyone who opens the page.
      renderShell({
        image: { ...picture, url: 'https://tracker.example/pixel.png' },
        imageAlt: 'Gondolin',
      });
      expect(screen.queryByRole('img', { name: 'Gondolin' })).toBeNull();
      expect(screen.queryByTestId('entity-page-image')).toBeNull();
    });

    it('leaves the band as it is when there is no picture -- no empty slot', () => {
      const { container } = renderShell();
      expect(screen.queryByTestId('entity-page-image')).toBeNull();
      expect(screen.queryByRole('img')).toBeNull();
      expect(container.querySelector('.hero-picture-scrim')).toBeNull();
    });

    it('offers whoever may edit add, replace and remove on the band itself', () => {
      const { container, rerender } = renderShell({ imageUpload: upload });
      const band = container.querySelector('.hero-band') as HTMLElement;
      const add = screen.getByRole('button', { name: 'Add picture' });

      // Framed with the band, before the body: not a row under it.
      expect(band.parentElement?.contains(add)).toBe(true);
      expect(
        add.compareDocumentPosition(screen.getByTestId('body')) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      rerender(
        <MemoryRouter>
          <EntityPageShell
            breadcrumb={[{ label: 'Gondolin' }]}
            entityId="gondolin"
            name="Gondolin"
            image={picture}
            imageAlt="Gondolin"
            imageUpload={upload}
          >
            <div data-testid="body">prose and structure</div>
          </EntityPageShell>
        </MemoryRouter>
      );
      expect(screen.getByRole('button', { name: 'Replace picture' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove picture' })).toBeInTheDocument();
    });

    it('offers nothing to change without imageUpload', () => {
      renderShell({ image: picture, imageAlt: 'Gondolin' });
      expect(screen.queryByRole('button', { name: /picture/ })).toBeNull();
    });
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
