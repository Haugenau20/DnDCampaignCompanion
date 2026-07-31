// components/features/dashboard/RumorPrompt.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import clsx from 'clsx';
import { useNavigation } from 'shared/context/NavigationContext';

interface RumorPromptProps {
  /** Number of rumors recorded. The prompt only renders when this is zero. */
  rumorCount: number;
}

/**
 * Shown only when the campaign has no rumors at all.
 *
 * A zero in the stats strip states the absence; this says what to do about it. The
 * dashed border marks it as a prompt rather than content, so it reads differently
 * from the cards around it and disappears the moment there is a real rumor to show.
 */
const RumorPrompt: React.FC<RumorPromptProps> = ({ rumorCount }) => {
  const { navigateToPage } = useNavigation();

  if (rumorCount > 0) return null;

  return (
    <div
      className={clsx(
        'flex flex-col gap-2 items-start px-5 py-5 rounded-lg',
        'border border-dashed border-card bg-card'
      )}
      data-testid="rumor-prompt"
    >
      <Typography variant="h4" className="text-base">No rumors yet</Typography>
      <Typography variant="body-sm" color="secondary" className="text-sm">
        Tavern gossip is the cheapest way to seed a session. Add the first one.
      </Typography>
      <Button
        variant="primary"
        size="sm"
        className="mt-1"
        onClick={() => navigateToPage('/rumors/create')}
      >
        Add a rumor
      </Button>
    </div>
  );
};

export default RumorPrompt;
