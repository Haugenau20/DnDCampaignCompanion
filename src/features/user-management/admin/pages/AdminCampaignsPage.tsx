// src/features/user-management/admin/pages/AdminCampaignsPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import Typography from 'core/components/Typography';
import Input from 'core/components/Input';
import Button from 'core/components/Button';
import EntitySigil from 'core/components/EntitySigil';
import DeleteConfirmationDialog from 'shared/components/DeleteConfirmationDialog';
import { formatDisplayDate } from 'shared/utils/dateFormatter';
import { Plus, Search } from 'lucide-react';
import type { Campaign } from 'core/types/user';
import { useGroups } from '../../groups/hooks/useGroups';
import { useCampaigns } from '../../groups/hooks/useCampaigns';
import CampaignFormDialog from '../components/CampaignFormDialog';
import { useAdminOutlet } from './admin-outlet';
import { memberId } from '../types';

/**
 * Shared column template, so the header and the rows cannot drift apart.
 *
 * The action column is fixed rather than `auto` for the reason `MembersCard`
 * records: every row is its own grid, so an `auto` final track sizes to that
 * row's own content and the columns before it shift.
 */
const ROW_GRID =
  'grid items-center gap-x-3 gap-y-1 ' +
  'grid-cols-[auto_minmax(0,1fr)_auto] ' +
  'sm:grid-cols-[auto_minmax(0,1fr)_13rem_auto]';

/**
 * `/admin/campaigns`.
 *
 * Rows, not tiles. The unit of this product is a row you scan: two campaigns
 * were rendered as half-width cards, which gave a one-line description the
 * width of a paragraph and made a list of three look like a dashboard.
 *
 * The active campaign is marked, which is the one thing this view could not
 * tell you before -- and it is marked in words beside a mark, never by colour
 * alone.
 */
const AdminCampaignsPage: React.FC = () => {
  const { activeGroupId, activeGroup } = useGroups();
  const {
    campaigns,
    activeCampaignId,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaigns,
  } = useCampaigns();

  // Members come from the band's single fetch, only to put a name to
  // `createdBy`. A uid is not metadata anybody can read.
  const { members } = useAdminOutlet();

  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);

  const reload = useCallback(async () => {
    if (!activeGroupId) return;
    setLoading(true);
    try {
      setRows(await getCampaigns(activeGroupId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [activeGroupId, getCampaigns]);

  useEffect(() => {
    reload();
  }, [reload]);

  // The context's list is authoritative once it has one; the local fetch is
  // what fills the gap on a cold load of this route.
  const source = campaigns.length > 0 ? campaigns : rows;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? source.filter((campaign) =>
          `${campaign.name} ${campaign.description ?? ''}`
            .toLowerCase()
            .includes(needle)
        )
      : source;

    return [...matched].sort((a, b) => {
      const at = new Date(a.createdAt as string | Date).getTime();
      const bt = new Date(b.createdAt as string | Date).getTime();
      return bt - at;
    });
  }, [source, query]);

  const handleSubmit = async (values: { name: string; description: string }) => {
    if (!activeGroupId) throw new Error('No active group selected');
    if (editing) {
      await updateCampaign(editing.id, values);
    } else {
      await createCampaign(activeGroupId, values.name, values.description);
    }
    await reload();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteCampaign(pendingDelete.id);
    setPendingDelete(null);
    await reload();
  };

  const groupName = activeGroup?.name ?? 'this group';

  /**
   * Who made this campaign, by name.
   *
   * Metadata, not authority -- the same rule the group view follows for
   * `createdBy`. Omitted rather than shown as a raw uid when the creator has
   * since left the group.
   */
  const authorFor = (campaign: Campaign) =>
    members.find((member) => memberId(member) === campaign.createdBy)?.username;

  const newCampaignButton = (
    <Button
      variant="primary"
      onClick={() => {
        setEditing(null);
        setFormOpen(true);
      }}
      startIcon={<Plus className="w-4 h-4" />}
      className="min-h-[2.75rem]"
    >
      New campaign
    </Button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pb-10 space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-md border px-4 py-3 feedback-banner feedback-banner-error"
        >
          <Typography>{error}</Typography>
        </div>
      )}

      <section className="card rounded-lg" aria-labelledby="campaigns-heading">
        <div className="px-4 sm:px-6 pt-5 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <Typography
                variant="h2"
                id="campaigns-heading"
                className="font-heading text-xl"
              >
                Campaigns
              </Typography>
              <Typography color="secondary" variant="body-sm">
                {source.length}
              </Typography>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-44 sm:w-56">
                <Input
                  aria-label="Search campaigns"
                  placeholder="Search campaigns..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  startIcon={<Search className="w-4 h-4" />}
                />
              </div>
              <div className="hidden sm:block">{newCampaignButton}</div>
            </div>
          </div>

          <div className="sm:hidden mt-3 [&>button]:w-full">
            {newCampaignButton}
          </div>
        </div>

        <div
          aria-hidden="true"
          className={clsx(
            ROW_GRID,
            'hidden sm:grid px-4 sm:px-6 py-2 border-t border-b card-divider'
          )}
        >
          <span />
          <Typography variant="caption" color="muted" className="uppercase tracking-wide">
            Campaign
          </Typography>
          <Typography variant="caption" color="muted" className="uppercase tracking-wide">
            Created
          </Typography>
          <span />
        </div>

        {loading ? (
          <div role="status" aria-busy="true" className="px-4 sm:px-6 py-8">
            <span className="sr-only">Loading campaigns</span>
            <div className="space-y-3" aria-hidden="true">
              <div className="h-10 rounded animate-pulse bg-secondary" />
              <div className="h-10 rounded animate-pulse bg-secondary" />
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4 sm:px-6 py-10 text-center border-t card-divider">
            {query ? (
              <Typography color="secondary">
                No campaigns match “{query}”.
              </Typography>
            ) : (
              <>
                <Typography color="secondary" className="mb-4">
                  {groupName} has no campaigns yet. A campaign is where the
                  party's story, quests and people live.
                </Typography>
                {newCampaignButton}
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y card-divider border-t card-divider">
            {visible.map((campaign) => {
              const isActive = campaign.id === activeCampaignId;
              const created = campaign.createdAt
                ? formatDisplayDate(campaign.createdAt, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : null;

              return (
                <li
                  key={campaign.id}
                  className={clsx(ROW_GRID, 'px-4 sm:px-6 py-3 min-h-[3.5rem]')}
                >
                  <span className="row-span-2 sm:row-span-1 col-start-1 row-start-1">
                    <EntitySigil entityId={campaign.id} name={campaign.name} />
                  </span>

                  <div className="col-start-2 row-start-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Typography className="font-heading font-medium truncate">
                        {campaign.name}
                      </Typography>
                      {/* In words, inside a neutral chip. The campaign you are
                          in is a fact worth stating, and stating it by tinting
                          the row would encode it by colour alone. */}
                      {isActive && (
                        <Typography
                          variant="caption"
                          color="muted"
                          className="shrink-0 rounded px-1.5 py-0.5 card-subtle card-border"
                        >
                          Current
                        </Typography>
                      )}
                    </div>
                    {campaign.description && (
                      <Typography
                        variant="body-sm"
                        color="secondary"
                        className="truncate"
                      >
                        {campaign.description}
                      </Typography>
                    )}
                  </div>

                  <div className="col-start-2 row-start-3 sm:row-start-1 sm:col-start-3">
                    <Typography
                      variant="body-sm"
                      color="secondary"
                      className="whitespace-nowrap"
                    >
                      {created ? `Created ${created}` : '—'}
                    </Typography>
                    {authorFor(campaign) && (
                      <Typography
                        variant="body-sm"
                        color="secondary"
                        className="whitespace-nowrap"
                      >
                        by {authorFor(campaign)}
                      </Typography>
                    )}
                  </div>

                  <div className="col-start-3 row-start-1 row-span-2 sm:row-span-1 sm:col-start-4 justify-self-end flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[2.75rem]"
                      onClick={() => {
                        setEditing(campaign);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[2.75rem]"
                      onClick={() => setPendingDelete(campaign)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <CampaignFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={
          editing
            ? { name: editing.name, description: editing.description ?? '' }
            : undefined
        }
        onSubmit={handleSubmit}
      />

      {/* The blast radius is not a guess: `deleteCampaign` runs a Cloud
          Function that recursively deletes the campaign's NPCs, locations,
          quests, rumours, chapters and saga, plus every member's notes for it.
          Saying so is the difference between a confirmation and a formality. */}
      <DeleteConfirmationDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        itemType="campaign"
        itemName={pendingDelete?.name ?? ''}
        message={`Delete “${pendingDelete?.name ?? ''}”? The campaign and everything recorded in it — its NPCs, locations, quests, rumours, chapters and saga, and every member's notes for it — is removed for all of ${groupName}. This cannot be undone.`}
      />
    </div>
  );
};

export default AdminCampaignsPage;
