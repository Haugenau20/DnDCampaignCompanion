// src/features/user-management/groups/components/JoinAsExistingUser.tsx
import React, { useState } from 'react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import Input from 'core/components/Input';
import { useUsernameCheck } from '../hooks/useUsernameCheck';
import { useInvitations } from '../hooks/useInvitations';

/** Props for {@link JoinAsExistingUser}. */
export interface JoinAsExistingUserProps {
  token: string;
  /** The name this account uses in the group it is already in, if any. */
  username?: string;
  onJoined: () => Promise<void> | void;
}

/**
 * Joining when you already have an account.
 *
 * Told, not asked: somebody signed in who follows an invite link was
 * previously shown a registration form, which is an account-creation flow
 * offered to a person who already has one.
 *
 * A name is still needed, because a username is per-group -- it is the name
 * the other members of *this* group see. The name from an existing group is
 * offered as the default because it is almost always the right answer.
 */
const JoinAsExistingUser: React.FC<JoinAsExistingUserProps> = ({
  token,
  username,
  onJoined,
}) => {
  const { joinGroupWithToken } = useInvitations();
  const [name, setName] = useState(username ?? '');
  const check = useUsernameCheck(name);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!check.ready || joining) return;
    setJoining(true);
    setError(null);
    try {
      await joinGroupWithToken(token, name.trim());
      await onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join the group');
      setJoining(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card rounded-lg px-6 py-6 space-y-4">
      <div>
        <Typography variant="h2" className="font-heading text-xl mb-1">
          You are already signed in
        </Typography>
        <Typography color="secondary" variant="body-sm">
          {username
            ? `Join as ${username}, or pick a different name for this group.`
            : 'Choose the name the other members of this group will see.'}
        </Typography>
      </div>

      <Input
        label="Your name in this group"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        disabled={joining}
        helperText="3–20 characters. Other members see this name on everything you write."
        error={check.error ?? undefined}
        successMessage={check.ready ? 'That name is free' : undefined}
      />

      {error && (
        <div
          role="alert"
          className="rounded-md border px-3 py-2 feedback-banner feedback-banner-error"
        >
          <Typography variant="body-sm">{error}</Typography>
        </div>
      )}

      <Button
        type="submit"
        disabled={!check.ready || joining}
        isLoading={joining}
        className="w-full min-h-[2.75rem]"
      >
        {name.trim() ? `Join as ${name.trim()}` : 'Join'}
      </Button>
    </form>
  );
};

export default JoinAsExistingUser;
