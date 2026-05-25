// src/components/features/layouts/common/hooks/__tests__/useCampaignInfo.test.ts
import { renderHook } from '@testing-library/react';
import { useCampaignInfo } from '../useCampaignInfo';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the Firebase context hooks
jest.mock('@/features/user-management', () => ({
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
}));

// Mock the shared dateFormatter utility
jest.mock('../../../../../../utils/dateFormatter', () => ({
  formatDisplayDate: jest.fn(),
  convertFirestoreTimestamp: jest.fn(),
}));

// Pull mock references after jest.mock declarations
const { useGroups, useCampaigns } = require('@/features/user-management');
const {
  formatDisplayDate,
  convertFirestoreTimestamp,
} = require('../../../../../../utils/dateFormatter');

// ---------------------------------------------------------------------------
// Test data builders
// ---------------------------------------------------------------------------

const makeGroup = (id = 'group-1', name = 'Test Group') => ({
  id,
  name,
});

const makeCampaign = (id = 'campaign-1', name = 'Test Campaign', createdAt?: any) => ({
  id,
  name,
  ...(createdAt !== undefined ? { createdAt } : {}),
});

// ---------------------------------------------------------------------------
// Default mock setup
// ---------------------------------------------------------------------------

const setupMocks = ({
  activeGroup = null as any,
  campaigns = [] as any[],
  activeCampaignId = null as string | null,
  formattedDate = '',
  convertedDate = null as Date | null,
} = {}) => {
  (useGroups as jest.Mock).mockReturnValue({ activeGroup });
  (useCampaigns as jest.Mock).mockReturnValue({ campaigns, activeCampaignId });
  (formatDisplayDate as jest.Mock).mockReturnValue(formattedDate);
  (convertFirestoreTimestamp as jest.Mock).mockReturnValue(convertedDate);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCampaignInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    it('exposes all expected keys', () => {
      const { result } = renderHook(() => useCampaignInfo());

      expect(result.current).toHaveProperty('activeGroup');
      expect(result.current).toHaveProperty('activeCampaign');
      expect(result.current).toHaveProperty('formattedCreationDate');
      expect(result.current).toHaveProperty('createdAtDate');
      expect(result.current).toHaveProperty('hasCampaign');
      expect(result.current).toHaveProperty('hasGroup');
    });
  });

  // -------------------------------------------------------------------------
  // No active group / campaign
  // -------------------------------------------------------------------------
  describe('when there is no active group or campaign', () => {
    it('returns null for activeGroup', () => {
      setupMocks({ activeGroup: null });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.activeGroup).toBeNull();
    });

    it('returns false for hasGroup', () => {
      setupMocks({ activeGroup: null });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.hasGroup).toBe(false);
    });

    it('returns undefined for activeCampaign when no campaigns', () => {
      setupMocks({ campaigns: [], activeCampaignId: null });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.activeCampaign).toBeUndefined();
    });

    it('returns false for hasCampaign', () => {
      setupMocks({ campaigns: [], activeCampaignId: null });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.hasCampaign).toBe(false);
    });

    it('returns null for formattedCreationDate', () => {
      setupMocks({ campaigns: [], activeCampaignId: null });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.formattedCreationDate).toBeNull();
    });

    it('returns null for createdAtDate', () => {
      setupMocks({ campaigns: [], activeCampaignId: null });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.createdAtDate).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Active group
  // -------------------------------------------------------------------------
  describe('when there is an active group', () => {
    it('returns the active group object', () => {
      const group = makeGroup('g-1', 'My Group');
      setupMocks({ activeGroup: group });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.activeGroup).toEqual(group);
    });

    it('returns true for hasGroup', () => {
      setupMocks({ activeGroup: makeGroup() });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.hasGroup).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Active campaign — found
  // -------------------------------------------------------------------------
  describe('when there is an active campaign with a matching id', () => {
    it('returns the active campaign object', () => {
      const campaign = makeCampaign('c-1');
      setupMocks({ campaigns: [campaign], activeCampaignId: 'c-1' });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.activeCampaign).toEqual(campaign);
    });

    it('returns true for hasCampaign', () => {
      const campaign = makeCampaign('c-1');
      setupMocks({ campaigns: [campaign], activeCampaignId: 'c-1' });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.hasCampaign).toBe(true);
    });

    it('finds the correct campaign from a list of several', () => {
      const campaigns = [makeCampaign('c-1'), makeCampaign('c-2'), makeCampaign('c-3')];
      setupMocks({ campaigns, activeCampaignId: 'c-2' });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.activeCampaign?.id).toBe('c-2');
    });
  });

  // -------------------------------------------------------------------------
  // Active campaign — not found in list
  // -------------------------------------------------------------------------
  describe('when the activeCampaignId does not match any campaign', () => {
    it('returns undefined for activeCampaign', () => {
      const campaign = makeCampaign('c-1');
      setupMocks({ campaigns: [campaign], activeCampaignId: 'c-999' });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.activeCampaign).toBeUndefined();
    });

    it('returns false for hasCampaign', () => {
      setupMocks({ campaigns: [makeCampaign('c-1')], activeCampaignId: 'c-999' });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.hasCampaign).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // formattedCreationDate / createdAtDate — campaign HAS createdAt
  // -------------------------------------------------------------------------
  describe('when the active campaign has a createdAt value', () => {
    it('calls formatDisplayDate with the createdAt value', () => {
      const createdAt = { seconds: 1700000000, nanoseconds: 0 };
      const campaign = makeCampaign('c-1', 'Camp', createdAt);
      setupMocks({
        campaigns: [campaign],
        activeCampaignId: 'c-1',
        formattedDate: '11/14/2023',
        convertedDate: new Date(1700000000 * 1000),
      });

      renderHook(() => useCampaignInfo());
      expect(formatDisplayDate).toHaveBeenCalledWith(createdAt);
    });

    it('returns the formatted date from formatDisplayDate', () => {
      const campaign = makeCampaign('c-1', 'Camp', 'some-timestamp');
      setupMocks({
        campaigns: [campaign],
        activeCampaignId: 'c-1',
        formattedDate: '1/1/2024',
        convertedDate: new Date('2024-01-01'),
      });

      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.formattedCreationDate).toBe('1/1/2024');
    });

    it('calls convertFirestoreTimestamp with the createdAt value', () => {
      const createdAt = 'some-timestamp';
      const campaign = makeCampaign('c-1', 'Camp', createdAt);
      const convertedDate = new Date('2024-01-01');
      setupMocks({
        campaigns: [campaign],
        activeCampaignId: 'c-1',
        convertedDate,
      });

      renderHook(() => useCampaignInfo());
      expect(convertFirestoreTimestamp).toHaveBeenCalledWith(createdAt);
    });

    it('returns the Date object from convertFirestoreTimestamp as createdAtDate', () => {
      const campaign = makeCampaign('c-1', 'Camp', 'ts');
      const convertedDate = new Date('2024-06-15');
      setupMocks({
        campaigns: [campaign],
        activeCampaignId: 'c-1',
        convertedDate,
      });

      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.createdAtDate).toEqual(convertedDate);
    });
  });

  // -------------------------------------------------------------------------
  // formattedCreationDate / createdAtDate — campaign has NO createdAt
  // -------------------------------------------------------------------------
  describe('when the active campaign has no createdAt', () => {
    it('returns null for formattedCreationDate', () => {
      const campaign = makeCampaign('c-1'); // no createdAt
      setupMocks({ campaigns: [campaign], activeCampaignId: 'c-1' });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.formattedCreationDate).toBeNull();
    });

    it('returns null for createdAtDate', () => {
      const campaign = makeCampaign('c-1'); // no createdAt
      setupMocks({ campaigns: [campaign], activeCampaignId: 'c-1' });
      const { result } = renderHook(() => useCampaignInfo());
      expect(result.current.createdAtDate).toBeNull();
    });

    it('does not call formatDisplayDate', () => {
      const campaign = makeCampaign('c-1');
      setupMocks({ campaigns: [campaign], activeCampaignId: 'c-1' });
      renderHook(() => useCampaignInfo());
      expect(formatDisplayDate).not.toHaveBeenCalled();
    });
  });
});
