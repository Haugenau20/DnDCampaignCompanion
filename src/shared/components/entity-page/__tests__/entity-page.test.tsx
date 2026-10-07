// src/shared/components/entity-page/__tests__/entity-page.test.tsx
//
// The shell every entity page shares. What is pinned here is the part the
// pages depend on rather than re-derive: the identity card's shape and its two
// picture shapes, the column order a phone collapses into, and the rule that
// an empty section renders a prompt rather than an empty box.

import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EntityPageShell from '../EntityPageShell';
import EntityPageSection from '../EntityPageSection';
import FieldPrompt from '../FieldPrompt';
import EntityNotes from '../EntityNotes';
import EntityFact from '../EntityFact';
import EntityProse from '../EntityProse';

const renderShell = (props: Partial<React.ComponentProps<typeof EntityPageShell>> = {}) =>
  render(
    <MemoryRouter>
      <EntityPageShell
        breadcrumb={[{ label: 'Locations', href: '/locations' }, { label: 'Gondolin' }]}
        entityId="gondolin"
        name="Gondolin"
        subtitle={<span>In Beleriand</span>}
        {...props}
      >
        <div data-testid="body">prose and structure</div>
      </EntityPageShell>
    </MemoryRouter>
  );

/** The identity card: the section the page's h1 sits in. */
const identityCard = () =>
  screen.getByRole('heading', { level: 1 }).closest('section') as HTMLElement;

// T063: the shell is the NPC page's light card now, not `15-4`'s dark band.
describe('EntityPageShell', () => {
  it('names the record as the page’s only h1', () => {
    renderShell();
    expect(screen.getByRole('heading', { level: 1, name: 'Gondolin' })).toBeInTheDocument();
  });

  it('carries its line under the name, in the same card', () => {
    renderShell();
    expect(within(identityCard()).getByText('In Beleriand')).toBeInTheDocument();
  });

  it('leads back through the trail it is given', () => {
    renderShell();
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(trail).getByText('Locations')).toHaveAttribute('href', '/locations');
  });

  it('draws the name on a light card, and no band', () => {
    const { container } = renderShell();
    expect(identityCard()).toHaveClass('card');
    expect(container.querySelector('.hero-band')).toBeNull();
  });

  it('lets the page draw the name itself, as a click-to-edit control', () => {
    renderShell({
      heading: (
        <button type="button" aria-label="Edit the name Gondolin">
          <h1>Gondolin</h1>
        </button>
      ),
    });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      within(identityCard()).getByRole('button', { name: 'Edit the name Gondolin' })
    ).toBeInTheDocument();
  });

  it('keeps the actions and the standing facts in the card with the name', () => {
    renderShell({
      actions: <button type="button">Add a place inside</button>,
      facts: <EntityFact label="Knowledge">Visited</EntityFact>,
    });
    const card = identityCard();
    expect(within(card).getByRole('button', { name: 'Add a place inside' })).toBeInTheDocument();
    expect(within(card).getByText('Knowledge')).toBeInTheDocument();
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

    it('spans the page above the card when it is wide, with nothing written on it', () => {
      renderShell({ image: picture, imageAlt: 'Gondolin', aside: <div>relations</div> });
      const img = screen.getByRole('img', { name: 'Gondolin' });

      expect(img).toHaveAttribute('src', picture.url);
      // Heads the page: lazy loading would only delay it.
      expect(img).toHaveAttribute('loading', 'eager');
      expect(identityCard()).not.toContainElement(img);
      expect(
        img.compareDocumentPosition(identityCard()) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(screen.getByTestId('entity-page-image')).toHaveTextContent('');
    });

    it('stands beside the name, inside the card, when it is tall', () => {
      renderShell({ image: picture, imageAlt: 'Portrait of Gondolin', imageShape: 'tall' });
      expect(identityCard()).toContainElement(
        screen.getByRole('img', { name: 'Portrait of Gondolin' })
      );
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

    it('draws no empty frame without a picture: the sigil stands in', () => {
      renderShell();
      expect(screen.queryByTestId('entity-page-image')).toBeNull();
      expect(screen.queryByRole('img')).toBeNull();
    });

    it('offers whoever may edit to add one on the sigil, and to replace or remove it on the picture', () => {
      const { rerender } = renderShell({ imageUpload: upload });
      expect(within(identityCard()).getByRole('button', { name: 'Add picture' })).toBeInTheDocument();

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

describe('EntityFact', () => {
  it('states a label and a value, and nothing to press for a reader', () => {
    render(<EntityFact label="Status">Active</EntityFact>);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('makes the value itself the editor’s opener, named for the fact', () => {
    const onEdit = jest.fn();
    render(
      <EntityFact label="Status" onEdit={onEdit}>
        Active
      </EntityFact>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit status' }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('gives its place to the editor while it is open', () => {
    render(
      <EntityFact label="Status" onEdit={jest.fn()} editor={<label>Status ladder</label>}>
        Active
      </EntityFact>
    );
    expect(screen.getByText('Status ladder')).toBeInTheDocument();
    expect(screen.queryByText('Active')).toBeNull();
  });

  it('asks its question when there is no value and the viewer may edit', () => {
    render(<EntityFact label="Role" onEdit={jest.fn()} prompt="What do they do?" />);
    expect(screen.getByRole('button', { name: /What do they do\?/ })).toBeInTheDocument();
  });

  it('says "Unrecorded" to a reader when there is no value', () => {
    render(<EntityFact label="Role" prompt="What do they do?">{''}</EntityFact>);
    expect(screen.getByText('Unrecorded')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('EntityProse', () => {
  it('labels the prose, with an Edit button beside the label named for it', () => {
    const onEdit = jest.fn();
    render(
      <EntityProse label="Background" prompt="How did this come about?" onEdit={onEdit}>
        A dragon came.
      </EntityProse>
    );
    expect(screen.getByText('Background')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit background' }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('gives the whole card to the editor while it is open', () => {
    render(
      <EntityProse label="Background" prompt="?" onEdit={jest.fn()} editor={<p>editor</p>}>
        A dragon came.
      </EntityProse>
    );
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.queryByText('Background')).toBeNull();
    expect(screen.queryByText('A dragon came.')).toBeNull();
  });

  it('asks its question, and offers no Edit button, when nothing is written', () => {
    render(<EntityProse label="Background" prompt="How did this come about?" onEdit={jest.fn()} />);
    expect(screen.getByRole('button', { name: /How did this come about\?/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit background' })).toBeNull();
  });

  it('tells a reader nothing is written yet, and offers nothing to press', () => {
    render(<EntityProse label="Background" prompt="How did this come about?" />);
    expect(screen.getByText('Nothing written yet')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
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

// T063: one notes card for every entity page, so the NPC's and the location's
// cannot drift apart again.
describe('EntityNotes', () => {
  const NOTES = [
    { date: '2025-06-14', text: 'Turgon will not open the gates.' },
    { date: '2025-05-31', text: 'The last of the great kingdoms.', author: 'Zendikarr' },
  ];

  const renderNotes = (props: Partial<React.ComponentProps<typeof EntityNotes>> = {}) =>
    render(
      <EntityNotes
        notes={NOTES}
        canEdit
        onAdd={jest.fn().mockResolvedValue(undefined)}
        onEdit={jest.fn().mockResolvedValue(undefined)}
        onDelete={jest.fn().mockResolvedValue(undefined)}
        {...props}
      />
    );

  it('shows the notes oldest first, whatever order they are stored in, and says so', () => {
    renderNotes();
    const first = screen.getByText('The last of the great kingdoms.');
    const second = screen.getByText('Turgon will not open the gates.');
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('2 · oldest first')).toBeInTheDocument();
  });

  it('does not claim an order for a single note', () => {
    renderNotes({ notes: [NOTES[0]] });
    expect(screen.queryByText(/oldest first/)).not.toBeInTheDocument();
  });

  it('says there are none yet, rather than showing an empty box', () => {
    renderNotes({ notes: undefined });
    expect(screen.getByText('No notes yet')).toBeInTheDocument();
  });

  it('says a new note was saved, in words', async () => {
    renderNotes();
    fireEvent.change(screen.getByLabelText('Add a note'), { target: { value: 'The gates held.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('never claims a note was saved when the write was refused', async () => {
    renderNotes({ onAdd: jest.fn().mockRejectedValue(new Error('nope')) });
    fireEvent.change(screen.getByLabelText('Add a note'), { target: { value: 'The gates held.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    expect(await screen.findByText('Not saved')).toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('offers no composer and no note actions to someone who cannot edit', () => {
    renderNotes({ canEdit: false });
    expect(screen.queryByLabelText('Add a note')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit the note/ })).not.toBeInTheDocument();
  });
});
