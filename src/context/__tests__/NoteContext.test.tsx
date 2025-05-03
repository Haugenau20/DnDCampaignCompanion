// src/context/__tests__/NoteContext.test.tsx
import React from 'react';
import { render, act } from '@testing-library/react';
import { NoteProvider, useNotes } from '../NoteContext';
import { SessionNote } from '../../types/note';

// Mock dependencies
jest.mock('../../hooks/useFirebaseData', () => ({
  useFirebaseData: () => ({
    data: mockNotes,
    loading: false,
    error: null,
    getData: jest.fn(),
    addData: jest.fn(),
    updateData: jest.fn(),
    deleteData: jest.fn()
  })
}));

jest.mock('../firebase', () => ({
  useAuth: () => ({ user: { uid: 'test-user', email: 'test@example.com' } }),
  useGroups: () => ({ activeGroupId: 'test-group' }),
  useCampaigns: () => ({ activeCampaignId: 'test-campaign' })
}));

// Mock data
const mockNotes: SessionNote[] = [
  {
    id: 'test-note-1',
    sessionNumber: 1,
    sessionDate: '2025-05-03T19:00:00Z',
    title: 'Test Session 1',
    content: 'Test content for session 1',
    attendingPlayers: ['player1', 'player2'],
    extractedEntities: [],
    status: 'active',
    tags: ['test', 'session'],
    createdBy: 'user1',
    createdByUsername: 'User 1',
    dateAdded: '2025-05-03',
    modifiedBy: 'user1',
    modifiedByUsername: 'User 1',
    dateModified: '2025-05-03'
  },
  {
    id: 'test-note-2',
    sessionNumber: 2,
    sessionDate: '2025-05-10T19:00:00Z',
    title: 'Test Session 2',
    content: 'Test content for session 2',
    attendingPlayers: ['player1', 'player3'],
    extractedEntities: [],
    status: 'completed',
    tags: ['test', 'session'],
    createdBy: 'user1',
    createdByUsername: 'User 1',
    dateAdded: '2025-05-10',
    modifiedBy: 'user1',
    modifiedByUsername: 'User 1',
    dateModified: '2025-05-10'
  }
];

describe('NoteContext', () => {
  // Test component that uses the context
  const TestComponent = () => {
    const { notes, getNoteById, getActiveNote } = useNotes();
    return (
      <div>
        <div data-testid="note-count">{notes.length}</div>
        <div data-testid="note-title">{getNoteById('test-note-1')?.title}</div>
        <div data-testid="active-note">{getActiveNote()?.title}</div>
      </div>
    );
  };

  it('provides note data to children', () => {
    const { getByTestId } = render(
      <NoteProvider>
        <TestComponent />
      </NoteProvider>
    );

    expect(getByTestId('note-count').textContent).toBe('2');
    expect(getByTestId('note-title').textContent).toBe('Test Session 1');
    expect(getByTestId('active-note').textContent).toBe('Test Session 1');
  });

  it('provides utility functions that work correctly', () => {
    let contextValue: any;
    
    const GrabContext = () => {
      contextValue = useNotes();
      return null;
    };

    render(
      <NoteProvider>
        <GrabContext />
      </NoteProvider>
    );

    expect(contextValue.getNoteById('test-note-1')).toEqual(mockNotes[0]);
    expect(contextValue.getNotesBySession(2)).toEqual([mockNotes[1]]);
    expect(contextValue.getActiveNote()).toEqual(mockNotes[0]);
  });
});