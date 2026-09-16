import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Typography from 'core/components/Typography';
import Input from 'core/components/Input';
import Button from 'core/components/Button';
import { LogIn } from 'lucide-react';
import clsx from 'clsx';

interface SignInFormProps {
  onSuccess?: () => void;
}

/**
 * The sign-in form.
 *
 * No `Card` and no header of its own. `SignInPage` titles it once; wrapping it
 * in a titled card inside a titled dialog is what produced the two "Sign In"
 * headings that made the case for this phase in the first place.
 *
 * No "Create Account" button either. It promised a path that does not exist
 * without an invitation token, and it is why this form used to swap itself out
 * for a registration form mid-dialog -- a step with no URL and no visible
 * progress. Accounts come from invitations, so the honest thing is a sentence
 * saying so and a link to `/join`.
 */
const SignInForm: React.FC<SignInFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Pass the rememberMe option to signIn
      await signIn(email, password, rememberMe);
      // If we get here, sign in was successful
      onSuccess?.();
    } catch (err) {
      // One message for both fields, deliberately. Saying which of the two was
      // wrong tells an attacker whether an address has an account here.
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        <div className="flex items-center">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className={clsx(
              "h-4 w-4 rounded focus:ring-offset-1",
              `input`,
              `focus:primary card-border`
            )}
            disabled={loading}
          />
          <label
            htmlFor="rememberMe"
            className={clsx(
              "ml-2 block text-sm",
              `typography`
            )}
          >
            Keep me signed in for 30 days
          </label>
        </div>

        {/* Washed ground, hue at the boundary, body ink for the text. Putting
            the hue's own ink on its own wash is the pairing the colour schema
            forbids. */}
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
          disabled={loading}
          className="w-full min-h-[2.75rem]"
          startIcon={<LogIn />}
          isLoading={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t card-divider">
        <Typography className="font-medium mb-1">New to this group?</Typography>
        <Typography variant="body-sm" color="secondary">
          Accounts are created from an invitation. Open the link an admin sent
          you, or{' '}
          <Link to="/join" className="button-link underline">
            paste its token
          </Link>
          .
        </Typography>
      </div>
    </div>
  );
};

export default SignInForm;
