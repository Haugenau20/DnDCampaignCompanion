// src/features/campaign-entities/rumors/components/__tests__/RumorDirectory.test.tsx

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import RumorDirectory from '../RumorDirectory';
import { Rumor, RumorStatus, SourceType } from '../../types';

// ---------------------------------------------------------------------------
// Mock Dialog to render inline — RumorBatchActions mounts CombineRumorsDialog
// and ConvertToQuestDialog unconditionally (gated on `open`), and the real
// Dialog uses a portal that jsdom doesn't need to exercise for these tests.
// ---------------------------------------------------------------------------
jest.mock('../../../../../core/components/Dialog', () => {
  const MockDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
  }> = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
      <div data-testid="mock-dialog">
        {title && <h3>{title}</h3>}
        <button onClick={onClose} aria-label="Close dialog">X</button>
        {children}
      </div>
    );
  };
  return MockDialog;
});

// ---------------------------------------------------------------------------
// Polyfill crypto.randomUUID for JSDOM (used by ConvertToQuestDialog's
// initial state, which runs even while the dialog is closed)
// ---------------------------------------------------------------------------
if (!crypto.randomUUID) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
}

// ---------------------------------------------------------------------------
// Mock all context dependencies used by RumorDirectory
// ---------------------------------------------------------------------------

jest.mock('shared/hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'user-1' } })),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

jest.mock('../../context/RumorContext', () => ({
  useRumors: jest.fn(),
}));

jest.mock('../../../npcs/context/NPCContext', () => ({
  useNPCs: jest.fn(() => ({
    npcs: [{ id: 'npc-1', name: 'Gandalf the Grey', occupation: 'Wizard' }],
    getNPCById: jest.fn(() => undefined),
  })),
}));

// `locations` feeds the group-heading resolution added for #1412. These tests
// set `rumor.location` to display names and supply no location records, which
// resolveLocationName passes through verbatim.
jest.mock('../../../locations/context/LocationContext', () => ({
  useLocations: jest.fn(() => ({
    locations: [{ id: 'high-pass', name: 'The High Pass', type: 'landmark', status: 'known' }],
    getLocationById: jest.fn(() => undefined),
  })),
}));

jest.mock('shared/utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));

jest.mock('core/services/firebase', () => ({ default: {} }));

const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn(
  (path: string, _p: unknown, query?: Record<string, string>) =>
    query ? `${path}?${new URLSearchParams(query).toString()}` : path
);
const mockDeleteRumor = jest.fn().mockResolvedValue(undefined);
const mockAddRumor = jest.fn().mockResolvedValue('new-rumor');
const mockUpdateRumor = jest.fn().mockResolvedValue(undefined);
const mockUpdateRumorStatus = jest.fn().mockResolvedValue(undefined);
const mockCombineRumors = jest.fn().mockResolvedValue('new-rumor-id');
const mockConvertToQuest = jest.fn().mockResolvedValue('quest-id');

const { useNavigation } = require('shared/hooks/useNavigation');
const { useRumors } = require('../../context/RumorContext');
const { useAuth } = require('@/features/user-management');

function setupMocks(
  user: { uid: string } | null = { uid: 'user-1' },
  queryParams: Record<string, string> = {},
  rumorList: Rumor[] = []
) {
  (useAuth as jest.Mock).mockReturnValue({ user });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    createPath: mockCreatePath,
    getCurrentQueryParams: jest.fn(() => queryParams),
  });
  (useRumors as jest.Mock).mockReturnValue({
    rumors: rumorList,
    addRumor: mockAddRumor,
    updateRumor: mockUpdateRumor,
    deleteRumor: mockDeleteRumor,
    updateRumorStatus: mockUpdateRumorStatus,
    combineRumors: mockCombineRumors,
    convertToQuest: mockConvertToQuest,
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRumor(overrides: Partial<Rumor> = {}): Rumor {
  return {
    id: `rumor-${Math.random().toString(36).slice(2)}`,
    title: 'Test Rumor',
    content: 'A test rumor about something.',
    status: 'unconfirmed' as RumorStatus,
    sourceType: 'tavern' as SourceType,
    sourceName: 'The Rusty Flagon',
    location: 'Silverkeep',
    relatedNPCs: [],
    relatedLocations: [],
    notes: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

const r1 = makeRumor({ id: 'r1', title: 'Dragon spotted', status: 'confirmed', sourceType: 'npc', sourceName: 'Aldric', location: 'Silverkeep' });
const r2 = makeRumor({ id: 'r2', title: 'Missing merchant', status: 'unconfirmed', sourceType: 'tavern', sourceName: 'The Flagon', location: 'Ironhold' });
const r3 = makeRumor({ id: 'r3', title: 'Treasure map', status: 'false', sourceType: 'notice', sourceName: 'Town board', location: 'Silverkeep' });

/** The roster's search box. */
const searchInput = () => screen.getByPlaceholderText(/search rumors/i);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RumorDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('shows the rhythm of the rows that are coming, not a spinner', () => {
      const { container } = render(<RumorDirectory rumors={[]} isLoading={true} />);
      expect(screen.getByRole('status', { name: /loading rumors/i })).toBeInTheDocument();
      expect(container.querySelectorAll('.section-loading').length).toBeGreaterThan(3);
      expect(container.querySelector('.animate-spin')).toBeNull();
    });

    test('should not render search box when isLoading is true', () => {
      render(<RumorDirectory rumors={[]} isLoading={true} />);
      expect(screen.queryByPlaceholderText(/search rumors/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    test('says what the collection is for, and leaves the composer to fill it', () => {
      render(<RumorDirectory rumors={[]} />);
      expect(screen.getByText(/nothing heard yet/i)).toBeInTheDocument();
      expect(screen.getByText(/overheard in a tavern/i)).toBeInTheDocument();
      // CHANGED DELIBERATELY in `15-7`: the empty state's action used to
      // navigate to `/rumors/create`. The composer is already on screen above
      // it, so the button would have sent someone away from the control they
      // were looking at.
      expect(
        screen.queryByRole('button', { name: /add the first rumour/i })
      ).not.toBeInTheDocument();
      expect(
        screen.getByLabelText('Heard something? Title it here')
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rumor rendering / grouping
  // -------------------------------------------------------------------------
  describe('rumor rendering', () => {
    test('should render rumor titles', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
    });

    test('should render all provided rumors', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.getByText('Treasure map')).toBeInTheDocument();
    });

    test('should group rumors by location', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      expect(screen.getByRole('heading', { name: 'Silverkeep' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Ironhold' })).toBeInTheDocument();
    });

    test('should group rumors with no location under "Location unknown"', () => {
      const unlocated = makeRumor({ id: 'r-nowhere', title: 'Odd noises', location: undefined });
      render(<RumorDirectory rumors={[unlocated]} />);
      expect(screen.getByText('Location unknown')).toBeInTheDocument();
    });

    test('renders the group name as a heading, not a control', () => {
      render(<RumorDirectory rumors={[r1]} />);
      expect(screen.getByRole('heading', { name: 'Silverkeep' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Silverkeep' })).not.toBeInTheDocument();
    });

    test('shows each row as one dense row carrying status and source', () => {
      render(<RumorDirectory rumors={[r1]} />);
      // Scoped to the row, since "Confirmed" also labels a status-bar segment.
      const row = within(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      expect(row.getByText('Dragon spotted')).toBeInTheDocument();
      expect(row.getByText('Confirmed')).toBeInTheDocument();
      expect(row.getByText('NPC')).toBeInTheDocument();
      expect(row.getByText('Aldric')).toBeInTheDocument();
    });

    test('labels status with a word, not only a colour', () => {
      render(<RumorDirectory rumors={[r2]} />);
      const row = within(screen.getByRole('button', { name: /Expand Missing merchant/ }));
      expect(row.getByText('Unconfirmed')).toBeInTheDocument();
    });

    test('surfaces convertedToQuestId as a quest indicator on the row', () => {
      const converted = makeRumor({ id: 'r-quest', title: 'Bandit trouble', convertedToQuestId: 'quest-1' });
      render(<RumorDirectory rumors={[converted]} />);
      const row = within(screen.getByRole('button', { name: /Expand Bandit trouble/ }));
      expect(row.getByText('Converted to quest')).toBeInTheDocument();
    });

    test('shows a plain dash on the row when a rumor was not converted', () => {
      render(<RumorDirectory rumors={[r1]} />);
      const row = within(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      expect(row.getByText('—')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Row expansion
  // -------------------------------------------------------------------------
  describe('row expansion', () => {
    test('rows start collapsed and expose an expand control', () => {
      render(<RumorDirectory rumors={[r1]} />);
      const toggle = screen.getByRole('button', { name: /Expand Dragon spotted/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('expands in place, and holds the whole record rather than a summary', () => {
      // CHANGED DELIBERATELY in `15-7` item 2. The expansion used to be a
      // read-only summary with an Edit button that left for
      // `/rumors/edit/:id`. A rumour is the one entity with no page, so
      // §1.3's four-fact bound does not apply to it: the row holds all of it.
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));

      expect(
        screen.getByRole('button', { name: /Collapse Dragon spotted/ })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByLabelText('What was heard')).toBeInTheDocument();
      expect(screen.getByLabelText('Rumour')).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Heard from' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /Status of Dragon spotted/ })).toBeInTheDocument();
      expect(screen.getByText('Recorded by')).toBeInTheDocument();
    });

    test('collapses again on a second activation', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      fireEvent.click(screen.getByRole('button', { name: /Collapse Dragon spotted/ }));
      expect(screen.queryByLabelText('What was heard')).not.toBeInTheDocument();
    });

    test('only one row is expanded at a time', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      fireEvent.click(screen.getByRole('button', { name: /Expand Missing merchant/ }));

      expect(
        screen.getByRole('button', { name: /Expand Dragon spotted/ })
      ).toHaveAttribute('aria-expanded', 'false');
      expect(
        screen.getByRole('button', { name: /Collapse Missing merchant/ })
      ).toHaveAttribute('aria-expanded', 'true');
    });

    test('offers an empty rumour somewhere to write rather than a list of absences', () => {
      // CHANGED DELIBERATELY in `15-7`. The old expansion answered every
      // unwritten field with a sentence saying it was unwritten -- five of
      // them, stacked. The fields are editable now, so an empty one is an
      // empty control with its own label, which says the same thing and can be
      // acted on.
      const bare = makeRumor({
        id: 'bare',
        title: 'Bare rumor',
        content: '',
        sourceType: 'other',
        sourceName: '',
        notes: [],
        relatedNPCs: [],
        relatedLocations: [],
      });
      render(<RumorDirectory rumors={[bare]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Bare rumor/ }));

      expect(screen.getByLabelText('What was heard')).toHaveValue('');
      expect(screen.queryByText('No details recorded')).not.toBeInTheDocument();
      // "Who exactly" waits for a source kind (item 3).
      expect(screen.queryByLabelText('Who exactly')).not.toBeInTheDocument();
    });

    test('asks who exactly only once a source kind is chosen', () => {
      const bare = makeRumor({
        id: 'bare',
        title: 'Bare rumor',
        sourceType: 'other',
        sourceName: '',
      });
      render(<RumorDirectory rumors={[bare]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Bare rumor/ }));

      fireEvent.click(screen.getByRole('button', { name: 'A traveller' }));
      expect(screen.getByLabelText('Who exactly')).toBeInTheDocument();
    });

    test('turns who exactly into an NPC picker when the kind is an NPC', () => {
      const bare = makeRumor({ id: 'bare', title: 'Bare rumor', sourceType: 'other', sourceName: '' });
      render(<RumorDirectory rumors={[bare]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Bare rumor/ }));

      fireEvent.click(screen.getByRole('button', { name: 'An NPC' }));
      // A browse-first tray, not a text field: you attach the NPC you can see.
      expect(screen.queryByLabelText('Who exactly')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Attach to the source of Bare rumor/ })
      ).toBeInTheDocument();
    });

    test('shows a live link to the quest when a rumor was converted', () => {
      const converted = makeRumor({ id: 'r-quest', title: 'Bandit trouble', convertedToQuestId: 'quest-1' });
      render(<RumorDirectory rumors={[converted]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Bandit trouble/ }));

      fireEvent.click(screen.getByRole('button', { name: /open the quest/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests/quest-1');
    });
  });

  // -------------------------------------------------------------------------
  // Search filtering
  // -------------------------------------------------------------------------
  describe('search filtering', () => {
    test('should filter rumors by title search', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.change(searchInput(), { target: { value: 'Dragon' } });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should filter rumors by content search', () => {
      const r = makeRumor({ id: 'r-content', title: 'Alpha Rumor', content: 'A wizard appeared.' });
      const r2b = makeRumor({ id: 'r-other', title: 'Beta Rumor', content: 'A knight left town.' });
      render(<RumorDirectory rumors={[r, r2b]} />);
      fireEvent.change(searchInput(), { target: { value: 'wizard appeared' } });
      expect(screen.getByText('Alpha Rumor')).toBeInTheDocument();
      expect(screen.queryByText('Beta Rumor')).not.toBeInTheDocument();
    });

    test('should filter by source name', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.change(searchInput(), { target: { value: 'Aldric' } });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should be case-insensitive', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.change(searchInput(), { target: { value: 'dragon spotted' } });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
    });

    test('a collection emptied by a filter offers no create action', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.change(searchInput(), { target: { value: 'zzznomatch' } });
      expect(screen.getByText(/no rumours match these filters/i)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /add the first rumour/i })
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Status bar — one bar that also filters, replacing the "All Status" dropdown
  // -------------------------------------------------------------------------
  describe('status bar', () => {
    test('shows the total rumors gathered', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('rumors gathered')).toBeInTheDocument();
    });

    test('breaks the total down by status, each labelled with a word', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      expect(screen.getByRole('button', { name: '1 confirmed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 unconfirmed' })).toBeInTheDocument();
      // "Disproved", never "false" -- even in the bar (`15-7` item 6). It
      // describes what the party did, not the stored value.
      expect(screen.getByRole('button', { name: '1 disproved' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '1 false' })).not.toBeInTheDocument();
    });

    test('keeps zero-value statuses visible rather than hiding them', () => {
      render(<RumorDirectory rumors={[r1]} />);
      expect(screen.getByRole('button', { name: '0 disproved' })).toBeInTheDocument();
    });

    test('should filter by confirmed status', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 confirmed' }));
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should filter by unconfirmed status', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 unconfirmed' }));
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.queryByText('Dragon spotted')).not.toBeInTheDocument();
    });

    test('should filter by disproved status', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 disproved' }));
      expect(screen.getByText('Treasure map')).toBeInTheDocument();
      expect(screen.queryByText('Dragon spotted')).not.toBeInTheDocument();
    });

    test('clicking the active band clears the filter', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      const confirmedBand = () => screen.getByRole('button', { name: '1 confirmed' });

      fireEvent.click(confirmedBand());
      expect(confirmedBand()).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();

      fireEvent.click(confirmedBand());
      expect(confirmedBand()).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.getByText('Treasure map')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Source filter — small fixed set as visible pills, not a <select>
  // -------------------------------------------------------------------------
  describe('source filter', () => {
    test('renders every option as a visible pill rather than a select', () => {
      render(<RumorDirectory rumors={[r1]} />);
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      for (const label of ['All', 'NPC', 'Tavern', 'Notice', 'Traveler', 'Other']) {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
      }
    });

    test('should filter by NPC source type', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: 'NPC' }));
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should filter by tavern source type', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Tavern' }));
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.queryByText('Dragon spotted')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Combined filters
  // -------------------------------------------------------------------------
  describe('combined filters', () => {
    test('should apply search and status filter simultaneously', () => {
      const confirmed1 = makeRumor({ id: 'c1', title: 'Alpha', status: 'confirmed' });
      const unconfirmed1 = makeRumor({ id: 'u1', title: 'Alpha', status: 'unconfirmed' });
      render(<RumorDirectory rumors={[confirmed1, unconfirmed1]} />);

      fireEvent.change(searchInput(), { target: { value: 'Alpha' } });
      fireEvent.click(screen.getByRole('button', { name: '1 confirmed' }));

      expect(screen.getAllByText('Alpha').length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Delete / edit actions in the expanded row
  // -------------------------------------------------------------------------
  describe('row actions', () => {
    test('offers no way out to the edit form', () => {
      // CHANGED DELIBERATELY in `15-7`. The round trip to `/rumors/edit/:id`
      // to change "unconfirmed" to "confirmed" is the thing this PR deletes.
      // The route survives until `15-8` redirects it; nothing here points at
      // it any more.
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));

      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(mockNavigateToPage).not.toHaveBeenCalledWith('/rumors/edit/r1');
    });

    test('asks once before deleting, and deletes only when asked twice', async () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(mockDeleteRumor).not.toHaveBeenCalled();
      expect(screen.getByText('Delete this rumour for everyone?')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Delete Dragon spotted' }));
      await waitFor(() => expect(mockDeleteRumor).toHaveBeenCalledWith('r1'));
    });

    test('keeps the rumour when the question is answered the other way', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));

      expect(mockDeleteRumor).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });


  // -------------------------------------------------------------------------
  // The composer (`15-7` item 1)
  // -------------------------------------------------------------------------
  describe('the composer row', () => {
    test('sits at the top of the list, always, with no dialog and no route', async () => {
      render(<RumorDirectory rumors={[r1]} />);
      const field = screen.getByLabelText('Heard something? Title it here');
      fireEvent.change(field, { target: { value: 'Orcs massing in the High Pass' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add rumour' }));

      await waitFor(() =>
        expect(mockAddRumor).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Orcs massing in the High Pass',
            status: 'unconfirmed',
          })
        )
      );
      expect(mockNavigateToPage).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('adds on Enter, because a rumour is written down mid-sentence', async () => {
      render(<RumorDirectory rumors={[r1]} />);
      const field = screen.getByLabelText('Heard something? Title it here');
      fireEvent.change(field, { target: { value: 'A wizard is coming' } });
      fireEvent.keyDown(field, { key: 'Enter' });

      await waitFor(() => expect(mockAddRumor).toHaveBeenCalled());
    });

    test('refuses to add nothing, and says why rather than looking broken', () => {
      // A disabled button that says nothing is indistinguishable from one that
      // is not wired up -- which is exactly how this one was first read.
      render(<RumorDirectory rumors={[r1]} />);
      const add = screen.getByRole('button', { name: 'Add rumour' });
      expect(add).toBeDisabled();

      // Said twice on purpose: a tooltip on the wrapper, because a disabled
      // button receives no pointer events and never shows its own...
      expect(add.parentElement).toHaveAttribute(
        'title',
        'Give it a title first — then this adds it.'
      );
      // ...and the same sentence bound to the button, for anyone not hovering.
      const hint = document.getElementById(add.getAttribute('aria-describedby')!);
      expect(hint).toHaveTextContent('Give it a title first — then this adds it.');
    });

    test('stops explaining itself once there is something to add', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.change(screen.getByLabelText('Heard something? Title it here'), {
        target: { value: 'Orcs massing' },
      });

      const add = screen.getByRole('button', { name: 'Add rumour' });
      expect(add).toBeEnabled();
      expect(add.parentElement).not.toHaveAttribute('title');
      expect(add).not.toHaveAttribute('aria-describedby');
    });

    test('keeps the typed title when the write is refused, and says why', async () => {
      mockAddRumor.mockRejectedValueOnce(new Error('Permission denied'));
      render(<RumorDirectory rumors={[r1]} />);
      const field = screen.getByLabelText('Heard something? Title it here');
      fireEvent.change(field, { target: { value: 'Orcs massing' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add rumour' }));

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('Permission denied')
      );
      expect(field).toHaveValue('Orcs massing');
    });

    test('stands down in selection mode, where the rows are checkboxes', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      expect(
        screen.queryByLabelText('Heard something? Title it here')
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Editing in place (`15-7` items 8 and 9) — the failure most likely to bite
  // -------------------------------------------------------------------------
  describe('editing a rumour in its row', () => {
    const openRow = (title: string) =>
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Expand ${title}`) }));

    test('writes the typed fields through the context, on Save', async () => {
      render(<RumorDirectory rumors={[r1]} />);
      openRow('Dragon spotted');
      fireEvent.change(screen.getByLabelText('What was heard'), {
        target: { value: 'A red one, over the Lonely Mountain.' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(mockUpdateRumor).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'r1',
            content: 'A red one, over the Lonely Mountain.',
          })
        )
      );
    });

    test('keeps typed text through a filter change and back again', () => {
      // Item 8, and the gate. The list re-renders underneath the editor, and
      // a row that stops matching unmounts with whatever was in it. The draft
      // lives in the directory for exactly this.
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      openRow('Dragon spotted');
      fireEvent.change(screen.getByLabelText('What was heard'), {
        target: { value: 'Half a sentence, mid-' },
      });

      // Filter the open row out of the list entirely...
      fireEvent.click(screen.getByRole('button', { name: '1 unconfirmed' }));
      expect(screen.queryByLabelText('What was heard')).not.toBeInTheDocument();

      // ...and back.
      fireEvent.click(screen.getByRole('button', { name: '1 unconfirmed' }));
      expect(screen.getByLabelText('What was heard')).toHaveValue('Half a sentence, mid-');
    });

    test('keeps typed text when another row changes status underneath it', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      openRow('Dragon spotted');
      fireEvent.change(screen.getByLabelText('What was heard'), {
        target: { value: 'Still typing' },
      });

      // A search keystroke re-renders the whole list, the same way another
      // player's write would.
      fireEvent.change(searchInput(), { target: { value: 'Dragon' } });
      expect(screen.getByLabelText('What was heard')).toHaveValue('Still typing');
    });

    test('keeps the typed text and says why when the save is refused', async () => {
      mockUpdateRumor.mockRejectedValueOnce(new Error('Permission denied'));
      render(<RumorDirectory rumors={[r1]} />);
      openRow('Dragon spotted');
      fireEvent.change(screen.getByLabelText('What was heard'), {
        target: { value: 'Hard-won sentence.' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('Permission denied')
      );
      expect(screen.getByLabelText('What was heard')).toHaveValue('Hard-won sentence.');
    });

    test('discards the draft on Collapse, rather than saving it quietly', () => {
      render(<RumorDirectory rumors={[r1]} />);
      openRow('Dragon spotted');
      fireEvent.change(screen.getByLabelText('What was heard'), {
        target: { value: 'Never mind.' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));

      expect(mockUpdateRumor).not.toHaveBeenCalled();
      openRow('Dragon spotted');
      expect(screen.getByLabelText('What was heard')).toHaveValue(r1.content);
    });

    test('offers Save only once something has changed', () => {
      render(<RumorDirectory rumors={[r1]} />);
      openRow('Dragon spotted');
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

      fireEvent.change(screen.getByLabelText('Rumour'), {
        target: { value: 'Dragon spotted twice' },
      });
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    test('confirms a rumour in one click, without waiting for Save', async () => {
      render(<RumorDirectory rumors={[r2]} />);
      openRow('Missing merchant');
      const ladder = screen.getByRole('group', { name: /Status of Missing merchant/ });
      fireEvent.click(within(ladder).getByRole('button', { name: 'Confirmed' }));

      await waitFor(() =>
        expect(mockUpdateRumorStatus).toHaveBeenCalledWith('r2', 'confirmed')
      );
    });

    test('says "Disproved" on the ladder, never "False"', () => {
      render(<RumorDirectory rumors={[r2]} />);
      openRow('Missing merchant');
      const ladder = screen.getByRole('group', { name: /Status of Missing merchant/ });
      expect(within(ladder).getByRole('button', { name: 'Disproved' })).toBeInTheDocument();
      expect(within(ladder).queryByRole('button', { name: 'False' })).not.toBeInTheDocument();
    });

    test('attaches what a rumour points at, in place, without typing', async () => {
      render(<RumorDirectory rumors={[r2]} />);
      openRow('Missing merchant');
      fireEvent.click(
        screen.getByRole('button', { name: /Attach to what Missing merchant points at/ })
      );
      fireEvent.click(within(screen.getByRole('listbox')).getByText('Gandalf the Grey'));

      await waitFor(() =>
        expect(mockUpdateRumor).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'r2', relatedNPCs: ['npc-1'] })
        )
      );
    });
  });

  // -------------------------------------------------------------------------
  // A disproved rumour is knowledge, not a failure
  // -------------------------------------------------------------------------
  describe('what disproved looks like', () => {
    test('reads "Disproved" and never "False" in the row', () => {
      render(<RumorDirectory rumors={[r3]} />);
      expect(screen.getByText('Disproved')).toBeInTheDocument();
      expect(screen.queryByText('False')).not.toBeInTheDocument();
    });

    test('sits on the ladder\u2019s top rung with confirmed, and carries the strike instead', () => {
      // Colour schema §3's worked example: both are fully known, and what
      // separates them is the cue, not the hue. Until `15-7` the code put
      // disproved on `valence-3` -- the red a failed quest wears -- while the
      // comment above it claimed otherwise.
      render(<RumorDirectory rumors={[r1, r3]} />);

      const confirmed = screen.getByText('Confirmed');
      const disproved = screen.getByText('Disproved');
      const rung = (node: HTMLElement) =>
        (node.closest('[class*="valence-"]') ?? node).className.match(/valence-\d/)?.[0];

      expect(rung(disproved)).toBe(rung(confirmed));
      expect(rung(disproved)).not.toBe('valence-3');
      expect(
        (disproved.closest('[class*="cue-negated"]') ?? disproved).className
      ).toContain('cue-negated');
    });
  });

  // -------------------------------------------------------------------------
  // Selection mode — select-then-batch (confirm / unconfirm / mark false /
  // combine / convert to quest), restored via RosterRow's `leadingControl`.
  // -------------------------------------------------------------------------
  describe('selection mode', () => {
    test('shows a "Select Rumors" button, with no checkboxes until it is used', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      expect(screen.getByRole('button', { name: /select rumors/i })).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    test('entering selection mode reveals one accessible checkbox per rumor', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));

      expect(screen.getByRole('checkbox', { name: 'Select Dragon spotted' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select Missing merchant' })).toBeInTheDocument();
    });

    test('toggles to "Exit Selection" once selection mode is active', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      expect(screen.getByRole('button', { name: /exit selection/i })).toBeInTheDocument();
    });

    test('checking a row does not expand it — the checkbox is outside the toggle button', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));

      expect(
        screen.getByRole('button', { name: /Expand Dragon spotted/ })
      ).toHaveAttribute('aria-expanded', 'false');
    });

    test('selecting rumors accumulates them and shows the batch actions bar', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));

      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));
      expect(screen.getByText(/1 rumors selected/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Missing merchant' }));
      expect(screen.getByText(/2 rumors selected/i)).toBeInTheDocument();
    });

    test('unchecking a rumor removes it from the batch', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));

      const dragonCheckbox = screen.getByRole('checkbox', { name: 'Select Dragon spotted' });
      fireEvent.click(dragonCheckbox);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Missing merchant' }));
      expect(screen.getByText(/2 rumors selected/i)).toBeInTheDocument();

      fireEvent.click(dragonCheckbox);
      expect(screen.getByText(/1 rumors selected/i)).toBeInTheDocument();
    });

    test('the batch actions bar only appears once selection mode is on and something is selected', () => {
      render(<RumorDirectory rumors={[r1]} />);
      expect(screen.queryByText(/rumors selected/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      // Selection mode is on but nothing is checked yet — no bar.
      expect(screen.queryByText(/rumors selected/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));
      expect(screen.getByText(/1 rumors selected/i)).toBeInTheDocument();
    });

    test('exposes the batch status actions once a rumor is selected', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));

      expect(screen.getByRole('button', { name: /mark confirmed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mark unconfirmed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mark false/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /convert to quest/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^combine$/i })).toBeInTheDocument();
    });

    test('running a batch status update calls updateRumorStatus and clears the selection on completion', async () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));

      fireEvent.click(screen.getByRole('button', { name: /mark confirmed/i }));
      expect(mockUpdateRumorStatus).toHaveBeenCalledWith('r1', 'confirmed');

      // onComplete exits selection mode and clears the selection, so the
      // checkboxes and the batch bar both disappear.
      await screen.findByRole('button', { name: /select rumors/i });
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByText(/rumors selected/i)).not.toBeInTheDocument();
    });

    test('leaving selection mode via "Exit Selection" hides checkboxes and the batch bar', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));
      expect(screen.getByText(/1 rumors selected/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /exit selection/i }));

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByText(/rumors selected/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select rumors/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Row anatomy — one encoding per fact
  // -------------------------------------------------------------------------
  describe('row anatomy', () => {
    test('carries exactly one identity mark, derived from the id', () => {
      render(<RumorDirectory rumors={[r1]} />);
      const row = within(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      const marks = row.getAllByTestId('entity-sigil');
      expect(marks).toHaveLength(1);
      expect(marks[0]).toHaveTextContent('D');
    });

    test('states status as a word and nothing else', () => {
      render(<RumorDirectory rumors={[r1]} />);
      const row = screen.getByRole('button', { name: /Expand Dragon spotted/ });
      expect(within(row).getByText('Confirmed')).toBeInTheDocument();
      expect(row.querySelectorAll('.bg-status-completed')).toHaveLength(0);
      expect(row.querySelectorAll('.bg-status-unknown')).toHaveLength(0);
      expect(row.querySelectorAll('.bg-status-failed')).toHaveLength(0);
    });

    test('does not badge a converted rumour twice in one row', () => {
      // The last cell already reads "Converted to quest"; the pill beside the
      // title said it again, in a box.
      const converted = makeRumor({
        id: 'r-converted',
        title: 'Bandits on the road',
        convertedToQuestId: 'q-1',
      });
      render(<RumorDirectory rumors={[converted]} />);
      const row = within(screen.getByRole('button', { name: /Expand Bandits on the road/ }));
      expect(row.getByText('Converted to quest')).toBeInTheDocument();
      expect(row.queryByText('Quest')).not.toBeInTheDocument();
    });
  });

});


// ---------------------------------------------------------------------------
// PR 15.3 -- the knowledge ladder and the highlight contract
// ---------------------------------------------------------------------------

describe('RumorDirectory — 15.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('the knowledge ladder', () => {
    it('resolves a rumour from the row, in one click', async () => {
      render(<RumorDirectory rumors={[r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Missing merchant/ }));

      const ladder = screen.getByRole('group', { name: 'Status of Missing merchant' });
      fireEvent.click(within(ladder).getByRole('button', { name: 'Confirmed' }));

      await waitFor(() =>
        expect(mockUpdateRumorStatus).toHaveBeenCalledWith('r2', 'confirmed')
      );
    });

    it('says "Disproved", never "False"', () => {
      render(<RumorDirectory rumors={[r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Missing merchant/ }));

      const ladder = screen.getByRole('group', { name: 'Status of Missing merchant' });
      expect(within(ladder).getByRole('button', { name: 'Disproved' })).toBeInTheDocument();
      expect(within(ladder).queryByRole('button', { name: 'False' })).toBeNull();
    });

    it('writes the stored value behind the readable label', async () => {
      render(<RumorDirectory rumors={[r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Missing merchant/ }));

      const ladder = screen.getByRole('group', { name: 'Status of Missing merchant' });
      fireEvent.click(within(ladder).getByRole('button', { name: 'Disproved' }));

      await waitFor(() => expect(mockUpdateRumorStatus).toHaveBeenCalledWith('r2', 'false'));
    });
  });

  describe('?highlight= (T014)', () => {
    it('opens the target row, which it never used to do', () => {
      setupMocks({ uid: 'user-1' }, { highlight: 'r2' }, [r1, r2]);
      render(<RumorDirectory rumors={[r1, r2]} />);
      expect(
        screen.getByRole('button', { name: /Collapse Missing merchant/ })
      ).toBeInTheDocument();
    });
  });
});
