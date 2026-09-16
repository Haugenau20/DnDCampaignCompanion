// src/features/user-management/groups/components/JoinTokenPrompt.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import Input from 'core/components/Input';
import Button from 'core/components/Button';

/** Props for {@link JoinTokenPrompt}. */
export interface JoinTokenPromptProps {
  token: string;
  onTokenChange: (token: string) => void;
  onSubmit: () => void;
}

/**
 * The "I have an invite" path.
 *
 * Rendered **only** when there is no `token` in the query. A token that
 * arrived by link is stated rather than re-entered: a pre-filled field asks
 * the reader to check a value they cannot verify and must not edit, and
 * invites them to break a working invitation by typing in it.
 */
const JoinTokenPrompt: React.FC<JoinTokenPromptProps> = ({
  token,
  onTokenChange,
  onSubmit,
}) => (
  <form
    className="card rounded-lg px-6 py-6 space-y-4"
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
  >
    <div>
      <Typography variant="h2" className="font-heading text-xl mb-1">
        Paste your invitation
      </Typography>
      <Typography color="secondary" variant="body-sm">
        An admin of the group sends you a link. If you have the token from it
        rather than the link itself, paste it here.
      </Typography>
    </div>

    <Input
      label="Invitation token"
      value={token}
      onChange={(event) => onTokenChange(event.target.value)}
      required
      placeholder="group1-a1b2c3"
    />

    <Button
      type="submit"
      disabled={!token.trim()}
      className="w-full min-h-[2.75rem]"
    >
      Continue
    </Button>
  </form>
);

export default JoinTokenPrompt;
