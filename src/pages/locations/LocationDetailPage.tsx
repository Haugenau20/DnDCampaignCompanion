// src/pages/locations/LocationDetailPage.tsx
import React, { useMemo, useState } from 'react';
import { useLocation as useRouterLocation, useParams } from 'react-router-dom';
import { ArrowUpRight, Pencil, X } from 'lucide-react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import Select from 'core/components/Select';
import EntitySigil from 'core/components/EntitySigil';
import ImageSlot from 'core/components/ImageSlot';
import { entityImagePrefix } from 'core/services/firebase/storage/ImageStorageService';
import {
  useLocations,
  useNPCs,
  useQuests,
  useRumors,
  referencesLocation,
  WhereThisSits,
  DeleteLocationDialog,
  buildLocationIndex,
  insideCountOf,
  ancestorPathOf,
  formatLocationType,
  locationMetaLine,
  KNOWLEDGE_OPTIONS,
} from 'features/campaign-entities';
import type { Location, LocationType, LocationStatus } from 'features/campaign-entities';
import { useUser, useGroups, useCampaigns } from 'features/user-management';
import AttributionInfo from 'shared/components/AttributionInfo';
import ImageUploadControl from 'shared/components/ImageUploadControl';
import { useImageAttachment } from 'shared/hooks/useImageAttachment';
import AttachTray from 'shared/components/attach-tray/AttachTray';
import StateLadder from 'shared/components/row-controls/StateLadder';
import { EntityPageShell, EntityPageSection, FieldPrompt } from 'shared/components/entity-page';
import { usePageGate, GatedContent } from 'shared/components/gated';
import { useQuickAdd } from 'shared/context/QuickAddContext';
import { useNavigation } from 'shared/context/NavigationContext';
import { formatNoteDate, toNoteDate } from 'shared/utils/dateFormatter';
import { getUserName, getActiveCharacterName } from 'core/utils/user-utils';
import { InlineEditor } from 'shared/components/inline-edit';
import { rumorTitleText } from 'features/campaign-entities';

/** The eight kinds a place can be, as the select offers them. */
const TYPE_OPTIONS: LocationType[] = [
  'region',
  'city',
  'town',
  'village',
  'dungeon',
  'landmark',
  'building',
  'poi',
];

/** What points at this place, from the three collections that can. */
interface InboundLink {
  key: string;
  id: string;
  name: string;
  detail: string;
  href: string;
}

/**
 * The designed not-found. A bad id is an ordinary event -- a stale bookmark, a
 * deleted place, a link shared after the fact -- so it gets a designed state
 * and a way onward rather than a blank page.
 */
const LocationNotFound: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="card rounded-lg p-10 flex flex-col items-center text-center gap-3">
    <Typography variant="h3">No place with that id</Typography>
    <Typography color="secondary" className="max-w-md">
      It may have been deleted, or the link may point at a different campaign.
    </Typography>
    <Button variant="outline" onClick={onBack} className="mt-2">
      Back to Locations
    </Button>
  </div>
);

/**
 * One location, in full, at `/locations/:locationId`.
 *
 * The page exists because **a row cannot hold a tree** (§2.2). The directory's
 * answer to "what is inside this?" was to expand a parent into a full record
 * card, print a "Locations in X" heading, and nest a *child record card* inside
 * it -- two records at identical weight, unbounded as depth grows, and the
 * clumsiness this whole phase was opened to fix.
 *
 * Everything here is edited where it is read (§7). There is no link to
 * `/locations/edit/:id` from this page, by design; the route itself is `15-8`'s
 * to retire.
 *
 * **What this page deliberately does not do**, both of which the visual
 * reference shows:
 *
 * - No per-field attribution. The reference prints "DungeonMaster · 31 May"
 *   under the description; `ContentAttribution` holds created-by and
 *   last-modified-by and **nothing in between** (§8, T005), so a line under one
 *   field would be inventing a history the data does not carry.
 * - No gallery. One picture heads the page (T021); anything more is a
 *   different feature.
 */
const LocationDetailPage: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  /**
   * `15-1`'s contract: quick add navigates here with `quickAddFocus` naming the
   * first unwritten field, and the page consumes it. A location's is `parent`.
   *
   * Honoured only when the record actually has none. *Add a place inside* sets
   * the parent before the record exists, and sending someone who just chose a
   * parent straight to the control for choosing one would be the software
   * ignoring what it was just told.
   */
  const quickAddFocus = (useRouterLocation().state as { quickAddFocus?: string } | null)
    ?.quickAddFocus;
  const { navigateToPage } = useNavigation();
  const { openQuickAdd } = useQuickAdd();
  const { activeGroupUserProfile } = useUser();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();

  const {
    locations,
    isLoading,
    error,
    refreshLocations,
    updateLocation,
    updateLocationNote,
    updateLocationStatus,
    moveLocation,
    deleteLocation,
    createLocation,
  } = useLocations();
  const { npcs } = useNPCs();
  const { quests } = useQuests();
  const { rumors } = useRumors();

  const location = locations.find((candidate) => candidate.id === locationId);

  // `isLoading` folds into the gate's resolving state: `locations` is empty
  // while auth and the campaign restore, and without this the page would claim
  // "no place with that id" for the found-but-not-yet-loaded case.
  const gate = usePageGate('locations', {
    /*
      The data hook now draws the line between "nothing to show yet" and "a
      fetch is in flight" for every consumer at once -- the rule, and the
      measurement behind it, are on `useQuestData`. What this adds is the
      narrower question a detail page asks: not "is the list loaded" but "is
      *this* record loaded", so the page never claims "no such record" for
      one that is simply still on its way.
    */
    loading: isLoading && !location,
    error,
    onRetry: () => {
      void refreshLocations();
    },
  });

  const [editing, setEditing] = useState<'name' | 'description' | 'feature' | 'tag' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const index = useMemo(() => buildLocationIndex(locations), [locations]);
  const insideCount = location ? insideCountOf(index, location.id) : 0;
  const ancestors = useMemo(
    () => (location ? ancestorPathOf(locations, location.id) : []),
    [locations, location]
  );
  const parentName = ancestors.length ? ancestors[ancestors.length - 1].name : undefined;

  /** The NPCs recorded as being here, resolved to records. */
  const peopleHere = useMemo(() => {
    if (!location) return [];
    const ids = location.connectedNPCs ?? [];
    return ids
      .map((id) => npcs.find((npc) => npc.id === id))
      .filter((npc): npc is NonNullable<typeof npc> => Boolean(npc));
  }, [location, npcs]);

  /**
   * What points here -- the one list §3 says a *row* can never hold without
   * becoming a card again.
   *
   * Read-only on purpose: these are other records' references to this one, and
   * the place to change a quest's location is the quest.
   */
  const inbound = useMemo<InboundLink[]>(() => {
    if (!location) return [];
    const out: InboundLink[] = [];

    quests
      .filter((quest) => referencesLocation(quest, location))
      .forEach((quest) =>
        out.push({
          key: `quest-${quest.id}`,
          id: quest.id,
          name: quest.title,
          detail: `quest, ${quest.status}`,
          href: `/quests/${quest.id}`,
        })
      );

    (rumors ?? [])
      .filter(
        (rumor) =>
          referencesLocation(rumor, location) ||
          rumor.relatedLocations?.includes(location.id)
      )
      .forEach((rumor) =>
        out.push({
          key: `rumor-${rumor.id}`,
          id: rumor.id,
          name: rumorTitleText(rumor),
          // "Disproved", never "False" (§10): it describes what the party did.
          detail: `rumour, ${rumor.status === 'false' ? 'disproved' : rumor.status}`,
          href: `/rumors?highlight=${rumor.id}`,
        })
      );

    // An NPC whose own record says they are here, but who is not in this
    // location's list. The two directions are stored separately and disagree
    // often enough that hiding one of them would be hiding the disagreement.
    npcs
      .filter(
        (npc) =>
          referencesLocation(npc, location) &&
          !(location.connectedNPCs ?? []).includes(npc.id)
      )
      .forEach((npc) =>
        out.push({
          key: `npc-${npc.id}`,
          id: npc.id,
          name: npc.name,
          detail: 'person, recorded as being here',
          href: `/npcs/${npc.id}`,
        })
      );

    return out;
  }, [location, quests, rumors, npcs]);

  /** Oldest first, so the history reads as one. */
  const notes = useMemo(
    () => [...(location?.notes ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [location]
  );

  // Every write re-reads this page's own store rather than patching state
  // locally: if another player changed the same record first, the refetch is
  // where that becomes visible.
  const save = async (patch: Partial<Location>) => {
    if (!location) return;
    await updateLocation(location.id, patch);
    await refreshLocations();
  };

  const picture = useImageAttachment({
    prefix:
      location && activeGroupId && activeCampaignId
        ? entityImagePrefix(activeGroupId, activeCampaignId, 'locations', location.id)
        : null,
    current: location?.image,
    save: (image) => save({ image }),
  });

  const addNote = async (text: string) => {
    if (!location) return;
    const author =
      getActiveCharacterName(activeGroupUserProfile) ||
      getUserName(activeGroupUserProfile) ||
      undefined;
    // The context stamps the date itself.
    await updateLocationNote(location.id, {
      date: toNoteDate(),
      text,
      ...(author ? { author } : {}),
    });
    await refreshLocations();
  };

  /**
   * A feature becomes a real place (§6.4, item 7).
   *
   * `features` are free text on the record and children are documents; they are
   * different things, and this is the one action that moves a name across --
   * for when the party actually arrives somewhere that was a line of scenery.
   */
  const promoteFeature = async (feature: string) => {
    if (!location) return;
    await createLocation({
      name: feature,
      type: 'poi',
      status: 'known',
      description: '',
      parentId: location.id,
      features: [],
      connectedNPCs: [],
      relatedQuests: [],
      notes: [],
      tags: [],
    });
    await save({
      features: (location.features ?? []).filter((f) => f !== feature),
    });
  };

  const handleDelete = async (childStrategy: Parameters<typeof deleteLocation>[1]) => {
    if (!location) return;
    await deleteLocation(location.id, childStrategy);
    navigateToPage('/locations');
  };

  const canAct = gate.canAct;

  return (
    <>
      {gate.state !== 'ready' || !location ? (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Typography variant="h1" className="mb-8">
            Location
          </Typography>
          <GatedContent gate={gate}>
            <LocationNotFound onBack={() => navigateToPage('/locations')} />
          </GatedContent>
        </div>
      ) : (
        <EntityPageShell
          breadcrumb={[
            { label: 'Locations', href: '/locations' },
            ...ancestors.map((ancestor) => ({
              label: ancestor.name,
              href: `/locations/${ancestor.id}`,
            })),
            { label: location.name },
          ]}
          entityId={location.id}
          name={location.name}
          meta={locationMetaLine(
            location,
            parentName,
            insideCount,
            location.lastVisited ? formatNoteDate(location.lastVisited) : undefined
          )}
          image={
            <ImageSlot
              className="h-40 sm:h-56"
              label={`${location.name} — no image added`}
              image={location.image}
              alt={location.name}
            />
          }
          imageControl={
            canAct && (
              <ImageUploadControl
                subject="picture"
                hasImage={Boolean(location.image)}
                onUpload={picture.upload}
                onRemove={picture.remove}
              />
            )
          }
          bandControl={
            canAct && (
              <StateLadder
                label="Knowledge"
                tone="band"
                options={KNOWLEDGE_OPTIONS}
                value={location.status}
                ariaLabel={`Knowledge of ${location.name}`}
                onChange={(status: LocationStatus) =>
                  updateLocationStatus(location.id, status)
                }
              />
            )
          }
          actions={
            canAct && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  openQuickAdd('location', { parentId: location.id })
                }
              >
                Add a place inside
              </Button>
            )
          }
          aside={
            <>
              {/* ---------------------------- who is here --------------------------- */}
              <EntityPageSection
                title="Who is here"
                count={peopleHere.length || undefined}
                empty={
                  !canAct ? (
                    <Typography variant="body-sm" color="muted" className="italic">
                      Nobody recorded here yet
                    </Typography>
                  ) : undefined
                }
              >
                {peopleHere.length ? (
                  <ul className="flex flex-col gap-1 list-none p-0 m-0">
                    {peopleHere.map((npc) => (
                      <li
                        key={npc.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 selectable-item"
                      >
                        <EntitySigil entityId={npc.id} name={npc.name} size={20} />
                        <button
                          type="button"
                          onClick={() => navigateToPage(`/npcs/${npc.id}`)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="font-heading block truncate">{npc.name}</span>
                          {npc.title && (
                            <Typography
                              variant="body-sm"
                              color="secondary"
                              className="block text-xs truncate"
                            >
                              {npc.title}
                            </Typography>
                          )}
                        </button>
                        {canAct && (
                          <button
                            type="button"
                            aria-label={`Remove ${npc.name} from ${location.name}`}
                            onClick={() =>
                              void save({
                                connectedNPCs: (location.connectedNPCs ?? []).filter(
                                  (id) => id !== npc.id
                                ),
                              })
                            }
                            className="button-ghost rounded-full p-1 shrink-0"
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {canAct && (
                  <AttachTray
                    kinds={['npc']}
                    sources={{ npc: npcs, location: locations }}
                    // `15-4` passed `[]` here to stop the tray drawing chips
                    // under the list that already names everyone. The side
                    // effect was that the tray then offered "Attach" beside
                    // someone who was already attached. `15-5` gave the tray a
                    // way to say both things at once.
                    attachedIds={location.connectedNPCs ?? []}
                    showAttachedChips={false}
                    ariaLabel={`the people in ${location.name}`}
                    onAttach={(id) =>
                      void save({
                        connectedNPCs: Array.from(
                          new Set([...(location.connectedNPCs ?? []), id])
                        ),
                      })
                    }
                    onDetach={(id) =>
                      void save({
                        connectedNPCs: (location.connectedNPCs ?? []).filter(
                          (existing) => existing !== id
                        ),
                      })
                    }
                  />
                )}
              </EntityPageSection>

              {/* -------------------------- what points here ------------------------ */}
              <EntityPageSection
                title="What points here"
                empty={
                  <Typography variant="body-sm" color="muted" className="italic">
                    Nothing points here yet
                  </Typography>
                }
              >
                {inbound.length ? (
                  <ul className="flex flex-col gap-0.5 list-none p-0 m-0">
                    {inbound.map((link) => (
                      <li key={link.key}>
                        <button
                          type="button"
                          onClick={() => navigateToPage(link.href)}
                          className="w-full flex items-center gap-2 text-left rounded-md px-2 py-1.5 selectable-item"
                        >
                          <EntitySigil entityId={link.id} name={link.name} size={20} />
                          <span className="min-w-0">
                            <span className="font-heading block truncate">{link.name}</span>
                            <Typography
                              variant="body-sm"
                              color="secondary"
                              className="block text-xs truncate"
                            >
                              {link.detail}
                            </Typography>
                          </span>
                          <ArrowUpRight size={14} aria-hidden="true" className="ml-auto shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </EntityPageSection>

              {/* -------------------------------- tags ------------------------------ */}
              <EntityPageSection title="Tags">
                <div className="flex flex-wrap gap-2">
                  {(location.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full chip text-xs"
                    >
                      {tag}
                      {canAct && (
                        <button
                          type="button"
                          aria-label={`Remove the tag ${tag}`}
                          onClick={() =>
                            void save({
                              tags: (location.tags ?? []).filter((t) => t !== tag),
                            })
                          }
                          className="button-ghost rounded-full p-0.5"
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {canAct &&
                  (editing === 'tag' ? (
                    <InlineEditor
                      label="Add a tag"
                      rows={1}
                      submitLabel="Add tag"
                      placeholder="hidden"
                      clearOnSave
                      onSubmit={(value) =>
                        save({
                          tags: Array.from(new Set([...(location.tags ?? []), value])),
                        })
                      }
                      onSaved={() => setEditing(null)}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <FieldPrompt onClick={() => setEditing('tag')}>
                      {(location.tags ?? []).length
                        ? 'Add another tag'
                        : 'How would you find this place again?'}
                    </FieldPrompt>
                  ))}
              </EntityPageSection>

              {/* ------------------------------ the record -------------------------- */}
              <EntityPageSection title="Written here" muted>
                {/*
                  Created and last-modified are the only two points
                  `ContentAttribution` holds. Two facts, stated -- not a
                  timeline (§8, T005).
                */}
                <AttributionInfo item={location} />

                {canAct && (
                  <div className="border-t divider pt-3 flex items-center gap-3 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="delete-button"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      Delete location
                    </Button>
                    {insideCount > 0 && (
                      <Typography variant="body-sm" color="secondary" className="text-xs">
                        — asks what happens to the {insideCount} place
                        {insideCount === 1 ? '' : 's'} inside
                      </Typography>
                    )}
                  </div>
                )}
              </EntityPageSection>
            </>
          }
        >
          {/* --------------------------- what this place is --------------------------- */}
          <EntityPageSection
            title="What this place is"
            action={
              canAct &&
              editing !== 'name' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing('name')}
                  startIcon={<Pencil className="w-3.5 h-3.5" />}
                >
                  Rename
                </Button>
              )
            }
          >
            {editing === 'name' && (
              <InlineEditor
                label="Name"
                rows={1}
                initialValue={location.name}
                submitLabel="Save name"
                onSubmit={(value) => save({ name: value })}
                onSaved={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            )}

            {canAct && (
              <Select
                label="Type"
                size="sm"
                value={location.type}
                onChange={(event) =>
                  void save({ type: event.target.value as LocationType })
                }
                className="max-w-xs"
              >
                {TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatLocationType(type)}
                  </option>
                ))}
              </Select>
            )}

            {editing === 'description' ? (
              <InlineEditor
                label="Description"
                helperText="A sentence or two about the place itself."
                initialValue={location.description ?? ''}
                submitLabel="Save description"
                onSubmit={(value) => save({ description: value })}
                onSaved={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            ) : location.description ? (
              <button
                type="button"
                disabled={!canAct}
                onClick={() => setEditing('description')}
                className="text-left rounded-md px-1 -mx-1 disabled:cursor-default selectable-item"
              >
                {/* Serif: the one piece of running prose the page carries. */}
                <Typography className="font-serif italic text-lg leading-relaxed">
                  {location.description}
                </Typography>
              </button>
            ) : canAct ? (
              <FieldPrompt onClick={() => setEditing('description')}>
                What is this place?
              </FieldPrompt>
            ) : (
              <Typography color="muted" className="italic">
                Nothing written yet
              </Typography>
            )}
          </EntityPageSection>

          {/* ----------------------------- where this sits ---------------------------- */}
          <WhereThisSits
            location={location}
            locations={locations}
            canAct={canAct}
            onMove={(parentId) => moveLocation(location.id, parentId)}
            onAddInside={() => openQuickAdd('location', { parentId: location.id })}
            onOpen={(id) => navigateToPage(`/locations/${id}`)}
            focusParent={canAct && quickAddFocus === 'parent' && !location.parentId}
          />

          {/* ----------------------------- notable features --------------------------- */}
          <EntityPageSection
            title="Notable features"
            count={(location.features ?? []).length || undefined}
          >
            {(location.features ?? []).length ? (
              <ul className="flex flex-col divide-y card-divider list-none p-0 m-0">
                {(location.features ?? []).map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 min-h-[44px] sm:min-h-[38px]"
                  >
                    <Typography className="flex-1 min-w-0">{feature}</Typography>
                    {canAct && (
                      <>
                        {/*
                          §6.4: features are free text and children are
                          documents. Promote is the one action that moves a
                          name across, for when the party actually arrives.
                        */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void promoteFeature(feature)}
                        >
                          Make it a place
                        </Button>
                        <button
                          type="button"
                          aria-label={`Remove the feature ${feature}`}
                          onClick={() =>
                            void save({
                              features: (location.features ?? []).filter(
                                (f) => f !== feature
                              ),
                            })
                          }
                          className="button-ghost rounded-full p-1 shrink-0"
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}

            {canAct &&
              (editing === 'feature' ? (
                <InlineEditor
                  label="Add a feature"
                  helperText="Free text. A feature becomes a place of its own only when you promote it."
                  rows={1}
                  submitLabel="Add feature"
                  placeholder="Seven gates"
                  clearOnSave
                  onSubmit={(value) =>
                    save({ features: [...(location.features ?? []), value] })
                  }
                  onSaved={() => setEditing(null)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <FieldPrompt onClick={() => setEditing('feature')}>
                  {(location.features ?? []).length
                    ? 'Add another feature'
                    : 'What would the party notice first?'}
                </FieldPrompt>
              ))}
          </EntityPageSection>

          {/* --------------------------- notes from the table ------------------------- */}
          <EntityPageSection
            title="Notes from the table"
            count={notes.length || undefined}
          >
            {notes.length ? (
              <div className="flex flex-col divide-y card-divider">
                {notes.map((note, noteIndex) => (
                  <div
                    key={`${note.date}-${noteIndex}`}
                    className="grid grid-cols-1 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] gap-1 sm:gap-4 py-3"
                  >
                    {/*
                      Formatted, from the one shared helper (§8.1, T001). This
                      list printed `2025-05-31T19:27:30.387Z` until now.
                    */}
                    <Typography
                      variant="body-sm"
                      color="muted"
                      className="text-xs tabular-nums whitespace-nowrap"
                    >
                      {formatNoteDate(note.date)}
                    </Typography>
                    <Typography variant="body-sm" className="min-w-0">
                      {note.text}
                    </Typography>
                    {/*
                      A note carries its own author, which is why §8 makes it
                      the one exception to "no per-field attribution". One
                      written before the field existed stays blank rather than
                      being credited to a guess.
                    */}
                    <Typography
                      variant="body-sm"
                      color="muted"
                      className="text-xs sm:text-right whitespace-nowrap"
                    >
                      {note.author ?? ''}
                    </Typography>
                  </div>
                ))}
              </div>
            ) : (
              <Typography color="muted" className="italic">
                Nothing written from the table yet
              </Typography>
            )}

            {canAct && (
              <div className="bg-secondary rounded-md p-3">
                {/*
                  Always on screen rather than behind a button: writing down what
                  happened here is why someone opens this page.
                */}
                <InlineEditor
                  label="Add a note"
                  helperText="Dated today and credited to you. Notes are added, never edited or removed."
                  submitLabel="Add note"
                  placeholder="What happened here, and when"
                  rows={2}
                  autoFocus={false}
                  clearOnSave
                  onSubmit={addNote}
                  onSaved={() => undefined}
                />
              </div>
            )}
          </EntityPageSection>
        </EntityPageShell>
      )}

      {location && (
        <DeleteLocationDialog
          isOpen={confirmingDelete}
          onClose={() => setConfirmingDelete(false)}
          name={location.name}
          childCount={insideCount}
          grandparentName={parentName}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
};

export default LocationDetailPage;
