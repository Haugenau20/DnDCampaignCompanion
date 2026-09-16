// src/features/user-management/groups/components/JoinAsNewUser.tsx
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Typography from 'core/components/Typography';
import Input from 'core/components/Input';
import Button from 'core/components/Button';
import { validatePassword } from 'shared/utils/password-validation';
import { useUsernameCheck } from '../hooks/useUsernameCheck';
import { useInvitations } from '../hooks/useInvitations';

/** Props for {@link JoinAsNewUser}. */
export interface JoinAsNewUserProps {
  token: string;
  onJoined: () => Promise<void> | void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creating an account from an invitation.
 *
 * A **step on this page**, not a form swapped in where another one was. The
 * order is the order of the sentence the page is telling: the invitation is
 * confirmed above, then your name in this group, then the account itself.
 *
 * The name comes before the email deliberately. It is the field people get
 * wrong -- it is not an account name, it is what the rest of the table will see
 * beside everything you write -- so it is asked first, while attention is on
 * the group rather than on credentials.
 */
const JoinAsNewUser: React.FC<JoinAsNewUserProps> = ({ token, onJoined }) => {
  const { signUpWithToken } = useInvitations();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameCheck = useUsernameCheck(username);

  /**
   * What is still wrong with the password, in the validator's own words.
   *
   * `validatePassword('')` returns every rule as a message, so an untouched
   * field shows the full list and the list shrinks as they are satisfied. The
   * rules are therefore never restated in prose here -- an earlier draft of
   * this component described them by hand and silently omitted the
   * special-character requirement, which would have left the Join button
   * disabled with nothing on screen explaining why.
   */
  const passwordCheck = useMemo(() => validatePassword(password), [password]);

  const emailValid = EMAIL.test(email);
  const passwordsMatch = !!password && password === confirm;
  const canSubmit =
    nameCheck.ready && emailValid && passwordCheck.isValid && passwordsMatch;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signUpWithToken(token, email.trim(), password, username.trim());
      await onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card rounded-lg px-6 py-6 space-y-4">
      <div>
        <Typography variant="h2" className="font-heading text-xl mb-1">
          Create your account
        </Typography>
        <Typography color="secondary" variant="body-sm">
          You only need one. It carries across every group you are invited to.
        </Typography>
      </div>

      <Input
        label="Your name in this group"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        required
        disabled={submitting}
        helperText="3–20 characters. Other members see this name on everything you write. It is not an account name."
        error={nameCheck.error ?? undefined}
        successMessage={nameCheck.ready ? 'That name is free' : undefined}
      />

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        disabled={submitting}
        error={email && !emailValid ? 'Enter a valid email address' : undefined}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        disabled={submitting}
        helperText={
          passwordCheck.isValid
            ? 'That password meets every requirement.'
            : passwordCheck.errors.join('. ')
        }
      />

      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        required
        disabled={submitting}
        error={confirm && !passwordsMatch ? "Passwords don't match" : undefined}
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
        disabled={!canSubmit || submitting}
        isLoading={submitting}
        className="w-full min-h-[2.75rem]"
      >
        Join
      </Button>

      <Typography variant="body-sm" color="secondary">
        Already have an account?{' '}
        <Link to="/signin" className="button-link underline">
          Sign in first
        </Link>{' '}
        and the invitation will still be here.
      </Typography>
    </form>
  );
};

export default JoinAsNewUser;
