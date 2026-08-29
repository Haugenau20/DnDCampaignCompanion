// src/features/collaboration/entity-extraction/components/UsageMeter.tsx
import React from "react";
import Typography from "../../../../core/components/Typography";
import { useUsageContext } from "../context/UsageContext";

/**
 * Monthly Smart Detection usage, as a labelled row at the foot of the rail.
 *
 * Replaces FloatingUsageIndicator's placement on the note page: that put a
 * bare number and a coloured ring in the corner of the writing surface with
 * nothing naming what it counted. Same number, somewhere it has a label.
 *
 * The monthly period is the one shown — it is the window a reader plans
 * against, and the one the design names.
 */
const UsageMeter: React.FC = () => {
  const { usageStatus } = useUsageContext();

  // Nothing to say until usage has loaded. A skeleton here would be a second
  // unexplained shape in the corner, which is the problem being fixed.
  if (!usageStatus) return null;

  const { monthly, isUnlimited } = usageStatus.usage;
  const percentage = monthly.limit > 0
    ? Math.min((monthly.count / monthly.limit) * 100, 100)
    : 0;

  return (
    <div className="usage-meter card rounded-xl p-4">
      <Typography variant="body-sm" className="font-medium">
        Smart detection
      </Typography>

      {isUnlimited ? (
        <Typography variant="caption" color="secondary" className="block mt-0.5">
          Unlimited scans
        </Typography>
      ) : (
        <>
          <Typography variant="caption" color="secondary" className="block mt-0.5">
            {`${monthly.count} of ${monthly.limit} scans used this month`}
          </Typography>

          <div
            role="progressbar"
            aria-label="Smart detection scans used this month"
            aria-valuenow={monthly.count}
            aria-valuemin={0}
            aria-valuemax={monthly.limit}
            className="progress-container mt-2 h-1 rounded-full overflow-hidden"
          >
            <div
              data-testid="usage-meter-fill"
              className="progress-bar h-full rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default UsageMeter;
