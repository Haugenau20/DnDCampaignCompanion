// src/shared/components/FirstCampaignForm.tsx
import React, { useState } from 'react';
import { TEXT_LIMITS } from 'core/constants/textLimits';
import Input from 'core/components/Input';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';

/** What the form asks for. */
export interface FirstCampaignValues {
  name: string;
  description: string;
}

/** Props for {@link FirstCampaignForm}. */
export interface FirstCampaignFormProps {
  /**
   * Makes the campaign. A rejection's message is shown in the form, which
   * stays filled in for another try.
   */
  onCreate: (values: FirstCampaignValues) => Promise<void>;
  /** Beside the submit button, e.g. a way to skip this step. */
  secondaryAction?: React.ReactNode;
}

/**
 * The first campaign of a group, asked for where its absence is noticed
 * (T127): on a founder's first run, and on the panel every member sees while
 * their group has none. Every member may make one, as the rules already
 * allow, so a table whose founder is not online can still start.
 *
 * Presentational: the caller makes the campaign, so this owns no data hook.
 * The same two fields as the admin page's dialog, inline rather than in a
 * dialog: here the form is the whole point of the panel.
 */
const FirstCampaignForm: React.FC<FirstCampaignFormProps> = ({ onCreate, secondaryAction }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), description: description.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the campaign');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Campaign name"
        value={name}
        maxLength={TEXT_LIMITS.line}
        onChange={(event) => setName(event.target.value)}
        required
        disabled={saving}
        placeholder="The Sunken Library"
      />

      <Input
        label="Description (optional)"
        value={description}
        maxLength={TEXT_LIMITS.text}
        onChange={(event) => setDescription(event.target.value)}
        disabled={saving}
        placeholder="One line about what this campaign is"
        isTextArea={true}
        rows={2}
      />

      {error && (
        <div
          role="alert"
          className="rounded-md border px-3 py-2 feedback-banner feedback-banner-error"
        >
          <Typography variant="body-sm">{error}</Typography>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={!name.trim() || saving}
          isLoading={saving}
          className="min-h-[2.75rem]"
        >
          Create campaign
        </Button>
        {secondaryAction}
      </div>
    </form>
  );
};

export default FirstCampaignForm;
