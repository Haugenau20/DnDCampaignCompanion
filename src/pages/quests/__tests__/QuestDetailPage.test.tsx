// src/pages/quests/__tests__/QuestDetailPage.test.tsx
//
// `/quests/:questId` — the address a quest never had.
//
// The gates this suite stands for, from `handoff/15-5-quest-page.md`: the page
// renders and is linkable; **no id is rendered as a label**; **no NPC appears
// twice**; objectives are tickable *and* authorable with one contract, and a
// rejected write reverts visibly; **completing the last objective does not
// silently complete the quest**; every field editable in place; a quest with a
// title and description only looks **new, not broken**; and delete lives here,
// naming what else loses a link.

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuestDetailPage from '../QuestDetailPage';

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
let mockQuestId: string | undefined = 'reclaim-erebor';
let mockRouterState: any = null;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ questId: mockQuestId }),
  useLocation: () => ({ pathname: '/quests', state: mockRouterState }),
}));

// ---------------------------------------------------------------------------
// The gate (see the location page's suite for the same shape)
// ---------------------------------------------------------------------------
let mockUser: { uid: string } | null = { uid: 'user-1' };
let mockActiveGroupId: string | null = 'group-1';
let mockActiveCampaignId: string | null = 'campaign-1';

jest.mock('features/user-management', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
  useGroups: () => ({
    activeGroupId: mockActiveGroupId,
    groups: [{ id: 'group-1', name: 'The Company' }],
    setActiveGroup: jest.fn().mockResolvedValue(undefined),
  }),
  useCampaigns: () => ({
    activeCampaignId: mockActiveCampaignId,
    activeCampaign: mockActiveCampaignId
      ? { id: mockActiveCampaignId, name: 'Wilderland' }
      : null,
    setActiveCampaign: jest.fn().mockResolvedValue(undefined),
  }),
  useUser: () => ({
    activeGroupUserProfile: {
      username: 'gandlaf',
      activeCharacterId: 'char-1',
      characters: [{ id: 'char-1', name: 'Zendikarr' }],
    },
  }),
  signInPathFor: () => '/signin',
}));

jest.mock('core/services/firebase', () => ({
  __esModule: true,
  default: {
    campaign: { getCampaigns: jest.fn().mockResolvedValue([]) },
  },
}));

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const QUEST = {
  id: 'reclaim-erebor',
  title: 'Reclaim Erebor',
  description: 'Find the secret door into the Lonely Mountain and reclaim the dwarven kingdom.',
  status: 'active' as const,
  background: 'The company has reached the Lonely Mountain.',
  objectives: [
    { id: 'obj-1', description: 'Find the secret door', completed: true },
    { id: 'obj-2', description: 'Enter the mountain undetected', completed: false },
    { id: 'obj-3', description: "Scout the dragon's hoard", completed: false },
  ],
  leads: ['The door can only be opened on Durin’s Day'],
  complications: ["Thorin's growing obsession with the Arkenstone"],
  rewards: ['Access to Erebor'],
  keyLocations: [{ name: 'Secret door', description: 'Hidden entrance on the western side' }],
  // The reference draws both Thorin and Smaug here, and drew them twice: once
  // from this list and once from `importantNPCs`, which `15-5` deletes.
  relatedNPCIds: ['thorin', 'smaug'],
  locationId: 'erebor',
  levelRange: '7-9',
  createdByUsername: 'DungeonMaster',
  dateAdded: '2025-05-31T19:27:30.387Z',
};

/** A quest made through quick add: a title, a line, and nothing else. */
const NEW_QUEST = {
  id: 'new-quest',
  title: 'A new errand',
  description: 'Somebody asked for something.',
  status: 'active' as const,
  objectives: [],
  createdByUsername: 'DungeonMaster',
  dateAdded: '2025-06-01T00:00:00.000Z',
};

let mockQuests: any[] = [QUEST];
let mockNPCs: any[] = [
  { id: 'thorin', name: 'Thorin Oakenshield', occupation: 'King under the Mountain', locationId: 'erebor' },
  { id: 'smaug', name: 'Smaug', occupation: 'The Terrible', locationId: 'erebor' },
];
let mockLocations: any[] = [
  { id: 'erebor', name: 'Erebor', type: 'landmark', status: 'known', relatedQuests: ['reclaim-erebor'] },
];
let mockRumors: any[] = [
  { id: 'r-1', title: "Signs of Smaug's activity", status: 'confirmed', convertedToQuestId: 'reclaim-erebor' },
];
let mockNotes: any[] = [
  {
    id: 'note-14',
    title: 'Session 14 notes',
    extractedEntities: [
      { id: 'e-1', type: 'quest', convertedToId: 'reclaim-erebor', text: 'Reclaim Erebor' },
    ],
  },
];

const mockUpdateQuest = jest.fn().mockResolvedValue(undefined);
const mockUpdateQuestStatus = jest.fn().mockResolvedValue(undefined);
const mockUpdateQuestObjective = jest.fn().mockResolvedValue(undefined);
const mockAddQuestObjective = jest.fn().mockResolvedValue(undefined);
const mockEditQuestObjective = jest.fn().mockResolvedValue(undefined);
const mockMoveQuestObjective = jest.fn().mockResolvedValue(undefined);
const mockMarkQuestCompleted = jest.fn().mockResolvedValue(undefined);
const mockDeleteQuest = jest.fn().mockResolvedValue(undefined);
const mockRefreshQuests = jest.fn().mockResolvedValue(undefined);
const mockCreateLocation = jest.fn().mockResolvedValue('secret-door');

jest.mock('features/campaign-entities', () => {
  const actualPresentation = jest.requireActual(
    'features/campaign-entities/quests/utils/quest-presentation'
  );
  const actualDisplay = jest.requireActual(
    'features/campaign-entities/locations/utils/location-display'
  );
  return {
    useQuests: () => ({
      quests: mockQuests,
      isLoading: false,
      error: null,
      refreshQuests: mockRefreshQuests,
      updateQuest: mockUpdateQuest,
      updateQuestStatus: mockUpdateQuestStatus,
      updateQuestObjective: mockUpdateQuestObjective,
      addQuestObjective: mockAddQuestObjective,
      editQuestObjective: mockEditQuestObjective,
      moveQuestObjective: mockMoveQuestObjective,
      markQuestCompleted: mockMarkQuestCompleted,
      deleteQuest: mockDeleteQuest,
    }),
    useNPCs: () => ({ npcs: mockNPCs }),
    useLocations: () => ({ locations: mockLocations, createLocation: mockCreateLocation }),
    useRumors: () => ({ rumors: mockRumors }),
    // The real modules, not stubs: the page's contract is that the row and the
    // page say the same things about a quest.
    ...actualPresentation,
    ...actualDisplay,
    QuestObjectives: jest.requireActual(
      'features/campaign-entities/quests/components/QuestObjectives'
    ).default,
    DeleteQuestDialog: jest.requireActual(
      'features/campaign-entities/quests/components/DeleteQuestDialog'
    ).default,
  };
});

jest.mock('features/collaboration', () => ({
  useNotes: () => ({ notes: mockNotes }),
}));

const mockNavigateToPage = jest.fn();
jest.mock('shared/context/NavigationContext', () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

jest.mock('shared/context/QuickAddContext', () => ({
  useQuickAdd: () => ({ openQuickAdd: jest.fn(), closeQuickAdd: jest.fn(), openEntity: null }),
}));

// Reaches Firebase for usernames; the page owns the label above it, not this.
jest.mock('shared/components/AttributionInfo', () => ({
  __esModule: true,
  default: ({ item }: any) => <div data-testid="attribution-info">{item?.id}</div>,
}));

jest.mock(
  'lucide-react',
  () =>
    new Proxy(
      { __esModule: true },
      {
        get: (target: any, prop: string) => (prop in target ? target[prop] : () => null),
      }
    )
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const renderPage = () =>
  render(
    <MemoryRouter>
      <QuestDetailPage />
    </MemoryRouter>
  );

/** The card with this heading. */
const section = (title: string) =>
  screen.getByText(title).closest('section') as HTMLElement;

beforeEach(() => {
  jest.clearAllMocks();
  mockQuestId = 'reclaim-erebor';
  mockRouterState = null;
  mockQuests = [QUEST];
  mockUser = { uid: 'user-1' };
  mockActiveGroupId = 'group-1';
  mockActiveCampaignId = 'campaign-1';
  mockUpdateQuest.mockResolvedValue(undefined);
  mockUpdateQuestObjective.mockResolvedValue(undefined);
  mockAddQuestObjective.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// The record, named
// ---------------------------------------------------------------------------
describe('the band', () => {
  it('names the quest as the page’s only h1', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Reclaim Erebor' })
    ).toBeInTheDocument();
  });

  it('leads back to the directory', () => {
    renderPage();
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(trail).getByText('Quests')).toHaveAttribute('href', '/quests');
  });

  it('states progress, place and level in one line, with no id in it', () => {
    // Item 10: the quest card printed `bag-end` and `erebor` as though they
    // were labels. `erebor` resolves to "Erebor" or it is left out.
    renderPage();
    const band = screen
      .getByRole('heading', { level: 1, name: 'Reclaim Erebor' })
      .closest('.hero-band') as HTMLElement;
    expect(within(band).getByText('1 of 3 objectives · Erebor · levels 7-9')).toBeInTheDocument();
    expect(within(band).queryByText(/reclaim-erebor/)).not.toBeInTheDocument();
  });

  it('shows an unresolvable reference as broken rather than as a place name', () => {
    // #1412 says a dangling reference stays visible as itself; this PR's gate
    // says no id is rendered as a label. Both: it is shown, and it is marked.
    mockQuests = [{ ...QUEST, locationId: 'nowhere', location: '' }];
    renderPage();
    expect(
      screen.getByText('1 of 3 objectives · nowhere — no such place · levels 7-9')
    ).toBeInTheDocument();
  });

  it('changes the status from the band, in one click', async () => {
    renderPage();
    const ladder = screen.getByRole('group', { name: 'Status of Reclaim Erebor' });
    fireEvent.click(within(ladder).getByRole('button', { name: 'Failed' }));
    await waitFor(() =>
      expect(mockUpdateQuestStatus).toHaveBeenCalledWith('reclaim-erebor', 'failed')
    );
  });

  it('offers Mark completed while the quest is open, and not once it is settled', () => {
    const { unmount } = renderPage();
    expect(screen.getByRole('button', { name: 'Mark completed' })).toBeInTheDocument();
    unmount();

    mockQuests = [{ ...QUEST, status: 'completed' }];
    renderPage();
    expect(screen.queryByRole('button', { name: 'Mark completed' })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Objectives — the spine
// ---------------------------------------------------------------------------
describe('objectives', () => {
  it('ticks an objective through the same write the row uses', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enter the mountain undetected' }));
    await waitFor(() =>
      expect(mockUpdateQuestObjective).toHaveBeenCalledWith('reclaim-erebor', 'obj-2', true)
    );
  });

  it('reverts visibly and says why when the tick is refused', async () => {
    mockUpdateQuestObjective.mockRejectedValueOnce(new Error('Permission denied'));
    renderPage();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enter the mountain undetected' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Permission denied')
    );
    expect(
      screen.getByRole('checkbox', { name: 'Enter the mountain undetected' })
    ).not.toBeChecked();
  });

  it('keeps a ticked objective struck through and in its place', () => {
    renderPage();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes[0]).toBeChecked();
    expect(boxes[0]).toHaveAccessibleName('Find the secret door');
  });

  it('adds an objective to the end of the list', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Add objective' }));
    fireEvent.change(screen.getByLabelText('Add an objective'), {
      target: { value: 'Recover the Arkenstone' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add objective', hidden: false }));

    await waitFor(() =>
      expect(mockAddQuestObjective).toHaveBeenCalledWith('reclaim-erebor', 'Recover the Arkenstone')
    );
  });

  it('rewords an objective in place', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Reword Find the secret door' }));
    fireEvent.change(screen.getByLabelText('Objective'), {
      target: { value: 'Find the secret door mentioned in the map' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save objective' }));

    await waitFor(() =>
      expect(mockEditQuestObjective).toHaveBeenCalledWith(
        'reclaim-erebor',
        'obj-1',
        'Find the secret door mentioned in the map'
      )
    );
  });

  it('moves one objective up or down, naming which', async () => {
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Move Enter the mountain undetected up' })
    );
    await waitFor(() =>
      expect(mockMoveQuestObjective).toHaveBeenCalledWith('reclaim-erebor', 'obj-2', 'up')
    );
  });

  it('cannot move the first objective up or the last one down', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Move Find the secret door up' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: "Move Scout the dragon's hoard down" })
    ).toBeDisabled();
  });

  it('offers completion when every objective is ticked, and does not take it', () => {
    // The gate: completing the last objective does not silently complete the
    // quest. The question appears; the status has not moved.
    mockQuests = [
      { ...QUEST, objectives: QUEST.objectives.map((o) => ({ ...o, completed: true })) },
    ];
    renderPage();

    expect(screen.getByText('Every objective is ticked. Is the quest finished?')).toBeInTheDocument();
    expect(mockUpdateQuestStatus).not.toHaveBeenCalled();
    expect(mockMarkQuestCompleted).not.toHaveBeenCalled();
  });

  it('completes the quest only when the offer is accepted', async () => {
    mockQuests = [
      { ...QUEST, objectives: QUEST.objectives.map((o) => ({ ...o, completed: true })) },
    ];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Mark the quest completed' }));
    await waitFor(() => expect(mockMarkQuestCompleted).toHaveBeenCalledWith('reclaim-erebor'));
  });

  it('does not keep asking once the quest has concluded', () => {
    mockQuests = [
      {
        ...QUEST,
        status: 'completed',
        objectives: QUEST.objectives.map((o) => ({ ...o, completed: true })),
      },
    ];
    renderPage();
    expect(
      screen.queryByText('Every objective is ticked. Is the quest finished?')
    ).not.toBeInTheDocument();
  });

  it('does not offer completion for a quest that has no objectives at all', () => {
    mockQuests = [NEW_QUEST];
    mockQuestId = 'new-quest';
    renderPage();
    expect(
      screen.queryByText('Every objective is ticked. Is the quest finished?')
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// One relation list (D15.7)
// ---------------------------------------------------------------------------
describe('who is in it', () => {
  it('names each person once, with the line that tells two of them apart', () => {
    renderPage();
    const who = section('Who is in it');
    expect(within(who).getAllByText('Thorin Oakenshield')).toHaveLength(1);
    expect(within(who).getByText('King under the Mountain · Erebor')).toBeInTheDocument();
    expect(within(who).getAllByText('Smaug')).toHaveLength(1);
  });

  it('opens a person’s own page', () => {
    renderPage();
    fireEvent.click(within(section('Who is in it')).getByText('Thorin Oakenshield'));
    expect(mockNavigateToPage).toHaveBeenCalledWith('/npcs/thorin');
  });

  it('says so when a reference no longer resolves, instead of printing the id', () => {
    mockQuests = [{ ...QUEST, relatedNPCIds: ['thorin', 'gone'] }];
    renderPage();
    const who = section('Who is in it');
    expect(within(who).getByText('Someone no longer in the directory')).toBeInTheDocument();
    expect(within(who).queryByText('gone')).not.toBeInTheDocument();
  });

  it('detaches a person from the quest', async () => {
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Smaug from Reclaim Erebor' })
    );
    await waitFor(() =>
      expect(mockUpdateQuest).toHaveBeenCalledWith(
        expect.objectContaining({ relatedNPCIds: ['thorin'] })
      )
    );
  });
});

// ---------------------------------------------------------------------------
// What points here — derived, read-only
// ---------------------------------------------------------------------------
describe('what points here', () => {
  it('lists the rumour it came from, the location that references it and the note that mentions it', () => {
    renderPage();
    const points = section('What points here');
    expect(within(points).getByText("Signs of Smaug's activity")).toBeInTheDocument();
    expect(within(points).getByText('Erebor')).toBeInTheDocument();
    expect(within(points).getByText('Session 14 notes')).toBeInTheDocument();
  });

  it('says "disproved" rather than "false" (§10)', () => {
    mockRumors = [{ ...mockRumors[0], status: 'false' }];
    renderPage();
    expect(
      within(section('What points here')).getByText(/rumour, disproved/)
    ).toBeInTheDocument();
    mockRumors = [
      { id: 'r-1', title: "Signs of Smaug's activity", status: 'confirmed', convertedToQuestId: 'reclaim-erebor' },
    ];
  });

  it('offers nothing editable — these belong to the records that wrote them', () => {
    renderPage();
    const points = section('What points here');
    expect(within(points).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(points).getByText(/Derived, not authored/)).toBeInTheDocument();
  });

  it('never claims a note points here just because the title appears in it', () => {
    mockNotes = [
      { id: 'note-99', title: 'Reclaim Erebor thoughts', extractedEntities: [] },
    ];
    renderPage();
    expect(
      within(section('What points here')).queryByText('Reclaim Erebor thoughts')
    ).not.toBeInTheDocument();
    mockNotes = [
      {
        id: 'note-14',
        title: 'Session 14 notes',
        extractedEntities: [
          { id: 'e-1', type: 'quest', convertedToId: 'reclaim-erebor', text: 'Reclaim Erebor' },
        ],
      },
    ];
  });
});

// ---------------------------------------------------------------------------
// Prep, in full and not behind a reveal
// ---------------------------------------------------------------------------
describe('the prep material', () => {
  it('shows background, leads, complications, rewards and the level range on the page', () => {
    renderPage();
    expect(screen.getByText('The company has reached the Lonely Mountain.')).toBeInTheDocument();
    expect(screen.getByText('The door can only be opened on Durin’s Day')).toBeInTheDocument();
    expect(screen.getByText("Thorin's growing obsession with the Arkenstone")).toBeInTheDocument();
    expect(screen.getByText('Access to Erebor')).toBeInTheDocument();
    expect(screen.getByText('Levels 7-9')).toBeInTheDocument();
  });

  it('hides none of it behind a disclosure', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /^Prep/ })).not.toBeInTheDocument();
  });

  it('adds a lead in place', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add another lead/ }));
    fireEvent.change(screen.getByLabelText('Leads'), { target: { value: 'Ask Balin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to leads' }));

    await waitFor(() =>
      expect(mockUpdateQuest).toHaveBeenCalledWith(
        expect.objectContaining({
          leads: ['The door can only be opened on Durin’s Day', 'Ask Balin'],
        })
      )
    );
  });

  it('keeps the typed text when a write is refused, and says why', async () => {
    mockUpdateQuest.mockRejectedValueOnce(new Error('Permission denied'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add another lead/ }));
    fireEvent.change(screen.getByLabelText('Leads'), { target: { value: 'Ask Balin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to leads' }));

    await waitFor(() => expect(screen.getByText(/Permission denied/)).toBeInTheDocument());
    expect(screen.getByLabelText('Leads')).toHaveValue('Ask Balin');
  });
});

// ---------------------------------------------------------------------------
// Places inside this quest stay free text (§6.4)
// ---------------------------------------------------------------------------
describe('places inside this quest', () => {
  it('lists them as prep notes, not as records', () => {
    renderPage();
    const places = section('Places inside this quest');
    expect(within(places).getByText('Secret door')).toBeInTheDocument();
    expect(within(places).getByText('Hidden entrance on the western side')).toBeInTheDocument();
  });

  it('promotes one into a real location, inside the quest’s own location', async () => {
    renderPage();
    fireEvent.click(
      within(section('Places inside this quest')).getByRole('button', {
        name: 'Make it a location',
      })
    );

    await waitFor(() =>
      expect(mockCreateLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Secret door',
          parentId: 'erebor',
          relatedQuests: ['reclaim-erebor'],
        })
      )
    );
    await waitFor(() => expect(mockNavigateToPage).toHaveBeenCalledWith('/locations/secret-door'));
  });
});

// ---------------------------------------------------------------------------
// Editing in place (§7)
// ---------------------------------------------------------------------------
describe('editing in place', () => {
  it('renames the quest', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Rename/ }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Retake Erebor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save title' }));

    await waitFor(() =>
      expect(mockUpdateQuest).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Retake Erebor' })
      )
    );
  });

  it('edits the description where it is read', async () => {
    renderPage();
    fireEvent.click(screen.getByText(QUEST.description));
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Take back the mountain.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save description' }));

    await waitFor(() =>
      expect(mockUpdateQuest).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Take back the mountain.' })
      )
    );
  });

  it('offers no link to the edit form', () => {
    // §7: this is where a quest is changed. `/quests/edit/:id` is `15-8`'s to
    // retire; nothing here sends anyone to it.
    renderPage();
    expect(screen.queryByRole('button', { name: /^Edit$/ })).not.toBeInTheDocument();
    expect(mockNavigateToPage).not.toHaveBeenCalledWith('/quests/edit/reclaim-erebor');
  });
});

// ---------------------------------------------------------------------------
// A quest with nothing written looks new, not broken
// ---------------------------------------------------------------------------
describe('a quest that is only a title and a line', () => {
  beforeEach(() => {
    mockQuests = [NEW_QUEST];
    mockQuestId = 'new-quest';
  });

  it('asks questions rather than showing empty boxes', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /What did the party agree to do\?/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /How did this come about\?/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Where does the party start looking\?/ })
    ).toBeInTheDocument();
  });

  it('opens the objective composer when quick add says that is the first unwritten field', () => {
    mockRouterState = { quickAddFocus: 'objectives' };
    renderPage();
    expect(screen.getByLabelText('Add an objective')).toBeInTheDocument();
  });

  it('does not hijack the page when the record already has objectives', () => {
    mockQuests = [QUEST];
    mockQuestId = 'reclaim-erebor';
    mockRouterState = { quickAddFocus: 'objectives' };
    renderPage();
    expect(screen.queryByLabelText('Add an objective')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// The record, and deleting it
// ---------------------------------------------------------------------------
describe('the record card', () => {
  it('states created-by and last-modified-by, and no per-objective history', () => {
    renderPage();
    const record = section('Written here');
    expect(within(record).getByTestId('attribution-info')).toBeInTheDocument();
    // `S3` draws "gandlaf ticked 'Find the secret door' · last session" under
    // the two attribution lines. There is no such data (§8, T005), so the
    // record card holds the two facts and nothing else.
    expect(within(record).queryByText(/ticked/)).not.toBeInTheDocument();
    expect(screen.queryByText(/last session/)).not.toBeInTheDocument();
    expect(screen.queryByText(/gandlaf ticked/)).not.toBeInTheDocument();
  });

  it('names what else loses a link before deleting', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Delete quest' }));

    const losses = within(screen.getByRole('dialog')).getByRole('list');
    expect(within(losses).getByText(/Signs of Smaug's activity/)).toBeInTheDocument();
    expect(within(losses).getByText(/Erebor — location, points at this quest/)).toBeInTheDocument();
    expect(within(losses).getByText(/2 people are attached to it/)).toBeInTheDocument();
    expect(mockDeleteQuest).not.toHaveBeenCalled();
  });

  it('deletes and returns to the directory once confirmed', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Delete quest' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Reclaim Erebor' }));

    await waitFor(() => expect(mockDeleteQuest).toHaveBeenCalledWith('reclaim-erebor'));
    await waitFor(() => expect(mockNavigateToPage).toHaveBeenCalledWith('/quests'));
  });

  it('stays open and says why when the delete is refused', async () => {
    mockDeleteQuest.mockRejectedValueOnce(new Error('Permission denied'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Delete quest' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete Reclaim Erebor' })
    );

    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
        'Permission denied'
      )
    );
    expect(mockNavigateToPage).not.toHaveBeenCalledWith('/quests');
  });
});

// ---------------------------------------------------------------------------
// A bad id, and a reader who cannot write
// ---------------------------------------------------------------------------
describe('states other than ready', () => {
  it('says so, and offers a way onward, when the id names nothing', () => {
    mockQuestId = 'no-such-quest';
    renderPage();
    expect(screen.getByText('No quest with that id')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Quests' }));
    expect(mockNavigateToPage).toHaveBeenCalledWith('/quests');
  });

  it('shows a signed-out reader the gate rather than the record', () => {
    mockUser = null;
    renderPage();
    expect(screen.queryByRole('heading', { level: 1, name: 'Reclaim Erebor' })).not.toBeInTheDocument();
  });
});
