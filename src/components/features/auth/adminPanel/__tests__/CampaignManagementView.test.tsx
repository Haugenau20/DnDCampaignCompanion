// src/components/features/auth/adminPanel/__tests__/CampaignManagementView.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CampaignManagementView from '../CampaignManagementView';

// ---------------------------------------------------------------------------
// Mock context/firebase
// ---------------------------------------------------------------------------
const mockCreateCampaign = jest.fn();
const mockGetCampaigns = jest.fn();

jest.mock('../../../../../context/firebase', () => ({
  useCampaigns: jest.fn(),
  useGroups: jest.fn(),
  useAuth: jest.fn(),
}));

const { useCampaigns, useGroups, useAuth } = require('../../../../../context/firebase');

// ---------------------------------------------------------------------------
// Mock Dialog
// ---------------------------------------------------------------------------
jest.mock('../../../../core/Dialog', () => {
  const Dialog = ({ open, onClose, title, children }: any) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="close dialog">X</button>
        {children}
      </div>
    );
  };
  return Dialog;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser = { uid: 'user-1', email: 'admin@test.com' };

function makeCampaign(overrides: Record<string, any> = {}) {
  return {
    id: 'campaign-1',
    name: 'The Lost Mine',
    description: 'A classic campaign',
    createdAt: new Date('2024-01-15'),
    createdBy: 'user-1',
    ...overrides,
  };
}

function setupMocks(campaigns: any[] = [], groupId = 'group-1') {
  mockGetCampaigns.mockResolvedValue(campaigns);
  useCampaigns.mockReturnValue({
    createCampaign: mockCreateCampaign,
    campaigns: [], // empty context campaigns — forces local state
    getCampaigns: mockGetCampaigns,
  });
  useGroups.mockReturnValue({
    activeGroupId: groupId,
  });
  useAuth.mockReturnValue({ user: mockUser });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CampaignManagementView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockCreateCampaign.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render Campaigns heading', async () => {
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByText(/campaigns \(0\)/i)).toBeInTheDocument();
      });
    });

    test('should render search input', () => {
      render(<CampaignManagementView />);
      expect(screen.getByPlaceholderText(/search campaigns/i)).toBeInTheDocument();
    });

    test('should render "New Campaign" button', () => {
      render(<CampaignManagementView />);
      expect(screen.getByRole('button', { name: /new campaign/i })).toBeInTheDocument();
    });

    test('should show empty state when no campaigns exist', async () => {
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByText(/no campaigns found/i)).toBeInTheDocument();
      });
    });

    test('should load campaigns on mount', async () => {
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(mockGetCampaigns).toHaveBeenCalledWith('group-1');
      });
    });

    test('should not load campaigns when no activeGroupId', async () => {
      setupMocks([], '');
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(mockGetCampaigns).not.toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Campaign list
  // -------------------------------------------------------------------------
  describe('campaign list display', () => {
    test('should display campaign names', async () => {
      setupMocks([makeCampaign()]);
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByText('The Lost Mine')).toBeInTheDocument();
      });
    });

    test('should display campaign descriptions', async () => {
      setupMocks([makeCampaign({ description: 'Epic adventure' })]);
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByText('Epic adventure')).toBeInTheDocument();
      });
    });

    test('should display campaign count in heading', async () => {
      setupMocks([makeCampaign(), makeCampaign({ id: 'c2', name: 'Storm King' })]);
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByText(/campaigns \(2\)/i)).toBeInTheDocument();
      });
    });

    test('should display "You" for campaigns created by the current user', async () => {
      setupMocks([makeCampaign({ createdBy: 'user-1' })]);
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByText(/by: you/i)).toBeInTheDocument();
      });
    });

    test('should display Edit and Delete buttons for each campaign', async () => {
      setupMocks([makeCampaign()]);
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Search / filter
  // -------------------------------------------------------------------------
  describe('campaign search', () => {
    test('should filter campaigns by search query', async () => {
      setupMocks([
        makeCampaign({ id: 'c1', name: 'Alpha Campaign' }),
        makeCampaign({ id: 'c2', name: 'Beta Campaign' }),
      ]);
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByText('Alpha Campaign')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/search campaigns/i), {
        target: { value: 'alpha' },
      });

      await waitFor(() => {
        expect(screen.getByText('Alpha Campaign')).toBeInTheDocument();
        expect(screen.queryByText('Beta Campaign')).not.toBeInTheDocument();
      });
    });

    test('should show "No campaigns match your search" when filtered to empty', async () => {
      setupMocks([makeCampaign()]);
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.queryByText(/no campaigns found/i)).not.toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/search campaigns/i), {
        target: { value: 'zzznomatch' },
      });

      await waitFor(() => {
        expect(screen.getByText(/no campaigns match your search/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // New Campaign form
  // -------------------------------------------------------------------------
  describe('new campaign form', () => {
    test('should open New Campaign dialog when "New Campaign" is clicked', () => {
      render(<CampaignManagementView />);
      fireEvent.click(screen.getByRole('button', { name: /new campaign/i }));
      expect(screen.getByRole('dialog', { name: /create new campaign/i })).toBeInTheDocument();
    });

    test('should show Campaign Name input in the dialog', () => {
      render(<CampaignManagementView />);
      fireEvent.click(screen.getByRole('button', { name: /new campaign/i }));
      expect(screen.getByPlaceholderText(/enter campaign name/i)).toBeInTheDocument();
    });

    test('should call createCampaign when form is submitted', async () => {
      render(<CampaignManagementView />);
      fireEvent.click(screen.getByRole('button', { name: /new campaign/i }));

      fireEvent.change(screen.getByPlaceholderText(/enter campaign name/i), {
        target: { value: 'New Epic Campaign' },
      });

      const dialog = screen.getByRole('dialog', { name: /create new campaign/i });
      const createBtn = Array.from(dialog.querySelectorAll('button')).find(b =>
        /create campaign/i.test(b.textContent || '')
      );
      expect(createBtn).toBeTruthy();
      fireEvent.click(createBtn!);

      await waitFor(() => {
        expect(mockCreateCampaign).toHaveBeenCalledWith(
          'group-1',
          'New Epic Campaign',
          expect.any(String)
        );
      });
    });

    test('should disable "Create Campaign" button when name is empty', () => {
      render(<CampaignManagementView />);
      fireEvent.click(screen.getByRole('button', { name: /new campaign/i }));

      const dialog = screen.getByRole('dialog', { name: /create new campaign/i });
      const createBtn = Array.from(dialog.querySelectorAll('button')).find(b =>
        /create campaign/i.test(b.textContent || '')
      );
      expect(createBtn).toBeDisabled();
    });

    test('should close dialog when Cancel is clicked', () => {
      render(<CampaignManagementView />);
      fireEvent.click(screen.getByRole('button', { name: /new campaign/i }));

      const dialog = screen.getByRole('dialog', { name: /create new campaign/i });
      const cancelBtn = Array.from(dialog.querySelectorAll('button')).find(b =>
        /cancel/i.test(b.textContent || '')
      );
      fireEvent.click(cancelBtn!);

      expect(screen.queryByRole('dialog', { name: /create new campaign/i })).not.toBeInTheDocument();
    });

    test('should show error when createCampaign throws', async () => {
      mockCreateCampaign.mockRejectedValue(new Error('Creation failed'));
      render(<CampaignManagementView />);
      fireEvent.click(screen.getByRole('button', { name: /new campaign/i }));

      fireEvent.change(screen.getByPlaceholderText(/enter campaign name/i), {
        target: { value: 'New Campaign' },
      });

      const dialog = screen.getByRole('dialog', { name: /create new campaign/i });
      const createBtn = Array.from(dialog.querySelectorAll('button')).find(b =>
        /create campaign/i.test(b.textContent || '')
      );
      fireEvent.click(createBtn!);

      await waitFor(() => {
        expect(screen.getByText(/creation failed/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Delete Campaign
  // -------------------------------------------------------------------------
  describe('campaign deletion', () => {
    test('should open confirmation dialog when Delete is clicked', async () => {
      setupMocks([makeCampaign()]);
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      expect(screen.getByRole('dialog', { name: /confirm campaign deletion/i })).toBeInTheDocument();
    });

    test('should show campaign name in confirmation dialog', async () => {
      setupMocks([makeCampaign({ name: 'Dragon Heist' })]);
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      const dialog = screen.getByRole('dialog', { name: /confirm campaign deletion/i });
      expect(dialog.textContent).toContain('Dragon Heist');
    });

    test('should close confirmation dialog when Cancel is clicked', async () => {
      setupMocks([makeCampaign()]);
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      const dialog = screen.getByRole('dialog', { name: /confirm campaign deletion/i });
      const cancelBtn = Array.from(dialog.querySelectorAll('button')).find(b =>
        /cancel/i.test(b.textContent || '')
      );
      fireEvent.click(cancelBtn!);

      expect(screen.queryByRole('dialog', { name: /confirm campaign deletion/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state Create First Campaign button
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    test('should show "Create First Campaign" button in empty state', async () => {
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create first campaign/i })).toBeInTheDocument();
      });
    });

    test('should open New Campaign dialog from "Create First Campaign" button', async () => {
      render(<CampaignManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create first campaign/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /create first campaign/i }));
      expect(screen.getByRole('dialog', { name: /create new campaign/i })).toBeInTheDocument();
    });
  });
});
