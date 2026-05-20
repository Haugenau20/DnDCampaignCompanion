// src/components/features/rumors/__tests__/CombineRumorsDialog.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CombineRumorsDialog from '../CombineRumorsDialog';
import { Rumor } from '../../../../types/rumor';

// ---------------------------------------------------------------------------
// Mock Dialog to render children inline (bug #150)
// ---------------------------------------------------------------------------
jest.mock('../../../core/Dialog', () => ({
  __esModule: true,
  default: ({ open, title, children }: any) =>
    open ? (
      <div data-testid="dialog">
        {title && <h3>{title}</h3>}
        {children}
      </div>
    ) : null,
}));

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------
function makeRumor(id: string, overrides: Partial<Rumor> = {}): Rumor {
  return {
    id,
    title: `Rumor ${id}`,
    content: `content-${id}`,
    status: 'unconfirmed',
    sourceType: 'tavern',
    sourceName: `Source-${id}`,
    location: '',
    locationId: '',
    sourceNpcId: '',
    relatedNPCs: [],
    relatedLocations: [],
    notes: [],
    createdBy: 'u1',
    createdByUsername: 'u',
    dateAdded: '2024-01-15T10:00:00.000Z',
    modifiedBy: 'u1',
    modifiedByUsername: 'u',
    dateModified: '2024-01-15T10:00:00.000Z',
    ...overrides,
  } as Rumor;
}

describe('CombineRumorsDialog', () => {
  describe('rendering', () => {
    test('should not render when open=false', () => {
      render(
        <CombineRumorsDialog
          open={false}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    test('should render with title "Combine Rumors"', () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      expect(screen.getByRole('heading', { name: 'Combine Rumors' })).toBeInTheDocument();
    });

    test('should render each selected rumor title', () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      expect(screen.getByText('Rumor r1')).toBeInTheDocument();
      expect(screen.getByText('Rumor r2')).toBeInTheDocument();
    });

    test('should render the source name for each selected rumor', () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1']}
          rumors={[makeRumor('r1')]}
          onCombine={jest.fn()}
        />,
      );
      expect(screen.getByText(/Source: Source-r1/)).toBeInTheDocument();
    });

    test('should render Cancel and Combine Rumors buttons', () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Combine Rumors/ })).toBeInTheDocument();
    });
  });

  describe('pre-populated form', () => {
    test('should generate a default title containing "Combined Rumor"', () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      const titleInput = screen.getByDisplayValue(/Combined Rumor/i);
      expect(titleInput).toBeInTheDocument();
    });

    test('should combine all rumor contents into the content field', () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[
            makeRumor('r1', { content: 'aaa' }),
            makeRumor('r2', { content: 'bbb' }),
          ]}
          onCombine={jest.fn()}
        />,
      );
      const contentInput = screen.getByDisplayValue(/aaa/);
      expect(contentInput).toBeInTheDocument();
      expect((contentInput as HTMLTextAreaElement).value).toContain('bbb');
    });

    test('should default status to unconfirmed', () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      const statusSelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(statusSelect.value).toBe('unconfirmed');
    });

    test('should show the generated ID preview', () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      // ID will be slug of "Combined Rumor (date)" → starts with "combined-rumor-"
      expect(screen.getByText(/ID will be: combined-rumor-/i)).toBeInTheDocument();
    });
  });

  describe('rumor removal', () => {
    test('should allow removing rumors when more than 2 are selected', () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2', 'r3']}
          rumors={[makeRumor('r1'), makeRumor('r2'), makeRumor('r3')]}
          onCombine={jest.fn()}
        />,
      );
      // 3 selected → all X buttons enabled. Click first one.
      const removeButtons = screen
        .getAllByRole('button')
        .filter((b) => b.querySelector('svg') && !b.textContent?.match(/Cancel|Combine/));
      // First removable X is for r1
      fireEvent.click(removeButtons[0]);
      expect(screen.queryByText('Rumor r1')).not.toBeInTheDocument();
      expect(screen.getByText('Rumor r2')).toBeInTheDocument();
      expect(screen.getByText('Rumor r3')).toBeInTheDocument();
    });

    test('should disable remove buttons when exactly 2 selected', () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      const removeButtons = screen
        .getAllByRole('button')
        .filter((b) => b.querySelector('svg') && !b.textContent?.match(/Cancel|Combine/));
      removeButtons.forEach((b) => expect(b).toBeDisabled());
    });
  });

  describe('validation', () => {
    test('should show error when title is cleared and submit clicked', async () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      const titleInput = screen.getByDisplayValue(/Combined Rumor/);
      await userEvent.clear(titleInput);
      fireEvent.click(screen.getByRole('button', { name: /Combine Rumors/ }));
      await waitFor(() => {
        expect(screen.getByText('Title and content are required')).toBeInTheDocument();
      });
    });

    test('should show error when content is cleared and submit clicked', async () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1', { content: 'a' }), makeRumor('r2', { content: 'b' })]}
          onCombine={jest.fn()}
        />,
      );
      const contentInput = screen.getByDisplayValue(/Rumor r1 \(from Source-r1\): a/);
      await userEvent.clear(contentInput);
      fireEvent.click(screen.getByRole('button', { name: /Combine Rumors/ }));
      await waitFor(() => {
        expect(screen.getByText('Title and content are required')).toBeInTheDocument();
      });
    });
  });

  describe('submit', () => {
    test('should call onCombine with rumor IDs and form data', async () => {
      const onCombine = jest.fn().mockResolvedValue('new-id');
      const onClose = jest.fn();
      render(
        <CombineRumorsDialog
          open={true}
          onClose={onClose}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={onCombine}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Combine Rumors/ }));
      await waitFor(() => {
        expect(onCombine).toHaveBeenCalledTimes(1);
      });
      const [ids, body] = onCombine.mock.calls[0];
      expect(ids).toEqual(['r1', 'r2']);
      expect(body).toHaveProperty('title');
      expect(body).toHaveProperty('content');
      expect(body).toHaveProperty('status', 'unconfirmed');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('should display error message when onCombine throws', async () => {
      const onCombine = jest.fn().mockRejectedValueOnce(new Error('bad combine'));
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={onCombine}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Combine Rumors/ }));
      await waitFor(() => {
        expect(screen.getByText('bad combine')).toBeInTheDocument();
      });
    });

    test('should call onClose when Cancel clicked', () => {
      const onClose = jest.fn();
      render(
        <CombineRumorsDialog
          open={true}
          onClose={onClose}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ID generation', () => {
    test('should generate URL-safe slugs from title input', async () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      const titleInput = screen.getByDisplayValue(/Combined Rumor/);
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Hello World!!');
      expect(screen.getByText('ID will be: hello-world')).toBeInTheDocument();
    });

    test('should strip leading/trailing hyphens from generated ID', async () => {
      render(
        <CombineRumorsDialog
          open={true}
          onClose={jest.fn()}
          rumorIds={['r1', 'r2']}
          rumors={[makeRumor('r1'), makeRumor('r2')]}
          onCombine={jest.fn()}
        />,
      );
      const titleInput = screen.getByDisplayValue(/Combined Rumor/);
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, '   spaces around   ');
      expect(screen.getByText('ID will be: spaces-around')).toBeInTheDocument();
    });
  });
});
