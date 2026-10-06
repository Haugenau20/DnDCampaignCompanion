// src/features/campaign-entities/locations/components/__tests__/DeleteLocationsDialog.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DeleteLocationsDialog from '../DeleteLocationsDialog';
import { BatchDeletePlan } from '../../utils/batch-delete';

/**
 * T017: deleting several places asks once what happens to what is inside them
 * (decided 2026-10-06), and says how many places each answer removes.
 */

const plan = (overrides: Partial<BatchDeletePlan> = {}): BatchDeletePlan => ({
  inside: 5,
  movedUp: 2,
  removed: { 'delete-subtree': 8, 'promote-to-grandparent': 3 },
  order: { 'delete-subtree': [], 'promote-to-grandparent': [] },
  ...overrides,
});

const onConfirm = jest.fn();
const onClose = jest.fn();

const open = (p: BatchDeletePlan = plan(), count = 3) =>
  render(<DeleteLocationsDialog isOpen onClose={onClose} count={count} plan={p} onConfirm={onConfirm} />);

beforeEach(() => {
  jest.clearAllMocks();
  onConfirm.mockResolvedValue(undefined);
});

it('names the selection and what it holds', () => {
  open();
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Delete 3 places?')).toBeInTheDocument();
  expect(within(dialog).getByText(/3 places are removed for everyone, and they hold 5 more/)).toBeInTheDocument();
});

it('keeps what is inside by default, and says the total either way', () => {
  open();
  expect(screen.getByRole('radio', { name: /Keep them/ })).toBeChecked();
  expect(screen.getByRole('button', { name: 'Delete 3 places' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('radio', { name: /Delete them too — 8 places in all/ }));
  expect(screen.getByRole('button', { name: 'Delete 8 places' })).toBeInTheDocument();
});

it('confirms with the answer chosen, then closes', async () => {
  open();
  fireEvent.click(screen.getByRole('radio', { name: /Delete them too/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete 8 places' }));

  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('delete-subtree'));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

it('asks nothing when no ticked place holds anything', async () => {
  open(plan({ inside: 0, movedUp: 0, removed: { 'delete-subtree': 2, 'promote-to-grandparent': 2 } }), 2);

  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.getByText(/2 places are removed for everyone\./)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delete 2 places' }));
  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('delete-subtree'));
});

it('speaks of one place in the singular', () => {
  open(plan({ inside: 1, movedUp: 1, removed: { 'delete-subtree': 2, 'promote-to-grandparent': 1 } }), 1);

  expect(screen.getByText('Delete 1 place?')).toBeInTheDocument();
  expect(screen.getByText(/1 place is removed for everyone, and it holds 1 more/)).toBeInTheDocument();
});

it('stays open and says why when the delete fails', async () => {
  onConfirm.mockRejectedValue(new Error('Missing or insufficient permissions.'));
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Delete 3 places' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Missing or insufficient permissions.');
  expect(onClose).not.toHaveBeenCalled();
});
