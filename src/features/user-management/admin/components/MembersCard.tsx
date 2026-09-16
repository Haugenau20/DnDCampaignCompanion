// src/features/user-management/admin/components/MembersCard.tsx
import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import Typography from 'core/components/Typography';
import Input from 'core/components/Input';
import Button from 'core/components/Button';
import EntitySigil from 'core/components/EntitySigil';
import { formatDisplayDate } from 'shared/utils/dateFormatter';
import { Search, UserPlus } from 'lucide-react';
import { memberId, type GroupMember } from '../types';

/** Props for {@link MembersCard}. */
export interface MembersCardProps {
  members: GroupMember[];
  /** The signed-in user's uid, so their own row can be marked. */
  currentUserId?: string;
  loading: boolean;
  /** Disables the invite action while a token is being created. */
  inviting: boolean;
  onInvite: () => void;
  onRemove: (member: GroupMember) => void;
}

/**
 * Shared column template, so the header and the rows cannot drift apart.
 *
 * The action column is a fixed width rather than `auto`, and that is the whole
 * reason this constant exists. Every row is its own grid -- a `<li>` sizes its
 * tracks from its own content, not from its siblings -- so an `auto` final
 * column collapsed to nothing on the rows with no Remove button (your own, and
 * any other admin's) and `minmax(0,1fr)` absorbed the slack. The result was
 * that Role and Joined sat visibly further right on exactly those rows.
 */
const ROW_GRID =
  'grid items-center gap-x-3 gap-y-1 ' +
  'grid-cols-[auto_minmax(0,1fr)_6rem] ' +
  'sm:grid-cols-[auto_minmax(0,1fr)_7rem_10rem_6rem]';

/**
 * Everyone who accepted an invitation.
 *
 * One row per person, name first. There is no status colour and no role badge:
 * a Role column already says what the role is, and saying it twice -- once in
 * words and once in a hue -- is the redundant encoding the design language
 * rules out.
 *
 * The row is one DOM at every width. The metadata wrapper is a flex line under
 * the name on a phone and `display: contents` from `sm` up, which drops its
 * children into their own columns without a second copy of the markup to keep
 * in sync.
 */
const MembersCard: React.FC<MembersCardProps> = ({
  members,
  currentUserId,
  loading,
  inviting,
  onInvite,
  onRemove,
}) => {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? members.filter((member) =>
          `${member.username ?? ''} ${member.role ?? ''}`
            .toLowerCase()
            .includes(needle)
        )
      : members;

    // Admins first, then by name: the people who can act on this page are the
    // ones an admin has come here to check.
    return [...matched].sort((a, b) => {
      const aAdmin = a.role?.toLowerCase() === 'admin';
      const bAdmin = b.role?.toLowerCase() === 'admin';
      if (aAdmin !== bAdmin) return aAdmin ? -1 : 1;
      return (a.username ?? '').localeCompare(b.username ?? '');
    });
  }, [members, query]);

  const inviteButton = (
    <Button
      variant="primary"
      onClick={onInvite}
      disabled={inviting}
      isLoading={inviting}
      startIcon={<UserPlus className="w-4 h-4" />}
      className="min-h-[2.75rem]"
    >
      Invite someone
    </Button>
  );

  return (
    <section className="card rounded-lg" aria-labelledby="members-heading">
      <div className="px-4 sm:px-6 pt-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <Typography
              variant="h2"
              id="members-heading"
              className="font-heading text-xl"
            >
              Members
            </Typography>
            <Typography color="secondary" variant="body-sm">
              {members.length}
            </Typography>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-44 sm:w-56">
              <Input
                aria-label="Search members"
                placeholder="Search members..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                startIcon={<Search className="w-4 h-4" />}
              />
            </div>
            {/* Beside the search from `sm` up; below, it is the full-width
                control above the list instead. */}
            <div className="hidden sm:block">{inviteButton}</div>
          </div>
        </div>

        <div className="sm:hidden mt-3 [&>button]:w-full">{inviteButton}</div>
      </div>

      {/* Column labels, and only where there are columns. The rows say the same
          thing in words at every width, so this is presentation. */}
      <div
        aria-hidden="true"
        className={clsx(
          ROW_GRID,
          'hidden sm:grid px-4 sm:px-6 py-2 border-t border-b card-divider'
        )}
      >
        <span />
        <Typography variant="caption" color="muted" className="uppercase tracking-wide">
          Member
        </Typography>
        <Typography variant="caption" color="muted" className="uppercase tracking-wide">
          Role
        </Typography>
        <Typography variant="caption" color="muted" className="uppercase tracking-wide">
          Joined
        </Typography>
        <span />
      </div>

      {loading ? (
        <div role="status" aria-busy="true" className="px-4 sm:px-6 py-8">
          <span className="sr-only">Loading members</span>
          <div className="space-y-3" aria-hidden="true">
            <div className="h-10 rounded animate-pulse bg-secondary" />
            <div className="h-10 rounded animate-pulse bg-secondary" />
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="px-4 sm:px-6 py-10 text-center border-t card-divider">
          {query ? (
            <Typography color="secondary">
              No members match “{query}”.
            </Typography>
          ) : (
            <Typography color="secondary">
              Nobody has joined yet. Invite someone and their name appears here.
            </Typography>
          )}
        </div>
      ) : (
        /* Rules between rows inside one card, never a box per row. */
        <ul className="divide-y card-divider border-t card-divider">
          {visible.map((member) => {
            const id = memberId(member);
            const isYou = !!currentUserId && id === currentUserId;
            const isAdmin = member.role?.toLowerCase() === 'admin';
            const name = member.username || 'Unknown';
            const joined = member.joinedAt
              ? formatDisplayDate(member.joinedAt, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : null;

            return (
              <li
                key={id || name}
                className={clsx(ROW_GRID, 'px-4 sm:px-6 py-3 min-h-[3.5rem]')}
              >
                <span className="row-span-2 sm:row-span-1 col-start-1 row-start-1">
                  <EntitySigil entityId={id || name} name={name} />
                </span>

                <div className="col-start-2 row-start-1 min-w-0 flex items-center gap-2">
                  <Typography className="font-heading font-medium truncate">
                    {name}
                  </Typography>
                  {isYou && (
                    <Typography
                      variant="caption"
                      color="muted"
                      className="shrink-0 rounded px-1.5 py-0.5 card-subtle card-border"
                    >
                      You
                    </Typography>
                  )}
                </div>

                {/* One cell under the name on a phone; two columns from `sm`. */}
                <div className="col-start-2 row-start-2 sm:row-start-1 sm:col-start-auto flex flex-wrap items-center gap-x-2 sm:contents">
                  <Typography variant="body-sm" color="secondary">
                    {isAdmin ? 'Admin' : 'Member'}
                  </Typography>
                  <Typography
                    variant="body-sm"
                    color="muted"
                    aria-hidden="true"
                    className="sm:hidden"
                  >
                    ·
                  </Typography>
                  {/* `nowrap` so a date never breaks across lines mid-value:
                      at 390px the metadata column is narrow enough that
                      "31. maj 2025" otherwise splits after the month. */}
                  <Typography
                    variant="body-sm"
                    color="secondary"
                    className="whitespace-nowrap"
                  >
                    {joined ? (
                      <>
                        <span className="sm:hidden">joined </span>
                        {joined}
                      </>
                    ) : (
                      '—'
                    )}
                  </Typography>
                </div>

                <div className="col-start-3 row-start-1 row-span-2 sm:row-span-1 sm:col-start-5 justify-self-end">
                  {/* Only what the server already authorises. Removing another
                      admin is not offered, and neither is promoting anyone:
                      role changes are not enforced server-side yet (#1409), so
                      a control for them would be a button that either fails or,
                      worse, succeeds. */}
                  {!isYou && !isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(member)}
                      className="min-h-[2.75rem]"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default MembersCard;
