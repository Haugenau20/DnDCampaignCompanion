// src/features/collaboration/entity-extraction/components/__tests__/UsageMeter.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import UsageMeter from '../UsageMeter';

jest.mock('../../context/UsageContext', () => ({ useUsageContext: jest.fn() }));

const { useUsageContext } = require('../../context/UsageContext');

function setupUsage(monthly: { count: number; limit: number } | null, extra: any = {}) {
  (useUsageContext as jest.Mock).mockReturnValue({
    usageStatus: monthly
      ? {
          usage: {
            daily: { count: 1, limit: 5 },
            weekly: { count: 3, limit: 10 },
            monthly,
            isUnlimited: false,
            ...extra,
          },
          limitExceeded: false,
          nextReset: { daily: '', weekly: '', monthly: '' },
        }
      : null,
  });
}

describe('UsageMeter', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should label the meter', () => {
    setupUsage({ count: 7, limit: 20 });
    render(<UsageMeter />);
    expect(screen.getByText('Smart detection')).toBeInTheDocument();
  });

  test('should state the monthly count against its limit', () => {
    setupUsage({ count: 7, limit: 20 });
    render(<UsageMeter />);
    expect(screen.getByText('7 of 20 scans used this month')).toBeInTheDocument();
  });

  test('should expose the meter as a progressbar with its value', () => {
    setupUsage({ count: 7, limit: 20 });
    render(<UsageMeter />);

    const meter = screen.getByRole('progressbar');
    expect(meter).toHaveAttribute('aria-valuenow', '7');
    expect(meter).toHaveAttribute('aria-valuemax', '20');
  });

  test('should not exceed 100% when the count passes the limit', () => {
    setupUsage({ count: 25, limit: 20 });
    render(<UsageMeter />);

    const fill = screen.getByTestId('usage-meter-fill');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  test('should say so when usage is unlimited', () => {
    setupUsage({ count: 7, limit: 20 }, { isUnlimited: true });
    render(<UsageMeter />);
    expect(screen.getByText('Unlimited scans')).toBeInTheDocument();
  });

  test('should render nothing before usage data arrives', () => {
    setupUsage(null);
    const { container } = render(<UsageMeter />);
    expect(container).toBeEmptyDOMElement();
  });
});
