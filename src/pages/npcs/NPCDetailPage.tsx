// src/pages/npcs/NPCDetailPage.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import EntitySigil from 'core/components/EntitySigil';
import ImageSlot from 'core/components/ImageSlot';
import {
  useNPCData,
  useNPCs,
  useQuests,
  useRumors,
  useLocations,
  resolveLocationName,
} from 'features/campaign-entities';
import type { NPC, NPCRelationship, NPCStatus } from 'features/campaign-entities';
import { useUser } from 'features/user-management';
import AttributionInfo from 'shared/components/AttributionInfo';
import { formatNoteDate } from 'shared/utils/dateFormatter';
import Breadcrumb from 'shared/components/Breadcrumb';
import DeleteConfirmationDialog from 'shared/components/DeleteConfirmationDialog';
import { usePageGate, GatedContent } from 'shared/components/gated';
import { useNavigation } from 'shared/context/NavigationContext';
import { getUserName, getActiveCharacterName } from 'core/utils/user-utils';
import { InlineEditor } from 'shared/components/inline-edit';
import { FieldPrompt } from 'shared/components/entity-page';
import AttachTray from 'shared/components/attach-tray/AttachTray';
import type { AttachKind } from 'shared/components/attach-tray/attachCandidates';
import StateLadder from 'shared/components/row-controls/StateLadder';
import { Pencil, X } from 'lucide-react';

/** Sentence-cases one of the short enum values the type stores lowercase. */
/**
 * NPC presence, which carries no hue.
 *
 * Alive was green and deceased was red, which reads a death as an error. It is
 * a fact about the world with no valence, so alive is plain ink and deceased
 * is muted ink; only genuine uncertainty takes a hue. Schema section 3.
 *
 * Written out rather than interpolated into `npc-status-${status}`. The old
 * form was a class name assembled from a variable, which no compiler and no
 * grep can see -- the token it referenced could have been deleted underneath
 * it and nothing would have failed until someone looked at the page.
 */
const PRESENCE_CLASS: Record<string, string> = {
  alive: 'valence-0',
  unknown: 'valence-1',
  missing: 'valence-2',
  deceased: 'valence-3',
};

/**
 * Disposition *is* valenced, and that is not a contradiction: presence is a
 * fact about the world, while an NPC's stance toward the party has valence
 * from the only point of view the record keeps.
 */
const DISPOSITION_CLASS: Record<string, string> = {
  friendly: 'disposition-friendly',
  neutral: 'disposition-neutral',
  hostile: 'disposition-hostile',
  unknown: 'disposition-unknown',
};

const capitalise = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

/**
 * The two ladders the header strip opens, best to worst -- the same order the
 * class maps above rank them in, so the control and the colour agree.
 *
 * Neither option carries a class name. `15-4` removed `StateLadder`'s
 * `selectedClassName` prop: the selected chip says "this is the current one",
 * and the state's own hue belongs to the *word*, which is what the strip
 * renders when the ladder is closed.
 */
const PRESENCE_OPTIONS: Array<{ value: NPCStatus; label: string }> = [
  { value: 'alive', label: 'Alive' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'missing', label: 'Missing' },
  { value: 'deceased', label: 'Deceased' },
];

const STANCE_OPTIONS: Array<{ value: NPCRelationship; label: string }> = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'hostile', label: 'Hostile' },
  { value: 'unknown', label: 'Unknown' },
];

/**
 * Everything on this page that can be opened for editing.
 *
 * `tag` is not one of them: the tag control adds a value rather than editing
 * one, so *Edit all fields* leaves it closed -- opening a blank composer is not
 * editing anything.
 */
type EditableField =
  | 'name'
  | 'title'
  | 'description'
  | 'appearance'
  | 'personality'
  | 'background'
  | 'status'
  | 'relationship'
  | 'occupation'
  | 'race';

const EVERY_FIELD: EditableField[] = [
  'name',
  'title',
  'description',
  'appearance',
  'personality',
  'background',
  'status',
  'relationship',
  'occupation',
  'race',
];

/**
 * The three prose blocks, and the question each asks when it is empty.
 *
 * §10: prompts are **questions, not labels**. An NPC nobody has written up yet
 * must look new rather than broken (design language §8, §12.7) -- and this page
 * used to drop the whole card when all three were empty, so the fields were
 * not merely blank, they were invisible.
 */
const PROSE_BLOCKS: {
  field: Extract<EditableField, 'appearance' | 'personality' | 'background'>;
  label: string;
  prompt: string;
  helper: string;
}[] = [
  {
    field: 'appearance',
    label: 'Appearance',
    prompt: 'What do they look like?',
    helper: 'What the party would notice on meeting them.',
  },
  {
    field: 'personality',
    label: 'Personality',
    prompt: 'How do they treat the party?',
    helper: 'How they behave, and what they want.',
  },
  {
    field: 'background',
    label: 'Background',
    prompt: 'Where do they come from?',
    helper: 'What happened before the party met them.',
  },
];


/** The uppercase micro-label every field on this page is introduced by. */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="body-sm"
    color="muted"
    className="text-[11px] font-semibold uppercase tracking-wider"
  >
    {children}
  </Typography>
);

/**
 * One card in the sidebar.
 *
 * Its title takes the page's own ink rather than the muted tone the field
 * labels use, so that a card heading and the group headings inside it are not
 * the same thing at the same weight. Relationships is the card that needs it:
 * a well-connected NPC puts five group labels under one card label, and if all
 * six look alike the grouping stops doing its job.
 */
const SideCard: React.FC<{
  title: React.ReactNode;
  /** The card's one action, at the end of the heading row. */
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, action, children }) => (
  <section className="bg-secondary card-border rounded-lg p-5 flex flex-col gap-3">
    <div className="flex items-center gap-2 flex-wrap">
      <Typography
        variant="body-sm"
        className="text-[11px] font-semibold uppercase tracking-wider"
      >
        {title}
      </Typography>
      {action && <div className="ml-auto">{action}</div>}
    </div>
    {children}
  </section>
);

/** The kinds of thing an NPC can be connected to, in the order they are shown. */
const RELATION_GROUPS = [
  { kind: 'people', label: 'People' },
  { kind: 'places', label: 'Places' },
  { kind: 'affiliations', label: 'Affiliations' },
  { kind: 'quests', label: 'Quests' },
  { kind: 'rumors', label: 'Rumors' },
] as const;

type RelationKind = (typeof RELATION_GROUPS)[number]['kind'];

interface Relation {
  key: string;
  id: string;
  name: string;
  kind: RelationKind;
  /**
   * What this row adds beyond its heading -- an associate's title, a quest's
   * status. Absent where the heading has already said everything: an
   * affiliation under "Affiliations" does not also need "Claims membership",
   * which is the type stated twice.
   */
  detail?: string;
  /** Empty when there is nowhere to go, as for a free-text affiliation. */
  href: string;
}

/**
 * The designed not-found. A bad id is an ordinary event -- a stale bookmark, a
 * deleted NPC, a link shared after the fact -- so it gets a designed state and
 * a way onward rather than a blank page.
 */
const NPCNotFound: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="card rounded-lg p-10 flex flex-col items-center text-center gap-3">
    <Typography variant="h3">No NPC with that id</Typography>
    <Typography color="secondary" className="max-w-md">
      It may have been deleted, or the link may point at a different campaign.
    </Typography>
    <Button variant="outline" onClick={onBack} className="mt-2">
      Back to NPCs
    </Button>
  </div>
);

/**
 * One NPC, in full.
 *
 * The page exists because six fields were write-only: `appearance`,
 * `personality`, `background` and all three `connections.*` arrays are
 * collected by both forms, written to Firestore, and were rendered nowhere
 * (D61). Nothing here is missing from the directory row, and nothing left the
 * row to get here -- what the page adds is the whole note history rather than a
 * truncated one, every relationship in a single list, and somewhere to write.
 *
 * Laid out as a stack of cards beside a sidebar rather than one slab of
 * labelled values. Each card is one kind of thing, so a reader can skip a whole
 * section at a glance; the first cut put every field in one card and read as a
 * form rather than as a record (D65).
 */
const NPCDetailPage: React.FC = () => {
  const { npcId } = useParams<{ npcId: string }>();
  const { navigateToPage } = useNavigation();
  const { npcs, loading, error, refreshNPCs } = useNPCData();
  const { updateNPC, updateNPCNote, deleteNPC } = useNPCs();
  const { getQuestById, quests } = useQuests();
  const { rumors, updateRumor } = useRumors();
  const { locations } = useLocations();
  const { activeGroupUserProfile } = useUser();

  const npc = npcs.find((candidate) => candidate.id === npcId);

  // `loading` folds into the gate's resolving state: `npcs` is empty while auth
  // and the campaign restore, and without this the page would claim "no NPC
  // with that id" for the found-but-not-yet-loaded case.
  const gate = usePageGate('npcs', {
    loading,
    error,
    onRetry: () => {
      void refreshNPCs();
    },
  });

  /**
   * Which editors are open.
   *
   * A set rather than one field, because this page has two ways in. A section's
   * own control opens **one** editor and closes any other (§7: one field open
   * at a time, which is this file's own behaviour generalised). *Edit all
   * fields* opens all of them at once, which is the "change five things"
   * case the edit route used to serve -- it now serves it here, and navigates
   * nowhere.
   */
  const [editing, setEditing] = useState<ReadonlySet<EditableField>>(new Set());
  const [editingTag, setEditingTag] = useState(false);
  const [savedField, setSavedField] = useState<EditableField | 'note' | null>(
    null
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [returnFocus, setReturnFocus] = useState<EditableField | null>(null);
  const triggers = useRef<Partial<Record<EditableField, HTMLButtonElement | null>>>({});

  const isEditing = (field: EditableField) => editing.has(field);
  const openOnly = (field: EditableField) => setEditing(new Set([field]));
  const closeField = (field: EditableField) =>
    setEditing((open) => {
      const next = new Set(open);
      next.delete(field);
      return next;
    });

  // The value changing on screen is the real confirmation; this is the word
  // that goes with it, for anyone who cannot see the change happen.
  useEffect(() => {
    if (!savedField) {
      return;
    }
    const timer = setTimeout(() => setSavedField(null), 4000);
    return () => clearTimeout(timer);
  }, [savedField]);

  // The trigger is unmounted while the editor is open, so focus can only be
  // returned once the commit has put it back in the document. Keyed by field
  // now that every block has one of these.
  useEffect(() => {
    if (!returnFocus) {
      return;
    }
    triggers.current[returnFocus]?.focus();
    setReturnFocus(null);
  }, [returnFocus]);

  const locationName = npc
    ? resolveLocationName(
        { location: npc.location, locationId: npc.locationId },
        locations
      )
    : undefined;

  const locationHref = `/locations?highlight=${encodeURIComponent(
    npc?.locationId || npc?.location || ''
  )}`;

  /**
   * Every link this NPC has, grouped by what kind of thing it is.
   *
   * One flat list was the first cut and it did not survive contact with a
   * well-connected NPC: twelve rows of people, places, affiliations, quests and
   * rumors in a single column is a bowl, not an answer. The grouping is what
   * lets someone look for a person without reading past four quests.
   *
   * Grouping also removes a redundancy the flat list needed: each row used to
   * carry the reason it was listed, so every affiliation said "Claims
   * membership". Under a heading that says Affiliations, that is the type
   * stated twice. A row now carries only what its heading cannot say -- an
   * associate's title, a quest's status.
   */
  const relationships = useMemo<Relation[]>(() => {
    if (!npc) {
      return [];
    }
    const out: Relation[] = [];

    if (locationName) {
      out.push({
        key: `location-${locationName}`,
        id: npc.locationId || npc.location || locationName,
        name: locationName,
        kind: 'places',
        // "Places" does not say *which* place this is to them, so this one
        // earns its line.
        detail: 'Last known location',
        href: locationHref,
      });
    }

    npc.connections?.relatedNPCs?.forEach((id) => {
      const other = npcs.find((candidate) => candidate.id === id);
      if (!other) {
        return;
      }
      out.push({
        key: `npc-${id}`,
        id,
        name: other.name,
        kind: 'people',
        // Their own title, when they have one. "Known associate" would only
        // repeat the heading.
        detail: other.title,
        href: `/npcs/${id}`,
      });
    });

    npc.connections?.affiliations?.forEach((affiliation) => {
      out.push({
        key: `affiliation-${affiliation}`,
        id: affiliation,
        name: affiliation,
        kind: 'affiliations',
        href: '',
      });
    });

    npc.connections?.relatedQuests?.forEach((id) => {
      const quest = getQuestById(id);
      if (!quest) {
        return;
      }
      out.push({
        key: `quest-${id}`,
        id,
        name: quest.title,
        kind: 'quests',
        detail: capitalise(quest.status),
        href: `/quests/${id}`,
      });
    });

    (rumors ?? [])
      .filter((rumor) => rumor.relatedNPCs?.includes(npc.id))
      .forEach((rumor) => {
        out.push({
          key: `rumor-${rumor.id}`,
          id: rumor.id,
          name: rumor.title,
          kind: 'rumors',
          detail: capitalise(rumor.status),
          href: `/rumors?highlight=${rumor.id}`,
        });
      });

    return out;
  }, [npc, npcs, locationName, locationHref, getQuestById, rumors]);

  /**
   * What the tray already has: this NPC's place, their people, their quests,
   * and every rumour that names them.
   *
   * Passed in full rather than left empty so the tray's own rows read
   * "Attached" instead of offering to attach someone who already is -- and so
   * that clicking one of them detaches, which is how a relation is removed
   * from this page at all.
   */
  const attachedIds = useMemo(() => {
    if (!npc) return [] as string[];
    return [
      ...(npc.locationId ? [npc.locationId] : []),
      ...(npc.connections?.relatedNPCs ?? []),
      ...(npc.connections?.relatedQuests ?? []),
      ...(rumors ?? [])
        .filter((rumor) => rumor.relatedNPCs?.includes(npc.id))
        .map((rumor) => rumor.id),
    ];
  }, [npc, rumors]);

  /** Oldest first, so the history reads as one. Said in the heading, not assumed. */
  const notes = useMemo(
    () => [...(npc?.notes ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [npc]
  );

  /**
   * Both writes end by re-reading this page's own store rather than patching
   * state locally. That is what makes the page show what was *written* instead
   * of what was typed: if another player changed the same record first, the
   * refetch is where that becomes visible.
   */
  const save = async (patch: Partial<NPC>) => {
    if (!npc) return;
    await updateNPC({ ...npc, ...patch });
    await refreshNPCs();
  };

  /** Close one editor, credit the save in words, and take focus back. */
  const afterSave = (field: EditableField) => {
    closeField(field);
    setReturnFocus(field);
    setSavedField(field);
  };

  /**
   * Attach a relation from the rail (§5's tray, `15-2`).
   *
   * Each kind is stored somewhere different, and one of them is not stored on
   * this record at all: a rumour names the NPCs it concerns, so attaching one
   * here writes the **rumour**. That asymmetry is why this is a switch rather
   * than one array push -- the relationship is real in both directions, and
   * only one direction has a field for it.
   */
  const attachRelation = async (id: string, kind: AttachKind) => {
    if (!npc) return;
    const connections = npc.connections ?? {
      relatedNPCs: [],
      affiliations: [],
      relatedQuests: [],
    };

    switch (kind) {
      case 'npc':
        await save({
          connections: {
            ...connections,
            relatedNPCs: Array.from(new Set([...(connections.relatedNPCs ?? []), id])),
          },
        });
        break;
      case 'quest':
        await save({
          connections: {
            ...connections,
            relatedQuests: Array.from(new Set([...(connections.relatedQuests ?? []), id])),
          },
        });
        break;
      case 'location': {
        // Where someone is, is one place. Attaching another replaces it rather
        // than adding to a list that does not exist. `location` is written
        // alongside as the human-readable convenience the contract on
        // `NPC.location` describes; `locationId` is what resolves.
        const place = locations.find((candidate) => candidate.id === id);
        await save({ locationId: id, location: place?.name ?? '' });
        break;
      }
      case 'rumor': {
        const rumor = (rumors ?? []).find((candidate) => candidate.id === id);
        if (!rumor) return;
        await updateRumor({
          ...rumor,
          relatedNPCs: Array.from(new Set([...(rumor.relatedNPCs ?? []), npc.id])),
        });
        await refreshNPCs();
        break;
      }
    }
  };

  const detachRelation = async (id: string) => {
    if (!npc) return;
    const connections = npc.connections ?? {
      relatedNPCs: [],
      affiliations: [],
      relatedQuests: [],
    };

    if (id === npc.locationId) {
      await save({ locationId: '', location: '' });
      return;
    }

    const rumor = (rumors ?? []).find((candidate) => candidate.id === id);
    if (rumor?.relatedNPCs?.includes(npc.id)) {
      await updateRumor({
        ...rumor,
        relatedNPCs: rumor.relatedNPCs.filter((existing) => existing !== npc.id),
      });
      await refreshNPCs();
      return;
    }

    await save({
      connections: {
        ...connections,
        relatedNPCs: (connections.relatedNPCs ?? []).filter((existing) => existing !== id),
        relatedQuests: (connections.relatedQuests ?? []).filter((existing) => existing !== id),
      },
    });
  };

  const addNote = async (text: string) => {
    if (!npc) return;
    // The acting character, or their username when they have no character --
    // the same actor `core/attribution` credits for the record itself.
    const author =
      getActiveCharacterName(activeGroupUserProfile) ||
      getUserName(activeGroupUserProfile) ||
      undefined;
    await updateNPCNote(npc.id, {
      date: new Date().toISOString().split('T')[0],
      text,
      ...(author ? { author } : {}),
    });
    await refreshNPCs();
  };

  const handleDelete = async () => {
    if (!npc) return;
    await deleteNPC(npc.id);
    setConfirmingDelete(false);
    navigateToPage('/npcs');
  };

  const savedNotice = (field: EditableField | 'note') => (
    <span role="status" aria-live="polite">
      {savedField === field && (
        <Typography variant="body-sm" color="secondary">
          Saved
        </Typography>
      )}
    </span>
  );

  const subtitle = [npc?.title, locationName && `from ${locationName}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: 'NPCs', href: '/npcs' },
          ...(locationName ? [{ label: locationName, href: locationHref }] : []),
          { label: npc?.name ?? 'Not found' },
        ]}
        className="mb-6"
      />

      {/* The page still says what it is in the states where the record cannot
          be loaded -- signed out, no campaign picked, still resolving. */}
      {gate.state !== 'ready' && (
        <Typography variant="h1" className="mb-8">
          NPC
        </Typography>
      )}

      <GatedContent gate={gate}>
        {npc ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
            <div className="flex flex-col gap-6 min-w-0">
              {/* ---- Identity. The band and the card are one object. ---- */}
              <section className="card rounded-lg overflow-hidden">
                <ImageSlot
                  className="h-40 sm:h-48"
                  label={`${npc.name} — no image added`}
                  caption="Optional. The page is finished without one."
                />

                <div className="p-6 flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <EntitySigil entityId={npc.id} name={npc.name} size={56} />
                      <div className="min-w-0 flex flex-col gap-1">
                        {isEditing('name') ? (
                          <InlineEditor
                            label="Name"
                            rows={1}
                            initialValue={npc.name}
                            submitLabel="Save name"
                            onSubmit={(value) => save({ name: value })}
                            onSaved={() => afterSave('name')}
                            onCancel={() => {
                              closeField('name');
                              setReturnFocus('name');
                            }}
                          />
                        ) : gate.canAct ? (
                          // Click-to-edit rather than a fifth control in the
                          // header: the value itself is the target, which is
                          // how the description block already works.
                          <button
                            type="button"
                            ref={(node) => {
                              triggers.current.name = node;
                            }}
                            aria-label={`Edit the name ${npc.name}`}
                            onClick={() => openOnly('name')}
                            className="text-left rounded-md px-1 -mx-1 selectable-item"
                          >
                            <Typography variant="h1">{npc.name}</Typography>
                          </button>
                        ) : (
                          <Typography variant="h1">{npc.name}</Typography>
                        )}

                        {isEditing('title') ? (
                          <InlineEditor
                            label="Title"
                            helperText="What they are called — “The Grey”, “Innkeeper of Bree”."
                            rows={1}
                            initialValue={npc.title ?? ''}
                            submitLabel="Save title"
                            onSubmit={(value) => save({ title: value })}
                            onSaved={() => afterSave('title')}
                            onCancel={() => {
                              closeField('title');
                              setReturnFocus('title');
                            }}
                          />
                        ) : subtitle ? (
                          gate.canAct ? (
                            <button
                              type="button"
                              ref={(node) => {
                                triggers.current.title = node;
                              }}
                              aria-label="Edit the title"
                              onClick={() => openOnly('title')}
                              className="text-left rounded-md px-1 -mx-1 selectable-item"
                            >
                              <Typography color="secondary">{subtitle}</Typography>
                            </button>
                          ) : (
                            <Typography color="secondary" className="mt-0.5">
                              {subtitle}
                            </Typography>
                          )
                        ) : (
                          gate.canAct && (
                            <FieldPrompt onClick={() => openOnly('title')}>
                              What are they called?
                            </FieldPrompt>
                          )
                        )}
                      </div>
                    </div>

                    {gate.canAct && (
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quiet: this page's accents are the controls that
                            change something -- Add note and Delete. Opening
                            every editor is not itself a write (D66).

                            It no longer leaves the page. "Change five things at
                            once" is a real thing to want, so the button stays
                            and does it here; `/npcs/edit/:id` is `15-8`'s to
                            retire, and nothing routes to it any more. */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(new Set(EVERY_FIELD))}
                          startIcon={<Pencil className="w-4 h-4" />}
                        >
                          Edit all fields
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="delete-button"
                          onClick={() => setConfirmingDelete(true)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* The standing facts, on one line in a fixed order, so two
                      NPCs can be compared by looking at the same place twice.

                      Each opens where it sits. The resting state is exactly
                      what it was: a label and a word. */}
                  <div className="border-t divider pt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      {isEditing('status') ? (
                        <StateLadder
                          label="Status"
                          options={PRESENCE_OPTIONS}
                          value={npc.status}
                          ariaLabel={`Status of ${npc.name}`}
                          onChange={(status: NPCStatus) =>
                            save({ status }).then(() => afterSave('status'))
                          }
                        />
                      ) : (
                        <>
                          <FieldLabel>Status</FieldLabel>
                          {/* Hue *and* word. The word carries the fact on its
                              own; the hue only agrees with it (design language
                              §2). */}
                          {gate.canAct ? (
                            <button
                              type="button"
                              ref={(node) => {
                                triggers.current.status = node;
                              }}
                              aria-label="Edit status"
                              onClick={() => openOnly('status')}
                              className="text-left rounded-md px-1 -mx-1 selectable-item"
                            >
                              <Typography
                                variant="body-sm"
                                className={`${PRESENCE_CLASS[npc.status] ?? 'valence-1'} font-medium`}
                              >
                                {capitalise(npc.status)}
                              </Typography>
                            </button>
                          ) : (
                            <Typography
                              variant="body-sm"
                              className={`${PRESENCE_CLASS[npc.status] ?? 'valence-1'} font-medium`}
                            >
                              {capitalise(npc.status)}
                            </Typography>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      {isEditing('relationship') ? (
                        <StateLadder
                          label="Disposition"
                          options={STANCE_OPTIONS}
                          value={npc.relationship}
                          ariaLabel={`Disposition of ${npc.name}`}
                          onChange={(relationship: NPCRelationship) =>
                            save({ relationship }).then(() => afterSave('relationship'))
                          }
                        />
                      ) : (
                        <>
                          <FieldLabel>Disposition</FieldLabel>
                          {gate.canAct ? (
                            <button
                              type="button"
                              ref={(node) => {
                                triggers.current.relationship = node;
                              }}
                              aria-label="Edit disposition"
                              onClick={() => openOnly('relationship')}
                              className="text-left rounded-md px-1 -mx-1 selectable-item"
                            >
                              <Typography
                                variant="body-sm"
                                className={DISPOSITION_CLASS[npc.relationship] ?? 'disposition-unknown'}
                              >
                                {capitalise(npc.relationship)}
                              </Typography>
                            </button>
                          ) : (
                            <Typography
                              variant="body-sm"
                              className={DISPOSITION_CLASS[npc.relationship] ?? 'disposition-unknown'}
                            >
                              {capitalise(npc.relationship)}
                            </Typography>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      {isEditing('occupation') ? (
                        <InlineEditor
                          label="Role"
                          rows={1}
                          initialValue={npc.occupation ?? ''}
                          submitLabel="Save role"
                          placeholder="Wizard"
                          onSubmit={(value) => save({ occupation: value })}
                          onSaved={() => afterSave('occupation')}
                          onCancel={() => {
                            closeField('occupation');
                            setReturnFocus('occupation');
                          }}
                        />
                      ) : (
                        <>
                          <FieldLabel>Role</FieldLabel>
                          {npc.occupation ? (
                            gate.canAct ? (
                              <button
                                type="button"
                                ref={(node) => {
                                  triggers.current.occupation = node;
                                }}
                                aria-label="Edit role"
                                onClick={() => openOnly('occupation')}
                                className="text-left rounded-md px-1 -mx-1 selectable-item"
                              >
                                <Typography variant="body-sm">{npc.occupation}</Typography>
                              </button>
                            ) : (
                              <Typography variant="body-sm">{npc.occupation}</Typography>
                            )
                          ) : gate.canAct ? (
                            <FieldPrompt onClick={() => openOnly('occupation')}>
                              What do they do?
                            </FieldPrompt>
                          ) : (
                            <Typography variant="body-sm">Unrecorded</Typography>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      {isEditing('race') ? (
                        <InlineEditor
                          label="Race"
                          rows={1}
                          initialValue={npc.race ?? ''}
                          submitLabel="Save race"
                          placeholder="Maia"
                          onSubmit={(value) => save({ race: value })}
                          onSaved={() => afterSave('race')}
                          onCancel={() => {
                            closeField('race');
                            setReturnFocus('race');
                          }}
                        />
                      ) : (
                        <>
                          <FieldLabel>Race</FieldLabel>
                          {npc.race ? (
                            gate.canAct ? (
                              <button
                                type="button"
                                ref={(node) => {
                                  triggers.current.race = node;
                                }}
                                aria-label="Edit race"
                                onClick={() => openOnly('race')}
                                className="text-left rounded-md px-1 -mx-1 selectable-item"
                              >
                                <Typography variant="body-sm">{npc.race}</Typography>
                              </button>
                            ) : (
                              <Typography variant="body-sm">{npc.race}</Typography>
                            )
                          ) : gate.canAct ? (
                            <FieldPrompt onClick={() => openOnly('race')}>
                              What race are they?
                            </FieldPrompt>
                          ) : (
                            <Typography variant="body-sm">Unrecorded</Typography>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* ---- Description ---- */}
              <section className="card rounded-lg p-6 flex flex-col gap-3">
                {isEditing('description') ? (
                  <InlineEditor
                    label="Description"
                    helperText="A sentence or two about who they are."
                    initialValue={npc.description ?? ''}
                    submitLabel="Save description"
                    onSubmit={(value) => save({ description: value })}
                    onSaved={() => afterSave('description')}
                    onCancel={() => {
                      closeField('description');
                      setReturnFocus('description');
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <FieldLabel>Description</FieldLabel>
                      {gate.canAct && npc.description && (
                        <Button
                          ref={(node: HTMLButtonElement | null) => {
                            triggers.current.description = node;
                          }}
                          variant="ghost"
                          size="sm"
                          // The page carries four of these now, and four
                          // buttons called "Edit" are indistinguishable to a
                          // screen reader. The accessible name still *contains*
                          // the visible word, which is what WCAG 2.5.3 asks.
                          aria-label="Edit description"
                          onClick={() => openOnly('description')}
                          startIcon={<Pencil className="w-3.5 h-3.5" />}
                        >
                          Edit
                        </Button>
                      )}
                      {savedNotice('description')}
                    </div>
                    {npc.description ? (
                      // Serif: this is the one piece of running prose the page
                      // carries. Everything else is metadata and lists.
                      <Typography className="font-serif italic text-lg leading-relaxed">
                        {npc.description}
                      </Typography>
                    ) : gate.canAct ? (
                      // The prompt *is* the control when there is nothing to
                      // edit -- a pencil beside an empty field and a dashed
                      // "+ Who are they?" under it are two ways into the same
                      // editor, and the second one says what to write.
                      <FieldPrompt
                        onClick={() => openOnly('description')}
                      >
                        Who are they?
                      </FieldPrompt>
                    ) : (
                      <Typography color="muted" className="italic">
                        Nothing written yet
                      </Typography>
                    )}
                  </>
                )}
              </section>

              {/* ---- The three fields nothing else in the app renders ----

                  A block with nothing in it now asks for something rather than
                  disappearing. The card is still dropped entirely when all
                  three are empty **and the reader cannot write**: a prompt is
                  an invitation, and offering one to someone who is signed out
                  would be an invitation to nothing. */}
              {(npc.appearance || npc.personality || npc.background || gate.canAct) && (
                <section className="card rounded-lg p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {PROSE_BLOCKS.map(({ field, label, prompt, helper }) => {
                    const value = npc[field];
                    return (
                      <div key={field} className="flex flex-col gap-2">
                        {isEditing(field) ? (
                          <InlineEditor
                            label={label}
                            helperText={helper}
                            initialValue={value ?? ''}
                            submitLabel={`Save ${label.toLowerCase()}`}
                            onSubmit={(next) => save({ [field]: next })}
                            onSaved={() => afterSave(field)}
                            onCancel={() => {
                              closeField(field);
                              setReturnFocus(field);
                            }}
                          />
                        ) : value ? (
                          <>
                            <div className="flex items-center gap-2">
                              <FieldLabel>{label}</FieldLabel>
                              {gate.canAct && (
                                <Button
                                  ref={(node: HTMLButtonElement | null) => {
                                    triggers.current[field] = node;
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Edit ${label.toLowerCase()}`}
                                  onClick={() => openOnly(field)}
                                  startIcon={<Pencil className="w-3.5 h-3.5" />}
                                >
                                  Edit
                                </Button>
                              )}
                              {savedNotice(field)}
                            </div>
                            <Typography variant="body-sm">{value}</Typography>
                          </>
                        ) : (
                          gate.canAct && (
                            <FieldPrompt onClick={() => openOnly(field)}>{prompt}</FieldPrompt>
                          )
                        )}
                      </div>
                    );
                  })}
                </section>
              )}

              {/* ---- Notes: the history, then somewhere to add to it ---- */}
              <section className="card rounded-lg overflow-hidden">
                <div className="px-6 pt-5 pb-3 flex items-center gap-3">
                  <FieldLabel>Notes</FieldLabel>
                  <Typography variant="body-sm" color="muted" className="text-xs">
                    {notes.length}
                    {notes.length > 1 ? ' · oldest first' : ''}
                  </Typography>
                  {savedNotice('note')}
                </div>

                {notes.length > 0 ? (
                  <div className="flex flex-col divide-y card-divider px-6">
                    {notes.map((note, index) => (
                      <div
                        key={`${note.date}-${index}`}
                        className="grid grid-cols-1 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] gap-1 sm:gap-4 py-3.5"
                      >
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
                        {/* A note written before the author field existed has
                            none, and stays blank rather than being credited to
                            a guess. */}
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
                  <div className="px-6 pb-4">
                    <Typography color="muted" className="italic">
                      No notes yet
                    </Typography>
                  </div>
                )}

                {gate.canAct && (
                  <div className="bg-secondary border-t divider px-6 py-4">
                    {/* Always on screen rather than behind a button: writing a
                        note is why someone opens this page, and a composer you
                        have to summon is a composer you forget exists. */}
                    <InlineEditor
                      label="Add a note"
                      helperText="Dated today and credited to you. Notes are added, never edited or removed."
                      submitLabel="Add note"
                      placeholder="What happened, and when"
                      rows={2}
                      autoFocus={false}
                      clearOnSave
                      onSubmit={addNote}
                      onSaved={() => setSavedField('note')}
                    />
                  </div>
                )}
              </section>
            </div>

            {/* --------------------------- sidebar --------------------------- */}
            <div className="flex flex-col gap-6">
              <SideCard
                title={`Relationships${
                  relationships.length ? ` · ${relationships.length}` : ''
                }`}
                action={
                  gate.canAct && (
                    /*
                      The rail listed relationships well and offered no way to
                      add one: every link on it had to be made from the other
                      record, or from the edit form. `15-2`'s tray is
                      browse-first -- typing is never the price of attaching
                      something -- and it groups People / Places / Quests /
                      Rumours, which is the grouping this card already uses.

                      It draws no chips of its own: the card below is the list
                      of what is attached, in more detail than a chip can hold.
                    */
                    <AttachTray
                      kinds={['npc', 'location', 'quest', 'rumor']}
                      sources={{
                        npc: npcs.filter((candidate) => candidate.id !== npc.id),
                        location: locations,
                        quest: quests,
                        rumor: rumors ?? [],
                      }}
                      attachedIds={attachedIds}
                      showAttachedChips={false}
                      ariaLabel={`what ${npc.name} is linked to`}
                      onAttach={(id, kind) => void attachRelation(id, kind)}
                      onDetach={(id) => void detachRelation(id)}
                    />
                  )
                }
              >
                {relationships.length ? (
                  <div className="flex flex-col gap-4">
                    {RELATION_GROUPS.map(({ kind, label }) => {
                      const members = relationships.filter(
                        (relation) => relation.kind === kind
                      );
                      if (!members.length) {
                        // A heading over nothing is worse than no heading. The
                        // empty case is said once, for the whole card.
                        return null;
                      }

                      return (
                        <div key={kind} className="flex flex-col gap-1.5">
                          <Typography
                            variant="body-sm"
                            color="muted"
                            className="text-[10px] font-semibold uppercase tracking-wider"
                          >
                            {label}
                          </Typography>

                          <div className="flex flex-col divide-y card-divider">
                            {members.map((relation) => {
                              const body = (
                                <>
                                  <EntitySigil
                                    entityId={relation.id}
                                    name={relation.name}
                                    size={24}
                                  />
                                  <span className="min-w-0">
                                    <Typography
                                      variant="body-sm"
                                      className="block truncate"
                                    >
                                      {relation.name}
                                    </Typography>
                                    {relation.detail && (
                                      <Typography
                                        variant="body-sm"
                                        color="muted"
                                        className="block text-xs truncate"
                                      >
                                        {relation.detail}
                                      </Typography>
                                    )}
                                  </span>
                                </>
                              );

                              // An affiliation is a name, not a record: there is
                              // nowhere to go, so it is not dressed up as
                              // somewhere to click.
                              return relation.href ? (
                                <button
                                  key={relation.key}
                                  type="button"
                                  onClick={() => navigateToPage(relation.href)}
                                  className="flex items-center gap-2.5 text-left py-2 first:pt-0 last:pb-0 rounded-md selectable-item"
                                >
                                  {body}
                                </button>
                              ) : (
                                <div
                                  key={relation.key}
                                  className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0"
                                >
                                  {body}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Typography variant="body-sm" color="muted" className="italic">
                    Nothing linked yet
                  </Typography>
                )}
              </SideCard>

              <SideCard title="Tags">
                {npc.tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {npc.tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs card typography-secondary"
                      >
                        {tag}
                        {gate.canAct && (
                          <button
                            type="button"
                            aria-label={`Remove the tag ${tag}`}
                            onClick={() =>
                              void save({
                                tags: (npc.tags ?? []).filter((existing) => existing !== tag),
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
                ) : (
                  !gate.canAct && (
                    <Typography variant="body-sm" color="muted" className="italic">
                      No tags yet
                    </Typography>
                  )
                )}

                {gate.canAct &&
                  (editingTag ? (
                    <InlineEditor
                      label="Add a tag"
                      rows={1}
                      submitLabel="Add tag"
                      placeholder="wizard"
                      clearOnSave
                      onSubmit={(value) =>
                        save({ tags: Array.from(new Set([...(npc.tags ?? []), value])) })
                      }
                      onSaved={() => setEditingTag(false)}
                      onCancel={() => setEditingTag(false)}
                    />
                  ) : (
                    <FieldPrompt onClick={() => setEditingTag(true)}>
                      {npc.tags?.length ? 'Add another tag' : 'How would you find them again?'}
                    </FieldPrompt>
                  ))}
              </SideCard>

              <SideCard title="Record">
                {/* Created and last-modified are the only two points
                    `ContentAttribution` holds. Two facts, stated -- not a
                    timeline (Q12). */}
                <AttributionInfo item={npc} />
              </SideCard>
            </div>
          </div>
        ) : (
          <NPCNotFound onBack={() => navigateToPage('/npcs')} />
        )}
      </GatedContent>

      {npc && (
        <DeleteConfirmationDialog
          isOpen={confirmingDelete}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={handleDelete}
          itemName={npc.name}
          itemType="NPC"
        />
      )}
    </div>
  );
};

export default NPCDetailPage;
