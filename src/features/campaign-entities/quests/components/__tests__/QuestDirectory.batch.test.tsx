// src/features/campaign-entities/quests/components/__tests__/QuestDirectory.batch.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import QuestDirectory from '../QuestDirectory';
import { Quest } from 'features/campaign-entities/quests/types';

/** T017: select several quests, then change their status or delete them in one go. */

const mockUpdateQuestsStatus = jest.fn();
const mockDeleteQuests = jest.fn();

jest.mock('features/user-management', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));

jest.mock('../../context/QuestContext', () => ({
  useQuests: () => ({
    updateQuest: jest.fn(),
    updateQuestObjective: jest.fn(),
    updateQuestsStatus: mockUpdateQuestsStatus,
    deleteQuests: mockDeleteQuests,
  }),
}));

jest.mock('../../../npcs/context/NPCContext', () => ({
  useNPCs: () => ({ getNPCById: jest.fn(() => undefined) }),
}));

jest.mock('../../../locations/context/LocationContext', () => ({
  useLocations: () => ({ locations: [] }),
}));

jest.mock('shared/hooks/useNavigation', () => ({
  useNavigation: () => ({
    navigateToPage: jest.fn(),
    createPath: jest.fn((path: string) => path),
    getCurrentQueryParams: jest.fn(() => ({})),
  }),
}));

function makeQuest(overrides: Partial<Quest>): Quest {
  return {
    id: 'quest',
    title: 'Test Quest',
    description: 'A test quest',
    status: 'active',
    objectives: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

const quests = [
  makeQuest({ id: 'q1', title: 'The Ring' }),
  makeQuest({ id: 'q2', title: 'The Shire' }),
  makeQuest({ id: 'q3', title: 'The Road' }),
];

const enterSelection = () => fireEvent.click(screen.getByRole('button', { name: 'Select Quests' }));
const tick = (title: string) => fireEvent.click(screen.getByRole('checkbox', { name: `Select ${title}` }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateQuestsStatus.mockResolvedValue(undefined);
  mockDeleteQuests.mockResolvedValue(undefined);
});

describe('QuestDirectory batch actions', () => {
  it('shows checkboxes only in selection mode', () => {
    render(<QuestDirectory quests={quests} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    enterSelection();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('offers every quest status once something is ticked', () => {
    render(<QuestDirectory quests={quests} />);
    enterSelection();
    tick('The Ring');

    expect(screen.getByText('1 quest selected')).toBeInTheDocument();
    for (const label of ['Mark Active', 'Mark Completed', 'Mark Failed']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('sets the status of every ticked quest in one call, then leaves selection mode', async () => {
    render(<QuestDirectory quests={quests} />);
    enterSelection();
    tick('The Ring');
    tick('The Road');

    fireEvent.click(screen.getByRole('button', { name: 'Mark Completed' }));

    await waitFor(() => expect(mockUpdateQuestsStatus).toHaveBeenCalledWith(['q1', 'q3'], 'completed'));
    expect(mockUpdateQuestsStatus).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('checkbox')).not.toBeInTheDocument());
  });

  it('deletes every ticked quest in one call, only after confirmation', async () => {
    render(<QuestDirectory quests={quests} />);
    enterSelection();
    tick('The Ring');
    tick('The Shire');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockDeleteQuests).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Delete 2 quests\?/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /delete quests/i }));

    await waitFor(() => expect(mockDeleteQuests).toHaveBeenCalledWith(['q1', 'q2']));
    expect(mockDeleteQuests).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed delete in the dialog, and the selection with it', async () => {
    mockDeleteQuests.mockRejectedValue(new Error('permission-denied'));
    render(<QuestDirectory quests={quests} />);
    enterSelection();
    tick('The Ring');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /delete quest/i }));

    expect(await within(dialog).findByText('permission-denied')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select The Ring' })).toBeChecked();
  });
});
