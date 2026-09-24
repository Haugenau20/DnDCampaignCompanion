// src/pages/layouts/dashboard/sections/__tests__/PartyCrest.test.tsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import PartyCrest from '../PartyCrest';

/**
 * T021: the party's crest -- shown to every member, changed by admins only.
 * The upload/save/delete ordering is useImageAttachment's own suite.
 */

const { firebaseConfig } = jest.requireActual('core/services/firebase/config/firebaseConfig');
const crest = {
  path: 'groups/g1/crest/a.webp',
  url: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/a.webp?alt=media&token=t`,
  width: 800,
  height: 800,
  uploadedBy: 'u1',
  uploadedAt: '2026-09-24T12:00:00.000Z',
};

let mockIsAdmin = false;
let mockGroup: any = { id: 'g1', name: 'The Fellowship' };
const mockSetGroupCrest = jest.fn();

jest.mock('features/user-management', () => ({
  useGroups: () => ({
    activeGroup: mockGroup,
    activeGroupId: mockGroup?.id ?? null,
    isAdmin: mockIsAdmin,
    setGroupCrest: mockSetGroupCrest,
  }),
  useCampaigns: () => ({ activeCampaignId: null, campaigns: [] }),
}));

let mockImageOptions: any = null;
jest.mock('shared/hooks/useImageAttachment', () => ({
  useImageAttachment: (options: any) => {
    mockImageOptions = options;
    return { upload: jest.fn(), remove: jest.fn() };
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAdmin = false;
  mockGroup = { id: 'g1', name: 'The Fellowship' };
  mockSetGroupCrest.mockResolvedValue(undefined);
});

describe('PartyCrest', () => {
  it('keeps the honest empty slot when there is no crest', () => {
    render(<PartyCrest />);
    expect(screen.getByRole('img', { name: 'The Fellowship crest — none uploaded yet' })).toBeInTheDocument();
  });

  it('shows the crest to every member', () => {
    mockGroup = { ...mockGroup, crest };
    render(<PartyCrest />);
    expect(screen.getByRole('img', { name: 'The Fellowship crest' })).toHaveAttribute('src', crest.url);
  });

  it('offers a plain member no way to change it', () => {
    mockGroup = { ...mockGroup, crest };
    render(<PartyCrest />);
    expect(screen.queryByRole('button', { name: /crest/ })).toBeNull();
  });

  it('offers an admin add, then replace and remove', () => {
    mockIsAdmin = true;
    const { rerender } = render(<PartyCrest />);
    expect(screen.getByRole('button', { name: 'Add crest' })).toBeInTheDocument();

    mockGroup = { ...mockGroup, crest };
    rerender(<PartyCrest />);
    expect(screen.getByRole('button', { name: 'Replace crest' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove crest' })).toBeInTheDocument();
  });

  it('files the crest under the group, and records it through setGroupCrest', async () => {
    mockIsAdmin = true;
    mockGroup = { ...mockGroup, crest };
    render(<PartyCrest />);

    expect(mockImageOptions.prefix).toBe('groups/g1/crest');
    expect(mockImageOptions.current).toEqual(crest);

    await act(() => mockImageOptions.save(null));
    expect(mockSetGroupCrest).toHaveBeenCalledWith(null);
  });
});
