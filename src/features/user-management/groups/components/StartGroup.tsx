// src/features/user-management/groups/components/StartGroup.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { TEXT_LIMITS } from 'core/constants/textLimits';
import Typography from 'core/components/Typography';
import Input from 'core/components/Input';
import Button from 'core/components/Button';
import { useAuth } from '../../auth/hooks/useAuth';
import { useGroups } from '../hooks/useGroups';
import { founderLinkPath, readFounderToken } from '../utils/founder-link';
import FounderSignUp from './FounderSignUp';
import FirstCampaignForm from 'shared/components/FirstCampaignForm';
import { useCampaigns } from '../hooks/useCampaigns';

/** Props for {@link StartGroup}. */
export interface StartGroupProps {
  /** The token from the link; empty when the reader came to paste one. */
  founderToken: string;
}

/** Where the members of a new group are invited from. */
export const INVITE_PATH = '/admin/people';

/** A name in a group: the same bounds `createGroup` and joining apply. */
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

/**
 * Asks for the founder link when the reader has it but did not open it.
 */
const FounderLinkPrompt: React.FC = () => {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const token = readFounderToken(value);

  return (
    <form
      className="card rounded-lg px-6 py-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (token) navigate(founderLinkPath(token));
      }}
    >
      <div>
        <Typography variant="h2" className="font-heading text-xl mb-1">
          Paste your link
        </Typography>
        <Typography color="secondary" variant="body-sm">
          A link to start a group comes from whoever runs Muninn. Paste the
          whole link, or the code after <code>founder=</code>.
        </Typography>
      </div>
      <Input
        label="Link to start a group"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
        error={value.trim() && !token ? 'That is not a link to start a group' : undefined}
      />
      <Button type="submit" disabled={!token} className="w-full min-h-[2.75rem]">
        Continue
      </Button>
    </form>
  );
};

/** Props for {@link NameGroupForm}. */
interface NameGroupFormProps {
  founderToken: string;
  onCreated: (groupId: string) => void;
}

/**
 * Names the group and the founder in it, and spends the link: `createGroup`
 * does both in one transaction, so a link is spent only by a group that
 * exists.
 */
const NameGroupForm: React.FC<NameGroupFormProps> = ({ founderToken, onCreated }) => {
  const { createGroup, activeGroupUserProfile } = useGroups();
  const { reloadUserContext } = useAuth();
  const [name, setName] = useState('');
  // Someone already in a group is offered the name they use there, once it
  // has loaded, unless they have started typing one.
  const [username, setUsername] = useState(activeGroupUserProfile?.username ?? '');
  const knownName = activeGroupUserProfile?.username;
  useEffect(() => {
    if (knownName) setUsername((current) => current || knownName);
  }, [knownName]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedUsername = username.trim();
  const usernameError =
    trimmedUsername && (trimmedUsername.length < USERNAME_MIN || trimmedUsername.length > USERNAME_MAX)
      ? `Name must be ${USERNAME_MIN}–${USERNAME_MAX} characters`
      : undefined;
  const canSubmit = !!name.trim() && !!trimmedUsername && !usernameError && !creating;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setCreating(true);
    setError(null);
    try {
      const groupId = await createGroup({
        name: name.trim(),
        username: trimmedUsername,
        founderToken,
      });
      // A brand-new account had no profile until `createGroup` wrote one, so
      // the context found none at sign-in: load it now, with the new group.
      await reloadUserContext();
      onCreated(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the group');
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card rounded-lg px-6 py-6 space-y-4">
      <div>
        <Typography variant="h2" className="font-heading text-xl mb-1">
          Name your group
        </Typography>
        <Typography color="secondary" variant="body-sm">
          A group is the people you play with. Everyone you invite joins it and
          shares its campaigns. You can rename it later.
        </Typography>
      </div>

      <Input
        label="Group name"
        value={name}
        maxLength={TEXT_LIMITS.line}
        onChange={(event) => setName(event.target.value)}
        required
        disabled={creating}
        placeholder="Thursday night table"
      />

      <Input
        label="Your name in this group"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        required
        disabled={creating}
        helperText={`${USERNAME_MIN}–${USERNAME_MAX} characters. Other members see this name on everything you write. It is not an account name.`}
        error={usernameError}
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
        disabled={!canSubmit}
        isLoading={creating}
        className="w-full min-h-[2.75rem]"
      >
        Create the group
      </Button>
    </form>
  );
};

/**
 * A founder link's page (T127): from the link to a group with its first
 * campaign, as one flow rather than three admin pages.
 *
 * 1. **The account**, when the reader is signed out (`FounderSignUp`).
 * 2. **The group**: its name and the founder's name in it. This spends the
 *    link.
 * 3. **The first campaign**, which can be skipped: every member can make it
 *    later from the home page.
 * 4. **The players**: it ends on the page with the invite button.
 *
 * Once the group exists the link is spent, so steps 3 and 4 live in this
 * page's state, not in the URL: reloading after step 2 says the link is used,
 * and the group is already there behind it.
 */
const StartGroup: React.FC<StartGroupProps> = ({ founderToken }) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { createCampaign, setActiveCampaign } = useCampaigns();
  const [groupId, setGroupId] = useState<string | null>(null);

  const goInvite = () => navigate(INVITE_PATH, { replace: true });

  let step: React.ReactNode;
  if (!founderToken) {
    step = <FounderLinkPrompt />;
  } else if (groupId) {
    step = (
      <div className="space-y-6">
        <div
          className="flex items-center gap-2 rounded-md border px-3 py-2 feedback-banner feedback-banner-success"
          role="status"
        >
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <Typography variant="body-sm">Your group is ready.</Typography>
        </div>
        <section className="card rounded-lg px-6 py-6 space-y-4" aria-labelledby="first-campaign-heading">
          <div>
            <Typography variant="h2" id="first-campaign-heading" className="font-heading text-xl mb-1">
              Start your first campaign
            </Typography>
            <Typography color="secondary" variant="body-sm">
              A campaign holds one story: its people, places, quests and
              rumours. Your group can have several.
            </Typography>
          </div>
          <FirstCampaignForm
            onCreate={async ({ name, description }) => {
              const campaignId = await createCampaign(groupId, name, description);
              await setActiveCampaign(campaignId);
              goInvite();
            }}
            secondaryAction={
              <Button type="button" variant="ghost" onClick={goInvite} className="min-h-[2.75rem]">
                Later
              </Button>
            }
          />
        </section>
      </div>
    );
  } else if (user) {
    // As soon as somebody is signed in. The profile need not have loaded: a
    // new founder has none until the group exists, and waiting for the
    // context to give up looking cost seconds on a skeleton.
    step = <NameGroupForm founderToken={founderToken} onCreated={setGroupId} />;
  } else if (loading) {
    step = (
      <div role="status" aria-busy="true">
        <span className="sr-only">Loading</span>
        <div className="h-24 rounded animate-pulse bg-secondary" aria-hidden="true" />
      </div>
    );
  } else {
    step = <FounderSignUp founderToken={founderToken} />;
  }

  return (
    <>
      <div className="-mx-4 -mt-4 py-8 sm:py-10 hero-band">
        <div className="px-4">
          <div className="max-w-xl mx-auto">
            <Typography
              variant="body-sm"
              className="hero-eyebrow text-[11px] font-semibold uppercase tracking-wider"
            >
              You have been invited to start
            </Typography>
            <Typography variant="h1" className="mt-2 text-3xl sm:text-4xl">
              A group in Muninn
            </Typography>
          </div>
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-8">{step}</div>
    </>
  );
};

export default StartGroup;
