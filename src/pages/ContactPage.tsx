// src/pages/ContactPage.tsx
import React from "react";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import ContactForm from "shared/components/ContactForm";
import PageShell from "shared/components/page-shell/PageShell";
import { useNavigation } from "shared/hooks/useNavigation";
import { useCampaigns } from "features/user-management";
import { ArrowLeft, Clock } from "lucide-react";

/**
 * The contact page.
 *
 * One centred column. The four prose blocks that used to sit in a right-hand
 * third are gone: three were instructions for the message field, which now
 * carries its own guidance, and the fourth held the response time, which is
 * now the callout below the intro.
 *
 * The frame is `PageShell`'s rather than this file's, at the column width the
 * page already had. The back link goes in the breadcrumb slot because that is
 * the slot for "what sits above the title", and a single link back to the
 * campaign is what this page has instead of a trail.
 *
 * The form sits on a `Card`, like the other twelve forms in the product
 * (D79) -- it is the one thing here you act on, and it is what gives
 * `SenderIdentity`'s recessed block a card to be recessed from.
 */
const ContactPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { activeCampaign } = useCampaigns();

  const backLabel = activeCampaign?.name
    ? `Back to ${activeCampaign.name}`
    : "Back to the campaign";

  return (
    <PageShell
      title="Get in touch"
      subtitle="Bugs, ideas and account questions all land in the same inbox — it's a two-person project, so pick a category and we'll know what we're looking at."
      maxWidth="max-w-[660px]"
      breadcrumb={
        <button
          type="button"
          onClick={() => navigateToPage("/")}
          className="button button-link flex items-center gap-2 text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </button>
      }
    >
      <div className="space-y-6">
        {/* The response expectation, stated where it cannot be missed */}
        <div className="callout-emphasis rounded-r-lg p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 mt-1 shrink-0 primary" />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
            <Typography variant="body" className="font-semibold shrink-0">
              We answer within 1–2 weeks.
            </Typography>
            <Typography variant="body">
              Nothing is monitored around the clock — if the app is broken, say so in the message and we'll look sooner.
            </Typography>
          </div>
        </div>

        <Card>
          <Card.Content>
            <ContactForm />
          </Card.Content>
        </Card>
      </div>
    </PageShell>
  );
};

export default ContactPage;
