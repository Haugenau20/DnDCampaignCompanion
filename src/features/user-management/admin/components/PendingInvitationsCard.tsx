// src/features/user-management/admin/components/PendingInvitationsCard.tsx
import React from 'react';
import clsx from 'clsx';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import { formatDisplayDate } from 'shared/utils/dateFormatter';
import type { RegistrationToken } from '../types';

/** Props for {@link PendingInvitationsCard}. */
export interface PendingInvitationsCardProps {
  /** Unaccepted tokens only. Accepted ones are members, and are not shown. */
  invitations: RegistrationToken[];
  loading: boolean;
  onCopyLink: (invitation: RegistrationToken) => void;
  onRevoke: (invitation: RegistrationToken) => void;
}

/**
 * Two columns on a phone, four from `sm`.
 *
 * The actions drop to a row of their own below the invitation rather than
 * sharing the line: "Copy link" and "Revoke" side by side claim about 160px,
 * which at 390px left the note itself roughly 140px and truncated a perfectly
 * ordinary one to "Spare t...". The note is the only thing on the row that
 * identifies the invitation, so it gets the width.
 */
const ROW_GRID =
  'grid items-center gap-x-3 gap-y-1 ' +
  'grid-cols-[auto_minmax(0,1fr)] ' +
  'sm:grid-cols-[auto_minmax(0,1fr)_10rem_auto]';

/**
 * Invitations nobody has accepted yet.
 *
 * The list holds only unaccepted tokens, and there is no filter, toggle or
 * "show all" to reach the rest. A used token's entire content is the member row
 * in the card above -- the two tables this replaced showed the same five people
 * twice, in different vocabularies, and the second telling offered no action
 * worth taking because a used token cannot be un-used.
 *
 * Hence the card's one line of copy, which is the whole data model stated in a
 * sentence: accepted invitations appear above as members.
 */
const PendingInvitationsCard: React.FC<PendingInvitationsCardProps> = ({
  invitations,
  loading,
  onCopyLink,
  onRevoke,
}) => (
  <section className="card rounded-lg" aria-labelledby="invitations-heading">
    <div className="px-4 sm:px-6 pt-5 pb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="flex items-baseline gap-2">
        <Typography
          variant="h2"
          id="invitations-heading"
          className="font-heading text-xl"
        >
          Pending invitations
        </Typography>
        <Typography color="secondary" variant="body-sm">
          {invitations.length}
        </Typography>
      </div>
      <Typography variant="body-sm" color="secondary">
        Accepted invitations appear above as members.
      </Typography>
    </div>

    {loading ? (
      <div role="status" aria-busy="true" className="px-4 sm:px-6 py-8">
        <span className="sr-only">Loading invitations</span>
        <div className="h-10 rounded animate-pulse bg-secondary" aria-hidden="true" />
      </div>
    ) : invitations.length === 0 ? (
      <div className="px-4 sm:px-6 py-10 text-center border-t card-divider">
        <Typography color="secondary">
          No invitations waiting. Everyone you have invited has joined.
        </Typography>
      </div>
    ) : (
      <ul className="divide-y card-divider border-t card-divider">
        {invitations.map((invitation) => {
          const created = invitation.createdAt
            ? formatDisplayDate(invitation.createdAt, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <li
              key={invitation.token}
              className={clsx(ROW_GRID, 'px-4 sm:px-6 py-3 min-h-[3.5rem]')}
            >
              {/* No hue and no letter: there is no-one here yet to derive
                  either from, and borrowing them would promise an identity the
                  row does not have. */}
              <span
                aria-hidden="true"
                data-testid="invitation-placeholder-mark"
                className="row-span-2 sm:row-span-1 col-start-1 row-start-1 self-start mt-1 sm:mt-0 sm:self-center w-7 h-7 entity-sigil-placeholder"
              />

              <div className="col-start-2 row-start-1 min-w-0">
                {invitation.notes ? (
                  <Typography className="font-heading font-medium truncate">
                    {invitation.notes}
                  </Typography>
                ) : (
                  <Typography color="secondary" className="truncate">
                    Not yet sent to anyone
                  </Typography>
                )}
              </div>

              <div className="col-start-2 row-start-2 sm:row-start-1 sm:col-start-3">
                <Typography
                  variant="body-sm"
                  color="secondary"
                  className="whitespace-nowrap"
                >
                  {created ? `Created ${created}` : '—'}
                </Typography>
              </div>

              {/* The token string itself appears nowhere. A truncated stub is
                  not information; the link behind Copy is. */}
              <div className="col-start-2 row-start-3 sm:row-start-1 sm:col-start-4 justify-self-end flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[2.75rem]"
                  onClick={() => onCopyLink(invitation)}
                >
                  Copy link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[2.75rem]"
                  onClick={() => onRevoke(invitation)}
                >
                  Revoke
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

export default PendingInvitationsCard;
