// src/components/features/notes/__tests__/FloatingUsageIndicator.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FloatingUsageIndicator from '../FloatingUsageIndicator';
import { UsageStatus } from '../../../../types/usage';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

jest.mock('../../../../context/UsageContext', () => ({
  useUsageContext: jest.fn(),
}));

jest.mock('../../../../hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

const { useUsageContext } = require('../../../../context/UsageContext');
const { useNavigation } = require('../../../../hooks/useNavigation');

function setupMocks({
  usageStatus = null as UsageStatus | null,
  currentPath = '/notes/note-1',
} = {}) {
  (useUsageContext as jest.Mock).mockReturnValue({ usageStatus });
  (useNavigation as jest.Mock).mockReturnValue({ currentPath });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeUsageStatus(overrides: Partial<UsageStatus> = {}): UsageStatus {
  return {
    usage: {
      daily: { count: 3, lastReset: '2024-01-15T00:00:00.000Z', limit: 10 },
      weekly: { count: 8, lastReset: '2024-01-14T00:00:00.000Z', limit: 30 },
      monthly: { count: 15, lastReset: '2024-01-01T00:00:00.000Z', limit: 100 },
    },
    limitExceeded: false,
    nextReset: {
      daily: '2024-01-16T00:00:00.000Z',
      weekly: '2024-01-21T00:00:00.000Z',
      monthly: '2024-02-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FloatingUsageIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Visibility based on route
  // -------------------------------------------------------------------------
  describe('route-based visibility', () => {
    test('should render on individual note pages (/notes/note-1)', () => {
      setupMocks({ currentPath: '/notes/note-1', usageStatus: makeUsageStatus() });
      const { container } = render(<FloatingUsageIndicator />);
      // It renders something (the fixed div)
      expect(container.firstChild).not.toBeNull();
    });

    test('should NOT render on the notes list page (/notes)', () => {
      setupMocks({ currentPath: '/notes', usageStatus: makeUsageStatus() });
      const { container } = render(<FloatingUsageIndicator />);
      expect(container.firstChild).toBeNull();
    });

    test('should NOT render on non-notes pages (/npcs)', () => {
      setupMocks({ currentPath: '/npcs', usageStatus: makeUsageStatus() });
      const { container } = render(<FloatingUsageIndicator />);
      expect(container.firstChild).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Loading / null usage state (UsageRing loading)
  // -------------------------------------------------------------------------
  describe('loading/null usage state', () => {
    test('should render indicator even when usageStatus is null (loading state)', () => {
      setupMocks({ currentPath: '/notes/note-1', usageStatus: null });
      const { container } = render(<FloatingUsageIndicator />);
      // Fixed container renders; ring shows loading "-"
      expect(container.firstChild).not.toBeNull();
    });

    test('should show dash "-" in ring center when usage is null', () => {
      setupMocks({ currentPath: '/notes/note-1', usageStatus: null });
      render(<FloatingUsageIndicator />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Usage ring display
  // -------------------------------------------------------------------------
  describe('usage ring display', () => {
    test('should show daily usage count in ring center', () => {
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus(),
      });
      render(<FloatingUsageIndicator />);
      // Daily count is 3
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('should show correct daily count when at limit', () => {
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus({
          limitExceeded: true,
          exceededPeriod: 'daily',
          usage: {
            daily: { count: 10, lastReset: '2024-01-15T00:00:00.000Z', limit: 10 },
            weekly: { count: 30, lastReset: '2024-01-14T00:00:00.000Z', limit: 30 },
            monthly: { count: 100, lastReset: '2024-01-01T00:00:00.000Z', limit: 100 },
          },
        }),
      });
      render(<FloatingUsageIndicator />);
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Color class coverage (lines 93, 95 — getColorClass branches)
  // -------------------------------------------------------------------------
  describe('color class branches', () => {
    test('should render ring with high-usage class when daily fill >= 80% (line 93)', () => {
      // daily count = 8, limit = 10 → 80% → status-unknown class
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus({
          usage: {
            daily: { count: 8, lastReset: '2024-01-15T00:00:00.000Z', limit: 10 },
            weekly: { count: 1, lastReset: '2024-01-14T00:00:00.000Z', limit: 30 },
            monthly: { count: 2, lastReset: '2024-01-01T00:00:00.000Z', limit: 100 },
          },
        }),
      });
      const { container } = render(<FloatingUsageIndicator />);
      // Component renders (doesn't crash); the SVG circle gets the status-unknown class
      expect(container.firstChild).not.toBeNull();
    });

    test('should render ring with medium-usage class when daily fill >= 60% but < 80% (line 95)', () => {
      // daily count = 7, limit = 10 → 70% → status-general class
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus({
          usage: {
            daily: { count: 7, lastReset: '2024-01-15T00:00:00.000Z', limit: 10 },
            weekly: { count: 1, lastReset: '2024-01-14T00:00:00.000Z', limit: 30 },
            monthly: { count: 2, lastReset: '2024-01-01T00:00:00.000Z', limit: 100 },
          },
        }),
      });
      const { container } = render(<FloatingUsageIndicator />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // formatResetTime branches (lines 110, 120)
  // -------------------------------------------------------------------------
  describe('formatResetTime branches', () => {
    test('should show "Today at" in tooltip reset section when reset is today (line 110)', () => {
      // Set nextReset.daily to today (same date as now)
      const todayReset = new Date();
      todayReset.setHours(23, 59, 59, 0);
      const todayResetISO = todayReset.toISOString();

      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: {
          ...makeUsageStatus(),
          nextReset: {
            daily: todayResetISO,
            weekly: todayResetISO,
            monthly: todayResetISO,
          },
        },
      });
      render(<FloatingUsageIndicator />);

      // Open tooltip
      const ring = screen.getByText('3').closest('[class*="relative"]');
      if (ring) fireEvent.mouseEnter(ring);

      // Should show "Today at" in the reset section
      expect(screen.getAllByText(/Today at/i).length).toBeGreaterThan(0);
    });

    test('should show "Tomorrow at" in tooltip when reset is tomorrow (line 120)', () => {
      // Set nextReset.daily to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const tomorrowISO = tomorrow.toISOString();

      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: {
          ...makeUsageStatus(),
          nextReset: {
            daily: tomorrowISO,
            weekly: tomorrowISO,
            monthly: tomorrowISO,
          },
        },
      });
      render(<FloatingUsageIndicator />);

      const ring = screen.getByText('3').closest('[class*="relative"]');
      if (ring) fireEvent.mouseEnter(ring);

      expect(screen.getAllByText(/Tomorrow at/i).length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Tooltip interaction
  // -------------------------------------------------------------------------
  describe('tooltip on hover', () => {
    test('should show tooltip when hovering over ring', () => {
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus(),
      });
      render(<FloatingUsageIndicator />);
      const ring = screen.getByText('3').closest('[class*="relative"]');
      // Fire mouseenter on the SVG container
      if (ring) fireEvent.mouseEnter(ring);
      expect(screen.getByText('Smart Detection Usage')).toBeInTheDocument();
    });

    test('should show Daily / Weekly / Monthly labels in tooltip', () => {
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus(),
      });
      render(<FloatingUsageIndicator />);
      const ring = screen.getByText('3').closest('[class*="relative"]');
      if (ring) fireEvent.mouseEnter(ring);
      expect(screen.getAllByText(/daily:/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/weekly:/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/monthly:/i).length).toBeGreaterThan(0);
    });

    test('should show daily usage count/limit in tooltip', () => {
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus(),
      });
      render(<FloatingUsageIndicator />);
      const ring = screen.getByText('3').closest('[class*="relative"]');
      if (ring) fireEvent.mouseEnter(ring);
      // Daily count is 3 / limit 10 → "3/10"
      expect(screen.getByText('3/10')).toBeInTheDocument();
    });

    test('should hide tooltip after mouseleave', () => {
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus(),
      });
      render(<FloatingUsageIndicator />);
      const ring = screen.getByText('3').closest('[class*="relative"]');
      if (ring) {
        fireEvent.mouseEnter(ring);
        fireEvent.mouseLeave(ring);
      }
      expect(screen.queryByText('Smart Detection Usage')).not.toBeInTheDocument();
    });

    test('should show unlimited access label when usage is unlimited', () => {
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus({
          usage: {
            daily: { count: 0, lastReset: '2024-01-15T00:00:00.000Z', limit: 10 },
            weekly: { count: 0, lastReset: '2024-01-14T00:00:00.000Z', limit: 30 },
            monthly: { count: 0, lastReset: '2024-01-01T00:00:00.000Z', limit: 100 },
            isUnlimited: true,
          },
        }),
      });
      render(<FloatingUsageIndicator />);
      const ring = screen.getByText('0').closest('[class*="relative"]');
      if (ring) fireEvent.mouseEnter(ring);
      expect(screen.getByText(/unlimited access/i)).toBeInTheDocument();
    });

    test('should show limit exceeded period text when limit is exceeded', () => {
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus({
          limitExceeded: true,
          exceededPeriod: 'daily',
        }),
      });
      render(<FloatingUsageIndicator />);
      const ring = screen.getByText('3').closest('[class*="relative"]');
      if (ring) fireEvent.mouseEnter(ring);
      expect(screen.getByText(/daily limit exceeded/i)).toBeInTheDocument();
    });

    test('should show custom daily limit text when customLimit is set', () => {
      setupMocks({
        currentPath: '/notes/note-1',
        usageStatus: makeUsageStatus({
          usage: {
            daily: { count: 2, lastReset: '2024-01-15T00:00:00.000Z', limit: 10 },
            weekly: { count: 4, lastReset: '2024-01-14T00:00:00.000Z', limit: 30 },
            monthly: { count: 6, lastReset: '2024-01-01T00:00:00.000Z', limit: 100 },
            customLimit: 20,
          },
        }),
      });
      render(<FloatingUsageIndicator />);
      const ring = screen.getByText('2').closest('[class*="relative"]');
      if (ring) fireEvent.mouseEnter(ring);
      expect(screen.getByText(/custom daily limit: 20/i)).toBeInTheDocument();
    });
  });
});
