// src/pages/quests/QuestDetailPage.tsx
import React, { useMemo, useState } from 'react';
import { useLocation as useRouterLocation, useParams } from 'react-router-dom';
import { ArrowUpRight, Pencil, X } from 'lucide-react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import EntitySigil from 'core/components/EntitySigil';
import {
  useQuests,
  useNPCs,
  useLocations,
  useRumors,
  resolveLocationName,
  QuestObjectives,
  DeleteQuestDialog,
  questMetaLine,
  QUEST_STATUS_OPTIONS,
} from 'features/campaign-entities';
import type { Quest, QuestStatus, QuestLocation } from 'features/campaign-entities';
import { useNotes } from 'features/collaboration';
import AttributionInfo from 'shared/components/AttributionInfo';
import AttachTray from 'shared/components/attach-tray/AttachTray';
import StateLadder from 'shared/components/row-controls/StateLadder';
import { EntityPageShell, EntityPageSection, FieldPrompt } from 'shared/components/entity-page';
import { usePageGate, GatedContent } from 'shared/components/gated';
import { useNavigation } from 'shared/context/NavigationContext';
import { formatNoteDate } from 'shared/utils/dateFormatter';
import { InlineEditor } from 'shared/components/inline-edit';

/** What points at this quest, from the three collections that can. */
interface InboundLink {
  key: string;
  id: string;
  name: string;
  detail: string;
  href: string;
}

/** The prep lists, which are all the same shape: a heading and free text lines. */
type PrepField = 'leads' | 'complications' | 'rewards';

const PREP_FIELDS: {
  key: PrepField;
  title: string;
  prompt: string;
  another: string;
  placeholder: string;
}[] = [
  {
    key: 'leads',
    title: 'Leads',
    prompt: 'Where does the party start looking?',
    another: 'Add another lead',
    placeholder: 'The door can only be opened on Durin’s Day',
  },
  {
    key: 'complications',
    title: 'Complications',
    prompt: 'What could go wrong?',
    another: 'Add another complication',
    placeholder: 'The threat of waking Smaug',
  },
  {
    key: 'rewards',
    title: 'Rewards',
    prompt: 'What is in it for them?',
    another: 'Add another reward',
    placeholder: 'The Arkenstone',
  },
];

/**
 * The designed not-found. A bad id is an ordinary event -- a stale bookmark, a
 * deleted quest, a link shared after the fact -- so it gets a designed state
 * and a way onward rather than a blank page.
 */
const QuestNotFound: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="card rounded-lg p-10 flex flex-col items-center text-center gap-3">
    <Typography variant="h3">No quest with that id</Typography>
    <Typography color="secondary" className="max-w-md">
      It may have been deleted, or the link may point at a different campaign.
    </Typography>
    <Button variant="outline" onClick={onBack} className="mt-2">
      Back to Quests
    </Button>
  </div>
);

/**
 * One quest, in full, at `/quests/:questId`.
 *
 * **A quest is the most linked-to record in the product and had no address.**
 * Rumours convert into them, NPCs and locations relate to them, notes mention
 * them, Home lists them -- and every one of those links landed on the directory
 * with a row highlighted, because there was nowhere else to send them. A rumour
 * could be converted into a quest and then not refer to it.
 *
 * The page also takes the prep material off the row. Background, leads,
 * complications, rewards and the level range are read once, while prepping --
 * which is when you are here -- and they are what made the expanded quest row
 * about 1,100px tall (§3). The row keeps the four facts you can read while
 * scanning five of them; everything else lives here, in full and not behind a
 * reveal.
 *
 * **What this page deliberately does not do**, all three of which `S3` draws:
 *
 * - No per-objective history. The reference prints "gandlaf ticked *Find the
 *   secret door* · last session"; `ContentAttribution` holds created-by and
 *   last-modified-by and **nothing in between** (§8, T005). A line like that
 *   would be inventing a history the data does not carry.
 * - No per-field credit under the description, for the same reason.
 * - No second NPC list. `importantNPCs` is deleted (`D15.7`) -- two fields for
 *   one relationship, both rendered, is why Thorin and Smaug appeared twice on
 *   the same card.
 */
const QuestDetailPage: React.FC = () => {
  const { questId } = useParams<{ questId: string }>();
  /**
   * `15-1`'s contract: quick add navigates here with `quickAddFocus` naming
   * the first unwritten field. A quest's is `objectives`, and a quest created
   * through quick add has a title, a line and nothing else.
   */
  const quickAddFocus = (useRouterLocation().state as { quickAddFocus?: string } | null)
    ?.quickAddFocus;
  const { navigateToPage } = useNavigation();

  const {
    quests,
    isLoading,
    error,
    refreshQuests,
    updateQuest,
    updateQuestStatus,
    updateQuestObjective,
    addQuestObjective,
    editQuestObjective,
    moveQuestObjective,
    markQuestCompleted,
    deleteQuest,
  } = useQuests();
  const { npcs } = useNPCs();
  const { locations, createLocation } = useLocations();
  const { rumors } = useRumors();
  const { notes } = useNotes();

  const quest = quests.find((candidate) => candidate.id === questId);

  // `isLoading` folds into the gate's resolving state: `quests` is empty while
  // auth and the campaign restore, and without this the page would claim "no
  // quest with that id" for the found-but-not-yet-loaded case.
  const gate = usePageGate('quests', {
    loading: isLoading,
    error,
    onRetry: () => {
      void refreshQuests();
    },
  });

  const [editing, setEditing] = useState<
    'title' | 'description' | 'background' | 'levelRange' | 'place' | PrepField | null
  >(null);

  /**
   * The quest's location, as a name.
   *
   * Item 10: **resolve every id to a name.** The quest card printed `bag-end`
   * and `erebor` as though they were labels, and one of them was wrong
   * besides.
   *
   * `resolveLocationName` prefers the canonical `locationId` and falls back to
   * the legacy free-text `location`. When neither resolves it returns the
   * stored value verbatim, deliberately (#1412): a reference to a place that
   * no longer exists has to stay visible rather than be prettified into
   * something real or quietly vanish.
   *
   * Both rules hold here at once. A reference that resolves is a name; one
   * that does not is shown *as a broken reference* -- "nowhere — no such
   * place" -- which is neither a label nor a disappearance.
   */
  const resolvedName = useMemo(
    () =>
      quest
        ? resolveLocationName({ locationId: quest.locationId, location: quest.location }, locations)
        : undefined,
    [quest, locations]
  );

  const locationRecord = useMemo(
    () =>
      locations.find(
        (candidate) =>
          candidate.id === quest?.locationId ||
          (resolvedName ? candidate.name === resolvedName : false)
      ),
    [locations, quest, resolvedName]
  );

  const locationName = resolvedName
    ? locationRecord
      ? resolvedName
      : `${resolvedName} — no such place`
    : undefined;

  /** The people on the quest, resolved to records. The one relation list. */
  const people = useMemo(() => {
    const ids = quest?.relatedNPCIds ?? [];
    return ids.map((id) => ({ id, npc: npcs.find((candidate) => candidate.id === id) }));
  }, [quest, npcs]);

  /**
   * What points here -- derived, read-only, and the reason a quest earns a page
   * (item 6). These are other records' references to this one, and the place to
   * change a rumour's conversion or a location's quest list is that record.
   */
  const inbound = useMemo<InboundLink[]>(() => {
    if (!quest) return [];
    const out: InboundLink[] = [];

    (rumors ?? [])
      .filter((rumor) => rumor.convertedToQuestId === quest.id)
      .forEach((rumor) =>
        out.push({
          key: `rumor-${rumor.id}`,
          id: rumor.id,
          name: rumor.title,
          // "Disproved", never "False" (§10): it describes what the party did.
          detail: `rumour, ${rumor.status === 'false' ? 'disproved' : rumor.status} — became this quest`,
          href: `/rumors?highlight=${rumor.id}`,
        })
      );

    locations
      .filter((location) => location.relatedQuests?.includes(quest.id))
      .forEach((location) =>
        out.push({
          key: `location-${location.id}`,
          id: location.id,
          name: location.name,
          detail: 'location, points at this quest',
          href: `/locations/${location.id}`,
        })
      );

    // A note counts as pointing here only when its extracted entity was
    // actually converted into *this* quest. Matching the title against note
    // text would be a guess, and a guess in a derived list reads exactly like
    // a fact.
    (notes ?? [])
      .filter((note) =>
        note.extractedEntities?.some(
          (entity) => entity.type === 'quest' && entity.convertedToId === quest.id
        )
      )
      .forEach((note) =>
        out.push({
          key: `note-${note.id}`,
          id: note.id,
          name: note.title || 'Untitled note',
          detail: 'note, mentions this quest',
          href: `/notes/${note.id}`,
        })
      );

    return out;
  }, [quest, rumors, locations, notes]);

  /** What the delete dialog names as losing a link. */
  const deletionLosses = useMemo(() => {
    const losses = inbound.map((link) => `${link.name} — ${link.detail}`);
    const attached = people.filter((entry) => entry.npc).length;
    if (attached > 0) {
      losses.push(`${attached} ${attached === 1 ? 'person is' : 'people are'} attached to it`);
    }
    return losses;
  }, [inbound, people]);

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Every write re-reads this page's own store rather than patching state
  // locally: if another player changed the same record first, the refetch is
  // where that becomes visible.
  const save = async (patch: Partial<Quest>) => {
    if (!quest) return;
    await updateQuest({ ...quest, ...patch });
    await refreshQuests();
  };

  /** Append one line to a prep list. */
  const addTo = (field: PrepField) => (value: string) =>
    save({ [field]: [...(quest?.[field] ?? []), value] } as Partial<Quest>);

  const removeFrom = (field: PrepField, value: string) =>
    save({
      [field]: (quest?.[field] ?? []).filter((entry) => entry !== value),
    } as Partial<Quest>);

  /**
   * A place inside the quest becomes a real location -- the same promotion a
   * location's features get (§6.4, item 5).
   *
   * They stay free text until then: these are prep notes about places inside
   * the quest's location, mostly never visited, and promoting them all would
   * fill the location tree with stubs nobody has been to.
   */
  const promotePlace = async (place: QuestLocation) => {
    if (!quest) return;
    const newId = await createLocation({
      name: place.name,
      type: 'poi',
      status: 'known',
      description: place.description ?? '',
      // Inside the quest's own location when there is one: a secret door is a
      // place inside Erebor, not a region of its own.
      parentId: locationRecord?.id ?? '',
      features: [],
      connectedNPCs: [],
      relatedQuests: [quest.id],
      notes: [],
      tags: [],
    });
    await save({
      keyLocations: (quest.keyLocations ?? []).filter((entry) => entry.name !== place.name),
    });
    navigateToPage(`/locations/${newId}`);
  };

  const handleDelete = async () => {
    if (!quest) return;
    await deleteQuest(quest.id);
    navigateToPage('/quests');
  };

  const canAct = gate.canAct;

  return (
    <>
      {gate.state !== 'ready' || !quest ? (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Typography variant="h1" className="mb-8">
            Quest
          </Typography>
          <GatedContent gate={gate}>
            <QuestNotFound onBack={() => navigateToPage('/quests')} />
          </GatedContent>
        </div>
      ) : (
        <EntityPageShell
          breadcrumb={[{ label: 'Quests', href: '/quests' }, { label: quest.title }]}
          entityId={quest.id}
          name={quest.title}
          meta={questMetaLine(
            quest,
            locationName,
            quest.dateCompleted ? formatNoteDate(quest.dateCompleted) : undefined
          )}
          bandControl={
            canAct && (
              <StateLadder
                label="Status"
                tone="band"
                options={QUEST_STATUS_OPTIONS}
                value={quest.status}
                ariaLabel={`Status of ${quest.title}`}
                onChange={(status: QuestStatus) => updateQuestStatus(quest.id, status)}
              />
            )
          }
          actions={
            canAct &&
            quest.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void markQuestCompleted(quest.id)}
              >
                Mark completed
              </Button>
            )
          }
          aside={
            <>
              {/* ---------------------------- who is in it --------------------------- */}
              <EntityPageSection
                title="Who is in it"
                count={people.length || undefined}
                empty={
                  !canAct ? (
                    <Typography variant="body-sm" color="muted" className="italic">
                      Nobody attached yet
                    </Typography>
                  ) : undefined
                }
              >
                {people.length ? (
                  <ul className="flex flex-col gap-1 list-none p-0 m-0">
                    {people.map(({ id, npc }) => (
                      <li
                        key={id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 selectable-item"
                      >
                        {npc ? (
                          <>
                            <EntitySigil entityId={npc.id} name={npc.name} size={20} />
                            <button
                              type="button"
                              onClick={() => navigateToPage(`/npcs/${npc.id}`)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span className="font-heading block truncate">{npc.name}</span>
                              {/*
                                Occupation and where they are: what tells two
                                NPCs apart (item 4). "Thorin Oakenshield ·
                                King under the Mountain" is the line `S3`
                                draws.
                              */}
                              <Typography
                                variant="body-sm"
                                color="secondary"
                                className="block text-xs truncate"
                              >
                                {[
                                  npc.occupation || npc.title,
                                  resolveLocationName(
                                    { locationId: npc.locationId, location: npc.location },
                                    locations
                                  ),
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Typography>
                            </button>
                          </>
                        ) : (
                          // A reference that no longer resolves says so; it
                          // never prints the id as though it were a name.
                          <Typography
                            variant="body-sm"
                            color="secondary"
                            className="italic flex-1 min-w-0"
                          >
                            Someone no longer in the directory
                          </Typography>
                        )}
                        {canAct && (
                          <button
                            type="button"
                            aria-label={`Remove ${npc ? npc.name : 'this person'} from ${quest.title}`}
                            onClick={() =>
                              void save({
                                relatedNPCIds: (quest.relatedNPCIds ?? []).filter(
                                  (existing) => existing !== id
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
                    attachedIds={quest.relatedNPCIds ?? []}
                    // The list above already names each person, with their
                    // occupation and where they are. Chips under it would be
                    // the same person twice.
                    showAttachedChips={false}
                    ariaLabel={`the people in ${quest.title}`}
                    onAttach={(id) =>
                      void save({
                        relatedNPCIds: Array.from(
                          new Set([...(quest.relatedNPCIds ?? []), id])
                        ),
                      })
                    }
                    onDetach={(id) =>
                      void save({
                        relatedNPCIds: (quest.relatedNPCIds ?? []).filter(
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
                  <>
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
                            <ArrowUpRight
                              size={14}
                              aria-hidden="true"
                              className="ml-auto shrink-0"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Typography variant="body-sm" color="muted" className="text-xs">
                      Derived, not authored — change these where they are written.
                    </Typography>
                  </>
                ) : null}
              </EntityPageSection>

              {/* ------------------------------ the record -------------------------- */}
              <EntityPageSection title="Written here" muted>
                {/*
                  Created and last-modified are the only two points
                  `ContentAttribution` holds. Two facts, stated -- not a
                  timeline, and never per objective (§8, T005).
                */}
                <AttributionInfo item={quest} />

                {canAct && (
                  <div className="border-t divider pt-3 flex items-center gap-3 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="delete-button"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      Delete quest
                    </Button>
                    {deletionLosses.length > 0 && (
                      <Typography variant="body-sm" color="secondary" className="text-xs">
                        — asks once, and says what else loses a link
                      </Typography>
                    )}
                  </div>
                )}
              </EntityPageSection>
            </>
          }
        >
          {/* --------------------- what the party was asked to do --------------------- */}
          <EntityPageSection
            title="What the party was asked to do"
            action={
              canAct &&
              editing !== 'title' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing('title')}
                  startIcon={<Pencil className="w-3.5 h-3.5" />}
                >
                  Rename
                </Button>
              )
            }
          >
            {editing === 'title' && (
              <InlineEditor
                label="Title"
                rows={1}
                initialValue={quest.title}
                submitLabel="Save title"
                onSubmit={(value) => save({ title: value })}
                onSaved={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            )}

            {editing === 'description' ? (
              <InlineEditor
                label="Description"
                helperText="What the party agreed to, in a sentence or two."
                initialValue={quest.description ?? ''}
                submitLabel="Save description"
                onSubmit={(value) => save({ description: value })}
                onSaved={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            ) : quest.description ? (
              <button
                type="button"
                disabled={!canAct}
                onClick={() => setEditing('description')}
                className="text-left rounded-md px-1 -mx-1 disabled:cursor-default selectable-item"
              >
                <Typography className="text-lg leading-relaxed">{quest.description}</Typography>
              </button>
            ) : canAct ? (
              <FieldPrompt onClick={() => setEditing('description')}>
                What was the party asked to do?
              </FieldPrompt>
            ) : (
              <Typography color="muted" className="italic">
                Nothing written yet
              </Typography>
            )}
          </EntityPageSection>

          {/* ------------------------------- objectives ------------------------------- */}
          <QuestObjectives
            quest={quest}
            canAct={canAct}
            onToggle={(objectiveId, completed) =>
              updateQuestObjective(quest.id, objectiveId, completed)
            }
            onAdd={(description) => addQuestObjective(quest.id, description)}
            onEdit={(objectiveId, description) =>
              editQuestObjective(quest.id, objectiveId, description)
            }
            onMove={(objectiveId, direction) =>
              moveQuestObjective(quest.id, objectiveId, direction)
            }
            onComplete={() => markQuestCompleted(quest.id)}
            focusAdd={quickAddFocus === 'objectives' && (quest.objectives ?? []).length === 0}
          />

          {/* ---------------------------------- prep ---------------------------------- */}
          <EntityPageSection title="Background">
            {editing === 'background' ? (
              <InlineEditor
                label="Background"
                helperText="How this came about, and what the party already knows."
                initialValue={quest.background ?? ''}
                submitLabel="Save background"
                onSubmit={(value) => save({ background: value })}
                onSaved={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            ) : quest.background ? (
              <button
                type="button"
                disabled={!canAct}
                onClick={() => setEditing('background')}
                className="text-left rounded-md px-1 -mx-1 disabled:cursor-default selectable-item"
              >
                {/* Serif: the running prose of the page, in the campaign's voice. */}
                <Typography className="font-serif italic text-lg leading-relaxed">
                  {quest.background}
                </Typography>
              </button>
            ) : canAct ? (
              <FieldPrompt onClick={() => setEditing('background')}>
                How did this come about?
              </FieldPrompt>
            ) : (
              <Typography color="muted" className="italic">
                No background written yet
              </Typography>
            )}
          </EntityPageSection>

          {PREP_FIELDS.map((field) => {
            const entries = quest[field.key] ?? [];
            return (
              <EntityPageSection
                key={field.key}
                title={field.title}
                count={entries.length || undefined}
              >
                {entries.length ? (
                  <ul className="flex flex-col divide-y card-divider list-none p-0 m-0">
                    {entries.map((entry) => (
                      <li
                        key={entry}
                        className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 min-h-[44px] sm:min-h-[38px]"
                      >
                        <Typography className="flex-1 min-w-0">{entry}</Typography>
                        {canAct && (
                          <button
                            type="button"
                            aria-label={`Remove ${entry}`}
                            onClick={() => void removeFrom(field.key, entry)}
                            className="button-ghost rounded-full p-1 shrink-0"
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {canAct &&
                  (editing === field.key ? (
                    <InlineEditor
                      label={field.title}
                      rows={1}
                      submitLabel={`Add to ${field.title.toLowerCase()}`}
                      placeholder={field.placeholder}
                      clearOnSave
                      onSubmit={addTo(field.key)}
                      onSaved={() => undefined}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <FieldPrompt onClick={() => setEditing(field.key)}>
                      {entries.length ? field.another : field.prompt}
                    </FieldPrompt>
                  ))}
              </EntityPageSection>
            );
          })}

          {/* ------------------------- places inside this quest ----------------------- */}
          <EntityPageSection
            title="Places inside this quest"
            count={(quest.keyLocations ?? []).length || undefined}
          >
            {(quest.keyLocations ?? []).length ? (
              <ul className="flex flex-col divide-y card-divider list-none p-0 m-0">
                {(quest.keyLocations ?? []).map((place) => (
                  <li
                    key={place.name}
                    className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 min-h-[44px] sm:min-h-[38px]"
                  >
                    <span className="flex-1 min-w-0">
                      <Typography className="font-heading block truncate">{place.name}</Typography>
                      {place.description && (
                        <Typography variant="body-sm" color="secondary" className="block">
                          {place.description}
                        </Typography>
                      )}
                    </span>
                    {canAct && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void promotePlace(place)}
                        >
                          Make it a location
                        </Button>
                        <button
                          type="button"
                          aria-label={`Remove ${place.name}`}
                          onClick={() =>
                            void save({
                              keyLocations: (quest.keyLocations ?? []).filter(
                                (entry) => entry.name !== place.name
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
              (editing === 'place' ? (
                <InlineEditor
                  label="Add a place"
                  helperText="Free text. A place becomes a location of its own only when you promote it."
                  rows={1}
                  submitLabel="Add place"
                  placeholder="Secret door"
                  clearOnSave
                  onSubmit={(value) =>
                    save({
                      keyLocations: [
                        ...(quest.keyLocations ?? []),
                        { name: value, description: '' },
                      ],
                    })
                  }
                  onSaved={() => undefined}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <FieldPrompt onClick={() => setEditing('place')}>
                  {(quest.keyLocations ?? []).length
                    ? 'Add another place'
                    : 'Where does this quest happen?'}
                </FieldPrompt>
              ))}

            <Typography variant="body-sm" color="muted" className="text-xs">
              These stay free text — notes about places inside the quest’s location, not records of
              their own. Promoting one is how it becomes a location when the party gets there.
            </Typography>
          </EntityPageSection>

          {/* ------------------------------- level range ------------------------------ */}
          <EntityPageSection title="Level range">
            {editing === 'levelRange' ? (
              <InlineEditor
                label="Level range"
                rows={1}
                initialValue={quest.levelRange ?? ''}
                submitLabel="Save level range"
                placeholder="7–9"
                onSubmit={(value) => save({ levelRange: value })}
                onSaved={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            ) : quest.levelRange ? (
              <button
                type="button"
                disabled={!canAct}
                onClick={() => setEditing('levelRange')}
                className="text-left rounded-md px-1 -mx-1 disabled:cursor-default selectable-item"
              >
                <Typography>Levels {quest.levelRange}</Typography>
              </button>
            ) : canAct ? (
              <FieldPrompt onClick={() => setEditing('levelRange')}>
                What levels is this pitched at?
              </FieldPrompt>
            ) : (
              <Typography color="muted" className="italic">
                Not recorded
              </Typography>
            )}
          </EntityPageSection>
        </EntityPageShell>
      )}

      {quest && (
        <DeleteQuestDialog
          isOpen={confirmingDelete}
          onClose={() => setConfirmingDelete(false)}
          title={quest.title}
          losses={deletionLosses}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
};

export default QuestDetailPage;
