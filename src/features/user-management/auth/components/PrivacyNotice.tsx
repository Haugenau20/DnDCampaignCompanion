import React from "react";
import Button from "core/components/Button";
import Typography from "core/components/Typography";
import { ExternalLink } from "lucide-react";
import { INACTIVITY_TIMEOUT_TEXT, REMEMBER_ME_TEXT } from "core/constants/time";
import { ANALYTICS_FACTS } from "core/constants/privacy";
import { useNavigation } from "shared/hooks/useNavigation";
import { useAnalyticsConsent } from "shared/hooks/useAnalyticsConsent";

/**
 * Asks whether Google Analytics may run, beside what the session keeps
 * (T138). Shown until the player answers; the answer can be changed later on
 * the privacy page.
 *
 * The two answers carry equal weight on purpose: saying no must be as easy as
 * saying yes, and neither writes campaign data, so neither earns the accent.
 * There is no close button, because closing would not be an answer.
 */
const PrivacyNotice: React.FC = () => {
  const [consent, setConsent] = useAnalyticsConsent();
  const { navigateToPage } = useNavigation();

  if (consent !== null) return null;

  return (
    <section
      aria-labelledby="privacy-notice-title"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm p-4 z-50 card"
    >
      <Typography id="privacy-notice-title" variant="h4" className="mb-2">
        Privacy
      </Typography>

      <Typography variant="body-sm" color="secondary" className="mb-2">
        May we count visits with {ANALYTICS_FACTS.provider}? It sets cookies
        and tells Google which parts of the site are used, never what is in
        your campaigns. Nothing is sent unless you say yes, and you can change
        your mind on the privacy page.
      </Typography>

      <Typography variant="body-sm" color="secondary" className="mb-3">
        Signing in keeps a session: it ends after {INACTIVITY_TIMEOUT_TEXT} of
        inactivity, or after {REMEMBER_ME_TEXT} if you ask to be remembered.
      </Typography>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="link"
          size="sm"
          className="min-h-[44px] sm:min-h-[32px]"
          onClick={() => navigateToPage("/privacy")}
          endIcon={<ExternalLink size={14} />}
        >
          Privacy policy
        </Button>

        {/* 44px targets on a phone, as elsewhere. */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] sm:min-h-[32px]"
            onClick={() => setConsent("denied")}
          >
            No thanks
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] sm:min-h-[32px]"
            onClick={() => setConsent("granted")}
          >
            Allow analytics
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PrivacyNotice;
