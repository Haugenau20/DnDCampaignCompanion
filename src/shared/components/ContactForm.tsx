// src/shared/components/ContactForm.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { httpsCallable, Functions } from "firebase/functions";
import ServiceRegistry from "core/services/firebase/core/ServiceRegistry";
import Typography from "core/components/Typography";
import Input from "core/components/Input";
import Button from "core/components/Button";
import { APP_VERSION } from "core/constants/app";
import { useAuth, useGroups, useCampaigns } from "features/user-management";
import { useNavigation } from "shared/hooks/useNavigation";
import { Send, AlertCircle, Info } from "lucide-react";
import CategoryChips from "./contact/CategoryChips";
import SenderIdentity from "./contact/SenderIdentity";
import ContactSuccess from "./contact/ContactSuccess";
import {
  ContactCategoryId,
  getContactCategory,
  categoryFromLegacySubject,
} from "./contact/contact-categories";
import { useFunctionsReady } from "./contact/useFunctionsReady";

/** The shortest message we will accept */
const MIN_MESSAGE_LENGTH = 10;

/**
 * Props for the ContactForm component
 */
interface ContactFormProps {
  /** Optional initial message text */
  initialMessage?: string;
}

/**
 * The contact form.
 *
 * Owns validation, payload assembly and submit; every piece of the UI it
 * renders is a presentational component in `./contact/`. The category is a
 * real field rather than a subject string the app deep-links a magic value
 * into, and the email subject is composed server-side from it.
 */
const ContactForm: React.FC<ContactFormProps> = ({ initialMessage = "" }) => {
  const location = useLocation();
  const { navigateToPage } = useNavigation();
  const { user } = useAuth();
  const { activeGroupId, activeGroupUserProfile } = useGroups();
  const { activeCampaignId, activeCampaign } = useCampaigns();
  const { failed: initFailed } = useFunctionsReady();

  const [category, setCategory] = useState<ContactCategoryId | null>(null);
  const [message, setMessage] = useState(initialMessage);
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [useDifferentEmail, setUseDifferentEmail] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [legacySubject, setLegacySubject] = useState<string | null>(null);

  const signedInName = activeGroupUserProfile?.username ?? null;
  const signedInEmail = user?.email ?? null;
  const showIdentityInputs = !user || useDifferentEmail;

  const selectedCategory = category ? getContactCategory(category) : null;

  /**
   * The route the sender came from.
   *
   * `location.pathname` is always "/contact" by the time this renders, which
   * tells a bug report nothing. Entry points pass the originating path as
   * `?from=`; when that is absent the route is genuinely unknown and we send
   * null rather than something misleading.
   */
  const originatingRoute = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("from");
  }, [location.search]);

  // Select the category a legacy `?subject=` deep link refers to. Links such
  // as `/contact?subject=Smart Detection Limit Increase Request` keep working.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefilledSubject = params.get("subject");
    if (!prefilledSubject) {
      return;
    }

    const mapped = categoryFromLegacySubject(prefilledSubject);
    if (mapped) {
      setCategory(mapped);
    } else {
      // Unrecognised: pass it through as free text rather than mislabelling
      // it as a category it is not.
      setLegacySubject(prefilledSubject);
    }
  }, [location.search]);

  const messageTooShort =
    message.trim().length > 0 && message.trim().length < MIN_MESSAGE_LENGTH;

  /**
   * Shown inline under the message field, never in the submit-error banner.
   *
   * Submitting a too-short message sets `messageTouched`, which already
   * reveals the inline warning; putting the same sentence in the banner as
   * well would say it twice.
   */
  const TOO_SHORT_MESSAGE = `Your message needs at least ${MIN_MESSAGE_LENGTH} characters.`;

  /**
   * Validate the form.
   *
   * @returns An error message, or null when the form is ready to send
   */
  const validate = (): string | null => {
    if (!category) {
      return "Please pick a category so we know what we're looking at.";
    }
    if (showIdentityInputs) {
      if (!name.trim()) {
        return "Name is required";
      }
      if (!email.trim()) {
        return "Email is required";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return "Please enter a valid email address";
      }
    }
    if (!message.trim()) {
      return "A message is required";
    }
    if (message.trim().length < MIN_MESSAGE_LENGTH) {
      return TOO_SHORT_MESSAGE;
    }
    return null;
  };

  /**
   * Send the message via the Firebase callable function.
   *
   * @param e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessageTouched(true);

    const validationError = validate();
    if (validationError) {
      // The too-short case already renders inline under the message field
      // (now that messageTouched is set above); showing it again in the
      // banner would just be the same sentence twice.
      setSubmitError(
        validationError === TOO_SHORT_MESSAGE ? null : validationError
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const functions = ServiceRegistry.getInstance().get<Functions>("functions");
      if (!functions) {
        throw new Error("Firebase Functions not available");
      }

      const sendContactEmail = httpsCallable(functions, "sendContactEmail");
      const trimmedReason = reason.trim();

      const result = await sendContactEmail({
        category,
        // Still sent so that an older deployment of the function, which
        // ignores `category`, still produces a meaningful subject line.
        subject: selectedCategory?.subjectLabel ?? legacySubject ?? undefined,
        message: message.trim(),
        reason: trimmedReason || undefined,
        name: showIdentityInputs ? name.trim() : signedInName ?? "",
        email: showIdentityInputs ? email.trim() : signedInEmail ?? "",
        context: {
          groupId: activeGroupId,
          campaignId: activeCampaignId,
          route: originatingRoute,
          appVersion: APP_VERSION,
        },
      });

      const response = result.data as {
        success: boolean;
        message: string;
        reference?: string;
      };

      if (!response?.success) {
        throw new Error(response?.message || "Unexpected response from server");
      }

      // The reference is optional: an older deployment does not return one,
      // and the success card must never render "CC-undefined".
      setReference(response.reference ?? null);
      setShowSuccess(true);
    } catch (error: any) {
      setSubmitError(describeSubmitError(error));
      console.error("Contact form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Clear the message for a second submission, keeping the category.
   *
   * Someone writing again is usually writing about the same area; making
   * them re-pick a chip they just picked is friction with nothing behind it.
   */
  const handleWriteAnother = () => {
    setShowSuccess(false);
    setReference(null);
    setMessage("");
    setReason("");
    setMessageTouched(false);
    setSubmitError(null);
  };

  return (
    <div className="space-y-6">
      {showSuccess && (
        <ContactSuccess
          reference={reference}
          campaignName={activeCampaign?.name ?? null}
          onBackToCampaign={() => navigateToPage("/")}
          onWriteAnother={handleWriteAnother}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Category */}
        <div className="space-y-2">
          <Typography variant="body-sm" className="form-label">
            What's this about?
          </Typography>
          <CategoryChips
            value={category}
            onChange={setCategory}
            disabled={isSubmitting}
          />
        </div>

        {/* Message, with a live counter */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="contact-message" className="form-label text-sm">
              What happened?
            </label>
            <Typography variant="body-sm" color="secondary">
              {`${message.length} characters`}
            </Typography>
          </div>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            onBlur={() => setMessageTouched(true)}
            disabled={isSubmitting}
            rows={6}
            className="input w-full rounded-lg p-3 min-h-[150px] text-[15px] leading-[1.6]"
            placeholder="What you clicked, what happened, and what you expected instead."
          />
          {messageTouched && messageTooShort && (
            <Typography variant="body-sm" color="error">
              {TOO_SHORT_MESSAGE}
            </Typography>
          )}
        </div>

        {/* Guidance that follows the category, beside the field it governs */}
        {selectedCategory?.guidance && (
          <div
            data-testid="category-guidance"
            className="card card-subtle rounded-lg p-3 flex items-start gap-2"
          >
            <Info className="w-4 h-4 mt-1 shrink-0 primary" />
            <Typography variant="body-sm" color="secondary">
              {selectedCategory.guidance}
            </Typography>
          </div>
        )}

        {/* The optional second field, currently smart-detection only */}
        {selectedCategory?.extraFieldLabel && (
          <Input
            label={selectedCategory.extraFieldLabel}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            placeholder="Roughly how much you scan, and what for."
          />
        )}

        <hr className="card-divider border-t" />

        <SenderIdentity
          signedInName={signedInName}
          signedInEmail={signedInEmail}
          showInputs={showIdentityInputs}
          name={name}
          email={email}
          onNameChange={setName}
          onEmailChange={setEmail}
          onUseDifferentEmail={() => setUseDifferentEmail(true)}
          disabled={isSubmitting}
        />

        {/* The init failure is surfaced, but never disables submit: the
            registry may have recovered, and submit reports its own errors. */}
        {initFailed && (
          <Typography variant="body-sm" color="secondary">
            The contact system was slow to start. Sending should still work — if it doesn't, refresh the page.
          </Typography>
        )}

        {submitError && (
          <div className="flex items-center gap-2 p-3 rounded error-bg">
            <AlertCircle className="w-4 h-4 status-failed" />
            <Typography variant="body-sm" color="error">
              {submitError}
            </Typography>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <Typography variant="body-sm" color="secondary">
            A copy goes to your email address.
          </Typography>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? undefined : <Send className="w-4 h-4" />}
            isLoading={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send message"}
          </Button>
        </div>
      </form>
    </div>
  );
};

/**
 * Turn a Firebase callable error into something the sender can act on.
 *
 * @param error - The thrown error
 * @returns A human-readable message
 */
const describeSubmitError = (error: any): string => {
  switch (error?.code) {
    case "functions/invalid-argument":
      return error.message || "Please check your input and try again.";
    case "functions/resource-exhausted":
      return "Too many requests. Please wait before trying again.";
    case "functions/unauthenticated":
      return "Authentication required. Please refresh the page.";
    case "functions/internal":
      return "Server error. Please try again later.";
    case "functions/unavailable":
      return "Service temporarily unavailable. Please try again later.";
    default:
      return error?.message || "Failed to send message. Please try again.";
  }
};

export default ContactForm;
