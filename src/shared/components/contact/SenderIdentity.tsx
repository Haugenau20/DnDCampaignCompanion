// src/shared/components/contact/SenderIdentity.tsx
import React from "react";
import Typography from "core/components/Typography";
import Input from "core/components/Input";

/**
 * Props for the SenderIdentity component
 */
interface SenderIdentityProps {
  /** The signed-in user's group username, or null when signed out */
  signedInName: string | null;
  /** The signed-in user's email, or null when signed out */
  signedInEmail: string | null;
  /** Whether to ask for a name and email instead of showing the identity row */
  showInputs: boolean;
  /** Current value of the name input */
  name: string;
  /** Current value of the email input */
  email: string;
  /** Called with the new name */
  onNameChange: (value: string) => void;
  /** Called with the new email */
  onEmailChange: (value: string) => void;
  /** Called when the sender wants to type a different address */
  onUseDifferentEmail: () => void;
  /** Disables the inputs, e.g. while a submission is in flight */
  disabled?: boolean;
}

/**
 * Who the message is coming from.
 *
 * A signed-in sender should not retype a name and an email the app already
 * holds, so by default this states them and says what else is attached. The
 * plain inputs are still one click away, and are all a signed-out sender
 * sees.
 */
const SenderIdentity: React.FC<SenderIdentityProps> = ({
  signedInName,
  signedInEmail,
  showInputs,
  name,
  email,
  onNameChange,
  onEmailChange,
  onUseDifferentEmail,
  disabled = false,
}) => {
  if (showInputs) {
    return (
      <div className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          disabled={disabled}
          placeholder="Your name"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          disabled={disabled}
          placeholder="your.email@example.com"
        />
      </div>
    );
  }

  return (
    <div className="card card-border rounded-lg p-4 flex items-start gap-3">
      <div
        data-testid="sender-avatar"
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-secondary typography"
      >
        {(signedInName || "?").charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <Typography variant="body">
          {`Sending as ${signedInName} · ${signedInEmail}`}
        </Typography>
        <Typography variant="body-sm" color="secondary">
          We'll attach your group, campaign and app version so you don't have to describe them.
        </Typography>
      </div>

      <button
        type="button"
        onClick={onUseDifferentEmail}
        disabled={disabled}
        className="button button-link shrink-0 text-sm"
      >
        Use a different email
      </button>
    </div>
  );
};

export default SenderIdentity;
