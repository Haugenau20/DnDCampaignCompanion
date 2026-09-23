// src/features/user-management/auth/components/DevEmailLinkShortcut.tsx
import React, { useState } from 'react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import {
  emulatorHost,
  emulatorPorts,
  firebaseConfig,
  useEmulators
} from 'core/services/firebase/config/firebaseConfig';

/** Props for {@link DevEmailLinkShortcut}. */
export interface DevEmailLinkShortcutProps {
  /** The address the sign-in link was just sent to. */
  email: string;
}

/** One entry in the Auth emulator's outbox. */
interface EmulatorOobCode {
  email: string;
  requestType: string;
  oobLink: string;
}

/**
 * Whether the shortcut may render at all. Both conditions, so that a
 * production build is covered twice over: its environment sets
 * `REACT_APP_USE_EMULATORS=false`, and it is not a development build.
 */
export const devEmailLinkShortcutEnabled = (): boolean =>
  useEmulators && process.env.NODE_ENV === 'development';

/**
 * Dev only: follow the magic link the Auth emulator "sent", without copying it
 * out of the emulator by hand.
 *
 * The emulator never sends mail. It keeps every link in an outbox at
 * `/emulator/v1/projects/{id}/oobCodes`, oldest first; this reads the newest
 * sign-in link for `email` and navigates to it, exactly as clicking it in an
 * inbox would. Renders nothing unless the app is a development build running
 * against the emulators, so it never reaches the live site -- and the outbox
 * it reads only exists on the developer's own machine anyway.
 */
const DevEmailLinkShortcut: React.FC<DevEmailLinkShortcutProps> = ({ email }) => {
  const [opening, setOpening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (!devEmailLinkShortcutEnabled()) return null;

  const openLink = async () => {
    setOpening(true);
    setProblem(null);
    try {
      const outbox = `http://${emulatorHost}:${emulatorPorts.auth}/emulator/v1/projects/${firebaseConfig.projectId}/oobCodes`;
      const response = await fetch(outbox);
      if (!response.ok) throw new Error(`The emulator answered ${response.status}`);
      const { oobCodes = [] } = (await response.json()) as { oobCodes?: EmulatorOobCode[] };
      const links = oobCodes.filter(
        (code) =>
          code.requestType === 'EMAIL_SIGNIN' &&
          code.email.toLowerCase() === email.trim().toLowerCase()
      );
      const newest = links[links.length - 1];
      if (!newest) {
        setProblem(`The emulator has no sign-in link for ${email}.`);
        setOpening(false);
        return;
      }
      window.location.assign(newest.oobLink);
    } catch (err) {
      setProblem(
        `Could not read the emulator's outbox: ${err instanceof Error ? err.message : String(err)}`
      );
      setOpening(false);
    }
  };

  return (
    <div className="rounded-md border border-dashed card-border px-3 py-3 space-y-2" data-testid="dev-email-link-shortcut">
      <Typography variant="body-sm" color="secondary">
        Dev only: the emulator does not send mail.
      </Typography>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openLink}
        isLoading={opening}
        disabled={opening}
      >
        Open the emulator&apos;s link
      </Button>
      {problem && (
        <Typography variant="body-sm" role="alert">
          {problem}
        </Typography>
      )}
    </div>
  );
};

export default DevEmailLinkShortcut;
