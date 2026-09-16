// src/features/user-management/admin/pages/AdminGroupPage.tsx
import React, { useEffect, useState } from 'react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import Input from 'core/components/Input';
import Dialog from 'core/components/Dialog';
import { formatDisplayDate } from 'shared/utils/dateFormatter';
import { Check, Copy, Plus } from 'lucide-react';
import { useGroups } from '../../groups/hooks/useGroups';
import { useAdminOutlet } from './admin-outlet';
import { memberId } from '../types';
import LeaveGroupDialog from '../../profiles/components/LeaveGroupDialog';

/**
 * `/admin/group` -- what this group is, and the two ways out of it.
 *
 * The closing note that told the reader to use the "Users" and "Registration
 * Tokens" tabs is gone, and nothing replaces it. The navigation is three links
 * at the top of the page now; a workspace that has to explain its own tabs was
 * a workspace in the wrong container, which is the argument this whole phase
 * rests on.
 */
const AdminGroupPage: React.FC = () => {
  const { groups, activeGroupId, activeGroup, createGroup } = useGroups();
  const { members } = useAdminOutlet();

  const [copied, setCopied] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const group = groups.find((candidate) => candidate.id === activeGroupId) ?? activeGroup;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopyId = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.id);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy the group id:', err);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createGroup(name.trim(), description.trim());
      setName('');
      setDescription('');
      setCreateOpen(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create the group'
      );
    } finally {
      setCreating(false);
    }
  };

  if (!group) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-10">
        <Typography color="secondary">No group selected.</Typography>
      </div>
    );
  }

  /**
   * Who created the group, as a historical fact.
   *
   * Named carefully: this is *history*, not authority. An admin is any member
   * holding the role and there may be several, so nothing here says "owner",
   * and nothing anywhere says "the admin" in the singular.
   */
  const creator = members.find((member) => memberId(member) === group.createdBy);
  const createdByLabel = creator?.username ?? 'someone no longer in the group';

  /**
   * Whether leaving would strip the group of its last admin.
   *
   * Stated rather than enforced, deliberately. Enforcement means "promote
   * someone first", and promoting is not possible until a `setMemberRole`
   * Cloud Function exists (TODO 2A.1) -- so blocking here would leave the
   * only admin with no way out at all. It would also be theatre: the profile
   * page's own Leave control is a second door onto the same action, and a
   * guard on one door is not a guard.
   *
   * So the consequence is named where the decision is taken.
   */
  const adminCount = members.filter(
    (member) => member.role?.toLowerCase() === 'admin'
  ).length;
  const isLastAdmin = adminCount === 1;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-10 space-y-4">
      <section className="card rounded-lg" aria-labelledby="group-heading">
        <div className="px-4 sm:px-6 py-5 space-y-4">
          <div>
            <Typography
              variant="h2"
              id="group-heading"
              className="font-heading text-2xl break-words"
            >
              {group.name}
            </Typography>
            {group.description && (
              <Typography color="secondary" className="mt-1">
                {group.description}
              </Typography>
            )}
          </div>

          {/* Facts about the group, in sans, as metadata rather than fields.
              There is no Edit control: nothing in the service or the Cloud
              Functions can rename a group, and a button that cannot do its job
              is worse than its absence -- the one this replaces had no
              `onClick` at all. */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t card-divider">
            <div>
              <Typography variant="caption" color="muted" className="uppercase tracking-wide">
                Created by
              </Typography>
              <dd>
                <Typography>{createdByLabel}</Typography>
              </dd>
            </div>
            <div>
              <Typography variant="caption" color="muted" className="uppercase tracking-wide">
                Created
              </Typography>
              <dd>
                <Typography>
                  {formatDisplayDate(group.createdAt, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
              </dd>
            </div>
          </dl>

          {/* Nobody types this from memory, so it is a value to copy rather
              than a field to read. */}
          <div className="pt-2 border-t card-divider">
            <Typography variant="caption" color="muted" className="uppercase tracking-wide">
              Group ID
            </Typography>
            <div className="mt-1 flex items-center gap-2 rounded-md p-2 card-subtle card-border">
              <code className="font-mono text-xs break-all min-w-0 flex-1">
                {group.id}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyId}
                startIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                className="min-h-[2.75rem]"
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Out of the header, deliberately. Creating a *different* group is not
          an administrative task of this one, and a primary button top-right
          beside this group's own identity invites exactly the wrong click. */}
      <div className="px-1">
        <Button
          variant="ghost"
          onClick={() => setCreateOpen(true)}
          startIcon={<Plus className="w-4 h-4" />}
          className="min-h-[2.75rem]"
        >
          Create a different group
        </Button>
      </div>

      {/* Separated by more space than anything else on the page, and last, so a
          scrolling thumb does not reach it first. A heading, spacing and a
          hairline carry the weight; the fill is spent on the confirm button
          inside the dialog, and red appears nowhere else. */}
      <section
        className="card rounded-lg mt-12"
        aria-labelledby="danger-heading"
      >
        <div className="px-4 sm:px-6 py-5">
          <Typography
            variant="h3"
            id="danger-heading"
            className="font-heading text-lg mb-1"
          >
            Leaving
          </Typography>
          <Typography color="secondary" variant="body-sm" className="mb-4">
            You lose access to {group.name} and everything recorded in it. What
            you have written stays for the others.
          </Typography>

          {isLastAdmin && (
            <div
              role="alert"
              className="rounded-md border px-3 py-2 mb-4 feedback-banner feedback-banner-warning"
            >
              <Typography variant="body-sm">
                You are the only admin. If you leave, nobody will be able to
                invite members, manage campaigns or administer {group.name}.
              </Typography>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={() => setLeaveOpen(true)}
            className="delete-button min-h-[2.75rem]"
          >
            Leave {group.name}
          </Button>
        </div>
      </section>

      <LeaveGroupDialog open={leaveOpen} onClose={() => setLeaveOpen(false)} />

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a different group"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Typography color="secondary" variant="body-sm">
            A group is a table of players. You will be its first admin, and
            {' '}{group.name} is unaffected.
          </Typography>

          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={creating}
            placeholder="The Fellowship"
          />

          <Input
            label="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={creating}
            isTextArea={true}
            rows={3}
          />

          {createError && (
            <div
              role="alert"
              className="rounded-md border px-3 py-2 feedback-banner feedback-banner-error"
            >
              <Typography variant="body-sm">{createError}</Typography>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
              className="min-h-[2.75rem]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || creating}
              isLoading={creating}
              className="min-h-[2.75rem]"
            >
              Create group
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default AdminGroupPage;
