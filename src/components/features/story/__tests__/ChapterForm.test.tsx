// src/components/features/story/__tests__/ChapterForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChapterForm from '../ChapterForm';
import { Chapter } from '../../../../types/story';

// ---------------------------------------------------------------------------
// Mock contexts
// ---------------------------------------------------------------------------

const mockNavigateToPage = jest.fn();
const mockCreateChapter = jest.fn();
const mockUpdateChapter = jest.fn();

jest.mock('../../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../context/StoryContext', () => ({
  useStory: jest.fn(),
}));

jest.mock('../../../../context/firebase', () => ({
  useAuth: jest.fn(),
}));

const { useNavigation } = require('../../../../context/NavigationContext');
const { useStory } = require('../../../../context/StoryContext');
const { useAuth } = require('../../../../context/firebase');

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'ch-1',
    title: 'The Beginning',
    content: 'Once upon a time in a faraway land...',
    order: 1,
    summary: 'A brief summary',
    createdBy: 'user-1',
    createdByUsername: 'Author',
    dateAdded: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function setupMocks({
  chapters = [] as Chapter[],
  user = { uid: 'user-1', displayName: 'Test User' } as any,
  createChapter = mockCreateChapter,
  updateChapter = mockUpdateChapter,
}: {
  chapters?: Chapter[];
  user?: any;
  createChapter?: jest.Mock;
  updateChapter?: jest.Mock;
} = {}) {
  (useNavigation as jest.Mock).mockReturnValue({ navigateToPage: mockNavigateToPage });
  (useStory as jest.Mock).mockReturnValue({ createChapter, updateChapter, chapters });
  (useAuth as jest.Mock).mockReturnValue({ user });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChapterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockCreateChapter.mockResolvedValue('new-chapter-id');
    mockUpdateChapter.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Rendering — create mode
  // -------------------------------------------------------------------------
  describe('rendering — create mode', () => {
    test('renders "Create Chapter" heading', () => {
      render(<ChapterForm mode="create" />);
      expect(screen.getByRole('heading', { name: 'Create Chapter' })).toBeInTheDocument();
    });

    test('renders "Create a new chapter" subtitle', () => {
      render(<ChapterForm mode="create" />);
      expect(screen.getByText('Create a new chapter')).toBeInTheDocument();
    });

    test('renders "Create Chapter" submit button', () => {
      render(<ChapterForm mode="create" />);
      expect(screen.getByRole('button', { name: /Create Chapter/i })).toBeInTheDocument();
    });

    test('renders Cancel button', () => {
      render(<ChapterForm mode="create" />);
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    test('does NOT render Delete button in create mode', () => {
      render(<ChapterForm mode="create" onDeleteClick={jest.fn()} />);
      expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
    });

    test('sets default order to 1 when no existing chapters', () => {
      render(<ChapterForm mode="create" />);
      const orderInput = screen.getByDisplayValue('1');
      expect(orderInput).toBeInTheDocument();
    });

    test('sets default order to max+1 when existing chapters are present', () => {
      setupMocks({
        chapters: [
          makeChapter({ order: 3 }),
          makeChapter({ order: 1, id: 'ch-a' }),
          makeChapter({ order: 2, id: 'ch-b' }),
        ],
      });
      render(<ChapterForm mode="create" />);
      expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering — edit mode
  // -------------------------------------------------------------------------
  describe('rendering — edit mode', () => {
    test('renders "Edit Chapter" heading', () => {
      render(<ChapterForm mode="edit" chapter={makeChapter()} />);
      expect(screen.getByText('Edit Chapter')).toBeInTheDocument();
    });

    test('renders editing subtitle with order and title', () => {
      render(<ChapterForm mode="edit" chapter={makeChapter({ order: 2, title: 'Dark Times' })} />);
      expect(screen.getByText(/Editing Chapter 2: Dark Times/)).toBeInTheDocument();
    });

    test('pre-fills title field from chapter prop', () => {
      render(<ChapterForm mode="edit" chapter={makeChapter({ title: 'My Title' })} />);
      expect(screen.getByDisplayValue('My Title')).toBeInTheDocument();
    });

    test('pre-fills content field from chapter prop', () => {
      render(<ChapterForm mode="edit" chapter={makeChapter({ content: 'My Content' })} />);
      expect(screen.getByDisplayValue('My Content')).toBeInTheDocument();
    });

    test('pre-fills summary field from chapter prop', () => {
      render(
        <ChapterForm mode="edit" chapter={makeChapter({ summary: 'My Summary' })} />
      );
      expect(screen.getByDisplayValue('My Summary')).toBeInTheDocument();
    });

    test('pre-fills order field from chapter prop', () => {
      render(<ChapterForm mode="edit" chapter={makeChapter({ order: 5 })} />);
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    test('renders "Save Changes" button in edit mode', () => {
      render(<ChapterForm mode="edit" chapter={makeChapter()} />);
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });

    test('renders Delete button when onDeleteClick provided in edit mode', () => {
      render(
        <ChapterForm mode="edit" chapter={makeChapter()} onDeleteClick={jest.fn()} />
      );
      expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    });

    test('does NOT render Delete button when onDeleteClick is not provided in edit mode', () => {
      render(<ChapterForm mode="edit" chapter={makeChapter()} />);
      expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Cancel navigation
  // -------------------------------------------------------------------------
  describe('cancel navigation', () => {
    test('clicking Cancel calls navigateToPage with chapter detail path in edit mode', () => {
      render(<ChapterForm mode="edit" chapter={makeChapter({ id: 'ch-42' })} />);
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters/ch-42');
    });

    test('clicking Cancel calls navigateToPage with undefined chapter path in create mode', () => {
      render(<ChapterForm mode="create" />);
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      // chapter is undefined so chapter?.id is undefined → path is /story/chapters/undefined
      expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters/undefined');
    });
  });

  // -------------------------------------------------------------------------
  // Delete button
  // -------------------------------------------------------------------------
  describe('delete button', () => {
    test('clicking Delete calls onDeleteClick callback', () => {
      const onDeleteClick = jest.fn();
      render(
        <ChapterForm
          mode="edit"
          chapter={makeChapter()}
          onDeleteClick={onDeleteClick}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
      expect(onDeleteClick).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  describe('validation', () => {
    test('shows error when title is empty on submit', async () => {
      render(<ChapterForm mode="create" />);
      // Leave title empty, add content
      const textareas = screen.getAllByRole('textbox');
      // content textarea
      fireEvent.change(textareas[textareas.length - 1], {
        target: { value: 'Some content here' },
      });
      fireEvent.submit(screen.getByRole('button', { name: /Create Chapter/i }).closest('form')!);
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });

    test('shows error when content is empty on submit', async () => {
      render(<ChapterForm mode="create" />);
      // Fill title, leave content empty
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'My Title' } });
      fireEvent.submit(screen.getByRole('button', { name: /Create Chapter/i }).closest('form')!);
      await waitFor(() => {
        expect(screen.getByText('Content is required')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Create flow
  // -------------------------------------------------------------------------
  describe('create flow', () => {
    test('calls createChapter with correct data on valid submit', async () => {
      render(<ChapterForm mode="create" />);
      const inputs = screen.getAllByRole('textbox');
      // Title is inputs[0], summary is inputs[1], content is inputs[2]
      fireEvent.change(inputs[0], { target: { value: 'New Chapter' } });
      fireEvent.change(inputs[2], { target: { value: 'New chapter content here' } });

      fireEvent.submit(
        screen.getByRole('button', { name: /Create Chapter/i }).closest('form')!
      );

      await waitFor(() => {
        expect(mockCreateChapter).toHaveBeenCalledTimes(1);
      });

      const payload = mockCreateChapter.mock.calls[0][0];
      expect(payload.title).toBe('New Chapter');
      expect(payload.content).toBe('New chapter content here');
      expect(payload.createdBy).toBe('user-1');
    });

    test('generates auto-summary from content when summary is empty', async () => {
      render(<ChapterForm mode="create" />);
      const inputs = screen.getAllByRole('textbox');
      const longContent = 'Word '.repeat(50).trim(); // 50 words but short chars
      fireEvent.change(inputs[0], { target: { value: 'Auto Summary Test' } });
      fireEvent.change(inputs[2], { target: { value: longContent } });

      fireEvent.submit(
        screen.getByRole('button', { name: /Create Chapter/i }).closest('form')!
      );

      await waitFor(() => expect(mockCreateChapter).toHaveBeenCalledTimes(1));
      const payload = mockCreateChapter.mock.calls[0][0];
      // summary should be auto-generated (non-empty)
      expect(payload.summary).toBeTruthy();
    });

    test('navigates back to chapters after successful create', async () => {
      render(<ChapterForm mode="create" />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'Chapter Title' } });
      fireEvent.change(inputs[2], { target: { value: 'Chapter content goes here.' } });

      fireEvent.submit(
        screen.getByRole('button', { name: /Create Chapter/i }).closest('form')!
      );

      await waitFor(() => {
        expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters');
      });
    });

    test('shows error when createChapter throws', async () => {
      mockCreateChapter.mockRejectedValueOnce(new Error('Firebase error'));
      render(<ChapterForm mode="create" />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'Title' } });
      fireEvent.change(inputs[2], { target: { value: 'Content' } });

      fireEvent.submit(
        screen.getByRole('button', { name: /Create Chapter/i }).closest('form')!
      );

      await waitFor(() => {
        expect(screen.getByText('Firebase error')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Edit flow
  // -------------------------------------------------------------------------
  describe('edit flow', () => {
    test('calls updateChapter with correct chapter id on edit submit', async () => {
      render(
        <ChapterForm
          mode="edit"
          chapter={makeChapter({ id: 'ch-99', title: 'Old Title', content: 'Old content' })}
        />
      );
      fireEvent.submit(
        screen.getByRole('button', { name: /Save Changes/i }).closest('form')!
      );

      await waitFor(() => {
        expect(mockUpdateChapter).toHaveBeenCalledTimes(1);
      });
      const [calledId] = mockUpdateChapter.mock.calls[0];
      expect(calledId).toBe('ch-99');
    });

    test('calls updateChapter with updated title', async () => {
      render(
        <ChapterForm
          mode="edit"
          chapter={makeChapter({ id: 'ch-5', title: 'Old Title', content: 'Content here' })}
        />
      );
      const titleInput = screen.getByDisplayValue('Old Title');
      fireEvent.change(titleInput, { target: { value: 'New Title' } });

      fireEvent.submit(
        screen.getByRole('button', { name: /Save Changes/i }).closest('form')!
      );

      await waitFor(() => expect(mockUpdateChapter).toHaveBeenCalledTimes(1));
      const [, updates] = mockUpdateChapter.mock.calls[0];
      expect(updates.title).toBe('New Title');
    });

    test('navigates back after successful edit', async () => {
      render(
        <ChapterForm
          mode="edit"
          chapter={makeChapter({ id: 'ch-3' })}
        />
      );
      fireEvent.submit(
        screen.getByRole('button', { name: /Save Changes/i }).closest('form')!
      );

      await waitFor(() => {
        expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Summary auto-generation logic (unit-level via form behaviour)
  // -------------------------------------------------------------------------
  describe('summary auto-generation', () => {
    test('uses provided summary over auto-generated one', async () => {
      render(<ChapterForm mode="create" />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'Title' } });
      fireEvent.change(inputs[1], { target: { value: 'My custom summary' } });
      fireEvent.change(inputs[2], { target: { value: 'Content body here for the chapter.' } });

      fireEvent.submit(
        screen.getByRole('button', { name: /Create Chapter/i }).closest('form')!
      );

      await waitFor(() => expect(mockCreateChapter).toHaveBeenCalledTimes(1));
      const payload = mockCreateChapter.mock.calls[0][0];
      expect(payload.summary).toBe('My custom summary');
    });
  });
});
