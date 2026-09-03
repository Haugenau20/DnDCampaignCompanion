// src/pages/PrivacyPolicyPage.tsx
import React from "react";
import { Database, EyeOff, Trash2 } from "lucide-react";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import Button from "core/components/Button";
import { useNavigation } from "shared/hooks/useNavigation";
import { INACTIVITY_TIMEOUT_TEXT, REMEMBER_ME_TEXT } from "core/constants/time";
import {
  PRIVACY_CONTROLLER,
  PRIVACY_HOSTING_REGION,
  EXTRACTION_FACTS,
  OPENAI_DPA_ACCEPTED,
} from "core/constants/privacy";
import PrivacyLastUpdated from "./privacy/PrivacyLastUpdated";
import PrivacyDataTable from "./privacy/PrivacyDataTable";
import PrivacySectionNav from "./privacy/PrivacySectionNav";

/**
 * One section of the full policy text.
 *
 * Sections are hairline-separated rather than boxed: the page reserves cards
 * for the three things a reader can act on, so that a box means "there is a
 * button in here" instead of meaning nothing.
 */
const Section: React.FC<{
  id: string;
  title: string;
  children: React.ReactNode;
}> = ({ id, title, children }) => (
  <section
    id={id}
    className="scroll-mt-24 py-6 border-t card-divider first:border-t-0 first:pt-0"
  >
    <Typography variant="h2" className="mb-3 text-xl">
      {title}
    </Typography>
    <div className="space-y-3">{children}</div>
  </section>
);

/**
 * The privacy policy.
 *
 * Ordered so the answers come before the prose: three summary cards, then the
 * at-a-glance table, then the full text beside a sticky anchor list. Every
 * factual claim below is traceable to code -- see
 * docs/superpowers/specs/2026-09-03-privacy-policy-design.md -- and anything
 * that could not be traced was cut rather than softened.
 */
const PrivacyPolicyPage: React.FC = () => {
  const { navigateToPage } = useNavigation();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ---- Heading and revision date ---- */}
      <div className="sm:flex sm:items-start sm:justify-between gap-6 mb-8">
        <div>
          <Typography variant="h1" className="mb-2">
            Privacy
          </Typography>
          <Typography color="secondary">
            What the Companion keeps about you, why, and how to get rid of it.
          </Typography>
        </div>
        <PrivacyLastUpdated />
      </div>

      {/* ---- Three summary cards ---- */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <Card.Content>
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 primary" aria-hidden="true" />
              <Typography variant="h3" className="text-base">
                Who holds your data
              </Typography>
            </div>
            <Typography variant="body-sm" color="secondary">
              {PRIVACY_CONTROLLER.name}, {PRIVACY_CONTROLLER.country}, is
              responsible for it. Stored in Google Firebase, in{" "}
              {PRIVACY_HOSTING_REGION}.
            </Typography>
            <Button
              variant="link"
              size="sm"
              className="mt-2 px-0"
              onClick={() => navigateToPage(PRIVACY_CONTROLLER.contactPath)}
            >
              Ask a question
            </Button>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content>
            <div className="flex items-center gap-2 mb-2">
              <EyeOff className="w-4 h-4 primary" aria-hidden="true" />
              <Typography variant="h3" className="text-base">
                No tracking, no ads
              </Typography>
            </div>
            <Typography variant="body-sm" color="secondary">
              No analytics, no advertising, nothing sold or shared with anyone
              for their own purposes. Signing in and "remember me" are kept on
              your own device.
            </Typography>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content>
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-4 h-4 primary" aria-hidden="true" />
              <Typography variant="h3" className="text-base">
                Delete it yourself
              </Typography>
            </div>
            <Typography variant="body-sm" color="secondary">
              Leaving a group and deleting your account are both buttons on your
              profile. You don't have to ask anyone.
            </Typography>
            <Button
              variant="link"
              size="sm"
              className="mt-2 px-0"
              onClick={() => navigateToPage("/profile")}
            >
              Go to your profile
            </Button>
          </Card.Content>
        </Card>
      </div>

      {/* ---- The at-a-glance table ---- */}
      <div className="mb-12">
        <PrivacyDataTable />
      </div>

      {/* ---- The full text ---- */}
      <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-10">
        <PrivacySectionNav />

        <div>
          <Section id="your-rights" title="Your rights">
            <Typography>
              You can see what we hold, correct it, take it with you, or delete
              it. Two of those are buttons rather than requests: your profile
              page lets you edit what you have written and delete your account
              outright. For the rest, ask and a person will answer.
            </Typography>
            <Typography>
              You can also object to how we use your data, or ask us to restrict
              it. If you think we have handled your data badly, you can complain
              to Datatilsynet, the Danish data protection authority — you don't
              need to go through us first.
            </Typography>
          </Section>

          <Section id="what-we-collect" title="What we collect">
            <Typography>
              An email address and a username, so you can sign in and so your
              work can be credited to you. Session state, so you stay signed in
              between visits: your session ends after{" "}
              {INACTIVITY_TIMEOUT_TEXT} of inactivity, or lasts{" "}
              {REMEMBER_ME_TEXT} if you asked to be remembered.
            </Typography>
            <Typography>
              Everything you write in a campaign — chapters, quests, NPCs,
              locations, rumors and your own notes — along with who wrote it and
              when. That is the app; there is no version of it that does not
              store what you type into it.
            </Typography>
            <Typography>
              We do not record which pages you visit or what you click. Session
              activity is detected only to decide whether you are still there.
            </Typography>
          </Section>

          <Section id="groups-and-sharing" title="Groups and sharing">
            <Typography>
              Everything you write in a campaign is visible to the other members
              of that group, credited to the character you were posting as. Your
              private notes are not — they are yours until you share them.
            </Typography>
            <Typography>
              If you leave a group, or delete your account, the chapters,
              quests, NPCs and locations you wrote stay with the group for the
              rest of the table; your name, your characters and your private
              notes are deleted.
            </Typography>
          </Section>

          <Section id="entity-extraction" title="Entity extraction">
            <Typography>
              When you press <strong>Scan note</strong>, the text of that note is
              sent to {EXTRACTION_FACTS.provider} to be read once and returned
              as suggested NPCs, places and quests. It happens only when you
              press that button — never in the background, and never to anything
              you have not asked about.
            </Typography>
            <Typography>
              Only the text of that note leaves the app: not its title, not your
              other notes, and none of your campaign content. The request goes
              through {EXTRACTION_FACTS.product}, whose terms are that your text
              is not used to train their models. It is{" "}
              {EXTRACTION_FACTS.retention}, and it is{" "}
              {EXTRACTION_FACTS.transfer}
              {OPENAI_DPA_ACCEPTED
                ? ", under their data processing addendum and standard contractual clauses."
                : "."}
            </Typography>
            <Typography>
              Scanning is capped at {EXTRACTION_FACTS.caps}. Don't paste
              anything into a note that you would not want processed this way.
            </Typography>
          </Section>

          <Section id="device-storage" title="On your device">
            <Typography>
              Your session preferences — whether you asked to be remembered, and
              which group you were last looking at — are kept on your own
              device, in your browser, not on our servers. There are no
              tracking cookies, because there is nothing tracking you: no
              analytics, no advertising, and no third-party scripts watching
              you read.
            </Typography>
          </Section>

          <Section id="security" title="Security">
            <Typography>
              Sign-in runs through Firebase Authentication, so we never see or
              store your password. Access to campaign data is decided by
              rules on the database itself rather than by the app asking
              politely, and everything is encrypted in transit and at rest by
              Google. Sessions time out on their own after{" "}
              {INACTIVITY_TIMEOUT_TEXT} of inactivity.
            </Typography>
            <Typography>
              No service on the internet can promise perfect security, and we
              won't. What we can say is which measures are actually in place —
              the four above — rather than describing an audit programme that
              does not exist.
            </Typography>
          </Section>

          <Section id="retention" title="Retention and deletion">
            <Typography>
              Your account and everything in it stays until you delete it. There
              is a <strong>Delete account</strong> button in the danger zone of
              your profile page; it removes your account, your profile in every
              group you belong to, your usernames and your private notes, and it
              cannot be undone. You do not need to email anyone to make that
              happen.
            </Typography>
            <Typography>
              The campaign content you wrote stays with the group, so you don't
              take the table's shared history with you when you go. Messages you
              send through the contact form are kept only until your question is
              resolved, and are never used to market anything at you.
            </Typography>
          </Section>

          <Section id="legal-basis" title="Legal basis">
            <Typography>
              We process your account details and campaign content to give you
              the service you signed up for — that is <em>performance of a
              contract</em>. Session handling and access control rest on our{" "}
              <em>legitimate interest</em> in keeping accounts secure. Sending a
              note for entity extraction happens on your <em>consent</em>,
              expressed by pressing the button, and you can simply not press it.
            </Typography>
            <Typography>
              Data is held in Google Firebase in {PRIVACY_HOSTING_REGION}. Two
              things reach outside the EU: entity extraction, described above,
              and Google's own operation of the platform, which can involve
              support access from other countries.
            </Typography>
          </Section>

          <Section id="changes" title="Changes to this page">
            <Typography>
              When this policy changes, the date at the top changes with it and
              the change is listed under "What changed". The date is written by
              hand for exactly that reason — a page that re-dates itself every
              time you open it records nothing at all.
            </Typography>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
