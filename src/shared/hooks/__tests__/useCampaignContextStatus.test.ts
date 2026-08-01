// src/shared/hooks/__tests__/useCampaignContextStatus.test.ts
import { renderHook } from '@testing-library/react';
import { useCampaignContextStatus } from '../useCampaignContextStatus';

/**
 * useCampaignContextStatus Behavioral Testing
 *
 * This hook is the single shared source of truth for "is the group/campaign
 * selection still resolving, or has it settled on nothing?" (bug #1413). All
 * four campaign-entity data hooks, the storytelling saga hook, and NoteContext
 * consume it instead of each deriving `hasRequiredContext` from
 * `!!activeGroupId && !!activeCampaignId` on their own -- which could not tell
 * a fresh page load (where both are briefly null while auth/group/campaign
 * restore) apart from a user who genuinely has nothing selected.
 */

const mockUseAuth = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();

jest.mock('features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

const setup = (overrides: {
  authLoading?: unknown;
  activeGroupId?: string | null;
  activeCampaignId?: string | null;
} = {}) => {
  const { authLoading, activeGroupId = null, activeCampaignId = null } = overrides;
  mockUseAuth.mockReturnValue({ loading: authLoading });
  mockUseGroups.mockReturnValue({ activeGroupId });
  mockUseCampaigns.mockReturnValue({ activeCampaignId });
};

describe('useCampaignContextStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('while auth/group/campaign restoration is in flight', () => {
    test('isResolving is true when useAuth().loading is true', () => {
      setup({ authLoading: true, activeGroupId: null, activeCampaignId: null });
      const { result } = renderHook(() => useCampaignContextStatus());
      expect(result.current.isResolving).toBe(true);
    });

    test('hasRequiredContext is false even if a group/campaign happen to already be set', () => {
      // Guards against a race where activeGroupId/activeCampaignId populate
      // slightly before useAuth().loading flips to false.
      setup({ authLoading: true, activeGroupId: 'group-1', activeCampaignId: 'campaign-1' });
      const { result } = renderHook(() => useCampaignContextStatus());
      expect(result.current.hasRequiredContext).toBe(false);
    });

    test('missingContext is null -- neither confirms nor denies a selection', () => {
      setup({ authLoading: true, activeGroupId: null, activeCampaignId: null });
      const { result } = renderHook(() => useCampaignContextStatus());
      expect(result.current.missingContext).toBeNull();
    });
  });

  describe('once resolution has finished', () => {
    test('missingContext is "group" when no group is selected', () => {
      setup({ authLoading: false, activeGroupId: null, activeCampaignId: null });
      const { result } = renderHook(() => useCampaignContextStatus());
      expect(result.current.missingContext).toBe('group');
      expect(result.current.hasRequiredContext).toBe(false);
    });

    test('missingContext is "campaign" when a group but no campaign is selected', () => {
      setup({ authLoading: false, activeGroupId: 'group-1', activeCampaignId: null });
      const { result } = renderHook(() => useCampaignContextStatus());
      expect(result.current.missingContext).toBe('campaign');
      expect(result.current.hasRequiredContext).toBe(false);
    });

    test('hasRequiredContext is true and missingContext is null once both are selected', () => {
      setup({ authLoading: false, activeGroupId: 'group-1', activeCampaignId: 'campaign-1' });
      const { result } = renderHook(() => useCampaignContextStatus());
      expect(result.current.hasRequiredContext).toBe(true);
      expect(result.current.missingContext).toBeNull();
      expect(result.current.isResolving).toBe(false);
    });
  });

  describe('boolean coercion', () => {
    // useAuth() is mocked without a `loading` key in several existing test
    // suites across the codebase, so `isResolving` must never leak `undefined`
    // -- callers fold it into their own loading flag with `||`, and
    // `false || undefined` is `undefined`, not `false`.
    test('isResolving is a real boolean (false), not undefined, when useAuth().loading is undefined', () => {
      setup({ authLoading: undefined, activeGroupId: 'group-1', activeCampaignId: 'campaign-1' });
      const { result } = renderHook(() => useCampaignContextStatus());
      expect(result.current.isResolving).toBe(false);
    });
  });
});
