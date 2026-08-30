// src/features/collaboration/entity-extraction/components/UsageMeter.tsx
import React from "react";
import Typography from "../../../../core/components/Typography";
import { useUsageContext } from "../context/UsageContext";
import { UsagePeriod } from "../types";
import { clsx } from "clsx";

/** The three periods, in the order they are rendered, with their labels. */
const PERIODS: Array<{ key: UsagePeriod; label: string }> = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "This week" },
  { key: "monthly", label: "This month" },
];

/**
 * When a period's allowance next refills, phrased for a footnote.
 *
 * Only ever shown for the binding period, since that is the only one whose
 * reset the reader can act on.
 */
function formatReset(iso: string): string | null {
  if (!iso) return null;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (date.toDateString() === now.toDateString()) return `today at ${time}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `tomorrow at ${time}`;

  return `on ${date.toLocaleDateString(undefined, { day: "numeric", month: "long" })}`;
}

/**
 * Smart Detection usage, as a labelled block at the foot of the note rail.
 *
 * Shows all three allowances — daily, weekly and monthly — because a scan is
 * gated by whichever runs out first, so showing only one can tell the reader
 * they have hundreds of scans left while the daily limit blocks the next
 * click. The old floating indicator carried all three in a hover tooltip; the
 * first version of this component kept only the monthly figure, which lost
 * that information rather than relabelling it.
 *
 * The binding period — the one exceeded, or otherwise the closest to its
 * limit — is toned and carries the reset time, since it is the only one the
 * reader can act on.
 */
/** The block's heading, rendered in every state so the panel never vanishes. */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="usage-meter card rounded-xl p-4">
    <Typography variant="body-sm" className="font-medium">
      Smart detection
    </Typography>
    {children}
  </div>
);

const UsageMeter: React.FC = () => {
  const { usageStatus, isLoadingUsage } = useUsageContext();

  // The block is ALWAYS rendered. It used to return null until usage data
  // arrived, which meant it was invisible until the user's first scan --
  // precisely when someone most wants to know what their allowance is. Zero
  // usage is a real, informative state ("0 of 10"), not an absence.
  if (!usageStatus) {
    return (
      <Shell>
        <Typography variant="caption" color="muted" className="block mt-0.5">
          {isLoadingUsage
            ? "Checking your allowance…"
            : "Usage unavailable right now."}
        </Typography>
      </Shell>
    );
  }

  const { usage, exceededPeriod, nextReset } = usageStatus;
  const { isUnlimited, customLimit } = usage;

  if (isUnlimited) {
    return (
      <Shell>
        <Typography variant="caption" color="secondary" className="block mt-0.5">
          Unlimited scans
        </Typography>
      </Shell>
    );
  }

  const rows = PERIODS.map(({ key, label }) => {
    const period = usage[key];
    // An admin's custom limit overrides the daily allowance only — the same
    // rule the old indicator's ring and tooltip applied.
    const limit = key === "daily" && customLimit ? customLimit : period.limit;
    const ratio = limit > 0 ? period.count / limit : 0;

    return { key, label, count: period.count, limit, ratio };
  });

  // Whichever allowance runs out first is the one that actually gates a scan.
  const binding = exceededPeriod
    ? rows.find(r => r.key === exceededPeriod)
    : rows.reduce((worst, r) => (r.ratio > worst.ratio ? r : worst), rows[0]);

  const resetText = binding ? formatReset(nextReset[binding.key]) : null;

  return (
    <Shell>
      <div className="mt-2 space-y-2">
        {rows.map(row => {
          const isBinding = binding?.key === row.key;
          const isExceeded = exceededPeriod === row.key;

          return (
            <div
              key={row.key}
              data-testid={`usage-row-${row.key}`}
              className={clsx(
                isExceeded && "status-failed",
                !isExceeded && isBinding && "status-unknown"
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <Typography variant="caption" color={isBinding ? "default" : "secondary"}>
                  {row.label}
                </Typography>
                <Typography variant="caption" color={isBinding ? "default" : "secondary"}>
                  {`${row.count} of ${row.limit}`}
                </Typography>
              </div>

              <div
                role="progressbar"
                aria-label={`Smart detection scans used ${row.label.toLowerCase()}`}
                aria-valuenow={row.count}
                aria-valuemin={0}
                aria-valuemax={row.limit}
                className="progress-container mt-1 h-1 rounded-full overflow-hidden"
              >
                <div
                  data-testid="usage-meter-fill"
                  className="progress-bar h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(row.ratio * 100, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {resetText && (
        <Typography variant="caption" color="muted" className="block mt-2">
          {`${binding?.label} resets ${resetText}.`}
        </Typography>
      )}
    </Shell>
  );
};

export default UsageMeter;
