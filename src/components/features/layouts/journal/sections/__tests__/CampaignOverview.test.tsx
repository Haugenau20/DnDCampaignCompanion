// src/components/features/layouts/journal/sections/__tests__/CampaignOverview.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import CampaignOverview from '../CampaignOverview';

// ---------------------------------------------------------------------------
// Mock useCampaignInfo (the only external dependency of CampaignOverview)
// ---------------------------------------------------------------------------
jest.mock('../../../common/hooks/useCampaignInfo', () => ({
  useCampaignInfo: jest.fn(),
}));

// Mock LoadingState so we get a predictable testid rather than skeleton divs
jest.mock('../../../common/components/LoadingState', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-state" />,
}));

const { useCampaignInfo } = require('../../../common/hooks/useCampaignInfo');

// ---------------------------------------------------------------------------
// Helper – configure hook return value
// ---------------------------------------------------------------------------
function setupHook(overrides: Record<string, unknown> = {}) {
  (useCampaignInfo as jest.Mock).mockReturnValue({
    activeGroup: null,
    activeCampaign: null,
    formattedCreationDate: null,
    hasCampaign: false,
    hasGroup: false,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CampaignOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders the loading state when loading=true', () => {
      setupHook();
      render(<CampaignOverview loading={true} />);
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });

    it('does not render campaign content while loading', () => {
      setupHook({
        hasGroup: true,
        hasCampaign: true,
        activeCampaign: { name: 'My Campaign' },
        activeGroup: { name: 'My Group' },
      });
      render(<CampaignOverview loading={true} />);
      expect(screen.queryByText('My Campaign')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // No group selected
  // -------------------------------------------------------------------------
  describe('no group selected', () => {
    it('shows "No Group Selected" heading when hasGroup is false', () => {
      setupHook({ hasGroup: false, hasCampaign: false });
      render(<CampaignOverview loading={false} />);
      expect(screen.getByText('No Group Selected')).toBeInTheDocument();
    });

    it('shows helper message to select or create a group', () => {
      setupHook({ hasGroup: false, hasCampaign: false });
      render(<CampaignOverview loading={false} />);
      expect(
        screen.getByText('Select or create a group to get started')
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Group selected but no campaign
  // -------------------------------------------------------------------------
  describe('group selected but no active campaign', () => {
    it('shows "No Active Campaign" heading when hasCampaign is false and hasGroup is true', () => {
      setupHook({ hasGroup: true, hasCampaign: false });
      render(<CampaignOverview loading={false} />);
      expect(screen.getByText('No Active Campaign')).toBeInTheDocument();
    });

    it('shows helper message to select or create a campaign', () => {
      setupHook({ hasGroup: true, hasCampaign: false });
      render(<CampaignOverview loading={false} />);
      expect(
        screen.getByText('Select or create a campaign to begin your adventure')
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Active group and campaign
  // -------------------------------------------------------------------------
  describe('active group and campaign', () => {
    const makeState = (overrides: Record<string, unknown> = {}) => ({
      hasGroup: true,
      hasCampaign: true,
      activeCampaign: {
        id: 'camp-1',
        name: 'The Lost Mine',
        description: 'A legendary adventure',
        createdAt: null,
      },
      activeGroup: { id: 'grp-1', name: 'Party of Heroes' },
      formattedCreationDate: null,
      ...overrides,
    });

    it('renders the campaign name', () => {
      setupHook(makeState());
      render(<CampaignOverview loading={false} />);
      expect(screen.getByText('The Lost Mine')).toBeInTheDocument();
    });

    it('renders the campaign description when provided', () => {
      setupHook(makeState());
      render(<CampaignOverview loading={false} />);
      expect(screen.getByText('A legendary adventure')).toBeInTheDocument();
    });

    it('does not render description paragraph when description is absent', () => {
      setupHook(
        makeState({
          activeCampaign: { id: 'c1', name: 'No Desc Campaign' },
        })
      );
      render(<CampaignOverview loading={false} />);
      // Only the name should appear, no extra paragraph
      expect(screen.queryByText('A legendary adventure')).not.toBeInTheDocument();
    });

    it('renders the group name', () => {
      setupHook(makeState());
      render(<CampaignOverview loading={false} />);
      expect(screen.getByText('Party of Heroes')).toBeInTheDocument();
    });

    it('renders the formatted creation date when provided', () => {
      setupHook(makeState({ formattedCreationDate: '1st of January' }));
      render(<CampaignOverview loading={false} />);
      expect(screen.getByText('1st of January')).toBeInTheDocument();
    });

    it('does not render the started date when formattedCreationDate is null', () => {
      setupHook(makeState({ formattedCreationDate: null }));
      render(<CampaignOverview loading={false} />);
      expect(screen.queryByText(/Started:/)).not.toBeInTheDocument();
    });

    it('shows "Group:" label next to the group name', () => {
      setupHook(makeState());
      render(<CampaignOverview loading={false} />);
      // The text "Group:" appears as a text node
      expect(screen.getByText(/Group:/)).toBeInTheDocument();
    });

    it('shows "Started:" label next to the creation date', () => {
      setupHook(makeState({ formattedCreationDate: '15th of June' }));
      render(<CampaignOverview loading={false} />);
      expect(screen.getByText(/Started:/)).toBeInTheDocument();
    });
  });
});
