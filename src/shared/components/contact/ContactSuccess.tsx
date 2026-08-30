// src/shared/components/contact/ContactSuccess.tsx
import React from "react";
import Typography from "core/components/Typography";
import Button from "core/components/Button";
import { Check } from "lucide-react";

/**
 * Props for the ContactSuccess component
 */
interface ContactSuccessProps {
  /**
   * The reference returned by the cloud function, or null when it returned
   * none. An older deployment of the function does not send one, and the
   * card must never render "CC-undefined".
   */
  reference: string | null;
  /** The active campaign's name, or null when there is none */
  campaignName: string | null;
  /** Called when the sender wants to leave for the campaign */
  onBackToCampaign: () => void;
  /** Called when the sender wants to write a second message */
  onWriteAnother: () => void;
}

/**
 * Confirmation that a message was sent.
 *
 * Deliberately a card rendered above the form rather than a page that
 * replaces it: the sender can still read and copy what they wrote, which is
 * the only copy of it they have.
 */
const ContactSuccess: React.FC<ContactSuccessProps> = ({
  reference,
  campaignName,
  onBackToCampaign,
  onWriteAnother,
}) => {
  const heading = reference ? `Sent — reference ${reference}` : "Sent";
  const body = reference
    ? "Quote that reference if you write again about the same thing. Your message stays on this page until you leave, so you can copy it if you want it."
    : "Your message stays on this page until you leave, so you can copy it if you want it.";

  return (
    <div
      role="status"
      className="card card-border rounded-lg p-5 flex items-start gap-4"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 success-icon-bg">
        <Check size={18} className="success-icon" />
      </div>

      <div className="flex-1 min-w-0">
        <Typography variant="h4" className="mb-1">
          {heading}
        </Typography>
        <Typography variant="body-sm" color="secondary">
          {body}
        </Typography>
      </div>

      <div className="flex flex-col gap-2 shrink-0">
        <Button variant="primary" onClick={onBackToCampaign}>
          {campaignName ? `Back to ${campaignName}` : "Back to the campaign"}
        </Button>
        <Button variant="outline" onClick={onWriteAnother}>
          Write another
        </Button>
      </div>
    </div>
  );
};

export default ContactSuccess;
