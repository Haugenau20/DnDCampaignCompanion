// src/components/features/notes/UsageRing.tsx
import React, { useState } from "react";
import { UsageStatus, UsagePeriod } from "../../../types/usage";
import Typography from "../../core/Typography";

interface UsageRingProps {
  /** Current usage status */
  usage: UsageStatus;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Optional className for styling */
  className?: string;
}

/**
 * Circular usage ring component that visually represents usage limits
 * Shows daily usage progress but fills completely if any limit is exceeded
 */
const UsageRing: React.FC<UsageRingProps> = ({
  usage,
  size = 48,
  strokeWidth = 4,
  className = ""
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate the fill percentage for the ring
  const calculateFillPercentage = (): number => {
    const { daily, weekly, monthly } = usage.usage;
    
    // If any limit is exceeded, fill completely
    if (usage.limitExceeded) {
      return 100;
    }
    
    // Use daily usage as the primary indicator
    const dailyLimit = usage.usage.customLimit ?? daily.limit;
    const dailyPercentage = Math.min((daily.count / dailyLimit) * 100, 100);
    
    // If weekly or monthly limits are close to being exceeded, increase fill
    const weeklyPercentage = (weekly.count / weekly.limit) * 100;
    const monthlyPercentage = (monthly.count / monthly.limit) * 100;
    
    // Take the highest percentage to show the most restrictive limit
    return Math.max(dailyPercentage, weeklyPercentage * 0.5, monthlyPercentage * 0.3);
  };

  /**
   * Get the color class based on usage level
   */
  const getColorClass = (): string => {
    const percentage = calculateFillPercentage();
    
    if (usage.limitExceeded) {
      return "status-failed";
    } else if (percentage >= 80) {
      return "status-warning";
    } else if (percentage >= 60) {
      return "status-unknown";
    } else {
      return "status-active";
    }
  };

  /**
   * Format a date for display in tooltip
   */
  const formatResetTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    
    // If reset is today, show time
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZoneName: 'short'
      })}`;
    }
    
    // If reset is tomorrow, show "Tomorrow"
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZoneName: 'short'
      })}`;
    }
    
    // Otherwise show full date
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  /**
   * Get status text for period
   */
  const getPeriodStatusText = (period: UsagePeriod): string => {
    const periodData = usage.usage[period];
    const limit = period === 'daily' && usage.usage.customLimit 
      ? usage.usage.customLimit 
      : periodData.limit;
    
    return `${periodData.count}/${limit}`;
  };

  const fillPercentage = calculateFillPercentage();
  const colorClass = getColorClass();
  
  // SVG circle calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (fillPercentage / 100) * circumference;

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* SVG Ring */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="card-border opacity-20"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={`${colorClass} transition-all duration-300 ease-in-out`}
          style={{
            transition: 'stroke-dashoffset 0.3s ease-in-out'
          }}
        />
      </svg>

      {/* Center text showing daily usage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Typography variant="body-sm" className="font-semibold">
          {usage.usage.daily.count}
        </Typography>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="card rounded-lg shadow-lg p-3 min-w-64">
            <Typography variant="body" className="font-semibold mb-2">
              Entity Extraction Usage
            </Typography>
            
            <div className="space-y-2">
              {/* Daily usage */}
              <div className="flex justify-between items-center">
                <Typography variant="body-sm" color="secondary">
                  Daily:
                </Typography>
                <Typography variant="body-sm" className={
                  usage.exceededPeriod === 'daily' ? 'status-failed' : ''
                }>
                  {getPeriodStatusText('daily')}
                </Typography>
              </div>
              
              {/* Weekly usage */}
              <div className="flex justify-between items-center">
                <Typography variant="body-sm" color="secondary">
                  Weekly:
                </Typography>
                <Typography variant="body-sm" className={
                  usage.exceededPeriod === 'weekly' ? 'status-failed' : ''
                }>
                  {getPeriodStatusText('weekly')}
                </Typography>
              </div>
              
              {/* Monthly usage */}
              <div className="flex justify-between items-center">
                <Typography variant="body-sm" color="secondary">
                  Monthly:
                </Typography>
                <Typography variant="body-sm" className={
                  usage.exceededPeriod === 'monthly' ? 'status-failed' : ''
                }>
                  {getPeriodStatusText('monthly')}
                </Typography>
              </div>
            </div>

            {/* Reset times */}
            <div className="mt-3 pt-2 border-t card-border">
              <Typography variant="caption" color="muted" className="mb-1">
                Next resets:
              </Typography>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Typography variant="caption" color="muted">
                    Daily:
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {formatResetTime(usage.nextReset.daily)}
                  </Typography>
                </div>
                <div className="flex justify-between items-center">
                  <Typography variant="caption" color="muted">
                    Weekly:
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {formatResetTime(usage.nextReset.weekly)}
                  </Typography>
                </div>
                <div className="flex justify-between items-center">
                  <Typography variant="caption" color="muted">
                    Monthly:
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {formatResetTime(usage.nextReset.monthly)}
                  </Typography>
                </div>
              </div>
            </div>

            {/* Special statuses */}
            {usage.usage.isUnlimited && (
              <div className="mt-2 pt-2 border-t card-border">
                <Typography variant="caption" className="status-success">
                  ✓ Unlimited access
                </Typography>
              </div>
            )}

            {usage.usage.customLimit && (
              <div className="mt-2 pt-2 border-t card-border">
                <Typography variant="caption" color="muted">
                  Custom daily limit: {usage.usage.customLimit}
                </Typography>
              </div>
            )}

            {/* Limit exceeded warning */}
            {usage.limitExceeded && (
              <div className="mt-2 pt-2 border-t card-border">
                <Typography variant="caption" className="status-failed">
                  {usage.exceededPeriod} limit exceeded
                </Typography>
              </div>
            )}
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="w-2 h-2 card rotate-45 transform"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageRing;