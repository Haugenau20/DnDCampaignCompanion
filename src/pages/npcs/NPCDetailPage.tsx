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
import { useUser } from 'features/user-management';
import AttributionInfo from 'shared/components/AttributionInfo';
import Breadcrumb from 'shared/components/Breadcrumb';
import DeleteConfirmationDialog from 'shared/components/DeleteConfirmationDialog';
import { usePageGate, GatedContent } from 'shared/components/gated';
import { useNavigation } from 'shared/context/NavigationContext';
import { getUserName, getActiveCharacterName } from 'core/utils/user-utils';
import InlineEditor from './InlineEditor';
import { Pencil } from 'lucide-react';

/** Sentence-cases one of the short enum values the type stores lowercase. */
const capitalise = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

/**
 * A note's date, as a date.
 *
 * `NPCNote.date` is a plain string with no agreed shape: the form writes
 * `YYYY-MM-DD`, while the sample-data generator writes a full ISO timestamp.
 * A date the reader cannot read is not a date, so the page normalises what it
 * can and returns anything unparseable untouched -- the same principle as an
 * unresolved location reference: show it as itself rather than invent a value.
 */
const formatNoteDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().split('T')[0];
};

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

/** One card in the sidebar. */
const SideCard: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section className="bg-secondary card-border rounded-lg p-5 flex flex-col gap-3">
    <FieldLabel>{title}</FieldLabel>
    {children}
  </section>
);

/** What a relationship is, said in words rather than left to the reader. */
interface Relation {
  key: string;
  id: string;
  name: string;
  /** Why this entity is on the list. Derived from the kind of link, not stored. */
  reason: string;
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
  const { getQuestById } = useQuests();
  const { rumors } = useRumors();
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

  const [editingDescription, setEditingDescription] = useState(false);
  const [savedField, setSavedField] = useState<'description' | 'note' | null>(
    null
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [returnFocus, setReturnFocus] = useState(false);
  const descriptionButton = useRef<HTMLButtonElement>(null);

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
  // returned once the commit has put it back in the document.
  useEffect(() => {
    if (!returnFocus) {
      return;
    }
    descriptionButton.current?.focus();
    setReturnFocus(false);
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
   * Every link this NPC has, in one list, each with the reason it is there.
   *
   * The reasons are derived from the *kind* of link rather than stored: a
   * location is somewhere they are, an affiliation is something they claim, a
   * quest and a rumor each carry their own status. Only NPC-to-NPC has nothing
   * to say beyond the other character's title, because `relatedNPCs` is a bare
   * list of ids with no room for why.
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
        reason: 'Last known location',
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
        reason: other.title || 'Known associate',
        href: `/npcs/${id}`,
      });
    });

    npc.connections?.affiliations?.forEach((affiliation) => {
      out.push({
        key: `affiliation-${affiliation}`,
        id: affiliation,
        name: affiliation,
        reason: 'Claims membership',
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
        reason: `Quest · ${capitalise(quest.status)}`,
        href: `/quests?highlight=${id}`,
      });
    });

    (rumors ?? [])
      .filter((rumor) => rumor.relatedNPCs?.includes(npc.id))
      .forEach((rumor) => {
        out.push({
          key: `rumor-${rumor.id}`,
          id: rumor.id,
          name: rumor.title,
          reason: `Rumor · ${rumor.status}`,
          href: `/rumors?highlight=${rumor.id}`,
        });
      });

    return out;
  }, [npc, npcs, locationName, locationHref, getQuestById, rumors]);

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
  const saveDescription = async (text: string) => {
    if (!npc) return;
    await updateNPC({ ...npc, description: text });
    await refreshNPCs();
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

  const savedNotice = (field: 'description' | 'note') => (
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
                      <div className="min-w-0">
                        <Typography variant="h1">{npc.name}</Typography>
                        {subtitle && (
                          <Typography color="secondary" className="mt-0.5">
                            {subtitle}
                          </Typography>
                        )}
                      </div>
                    </div>

                    {gate.canAct && (
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quiet: this page's accents are the two controls that
                            change something -- Add note and Delete. Going to the
                            full form is navigation, not an act (D66). */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateToPage(`/npcs/edit/${npc.id}`)}
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
                      NPCs can be compared by looking at the same place twice. */}
                  <div className="border-t divider pt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Status</FieldLabel>
                      {/* Hue *and* word. The word carries the fact on its own;
                          the hue only agrees with it (design language §2). */}
                      <Typography
                        variant="body-sm"
                        className={`npc-status-${npc.status} font-medium`}
                      >
                        {capitalise(npc.status)}
                      </Typography>
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Disposition</FieldLabel>
                      <Typography variant="body-sm">
                        {capitalise(npc.relationship)}
                      </Typography>
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Role</FieldLabel>
                      <Typography variant="body-sm">
                        {npc.occupation || 'Unrecorded'}
                      </Typography>
                    </div>
                    <div className="flex flex-col gap-1">
                      <FieldLabel>Race</FieldLabel>
                      <Typography variant="body-sm">
                        {npc.race || 'Unrecorded'}
                      </Typography>
                    </div>
                  </div>
                </div>
              </section>

              {/* ---- Description ---- */}
              <section className="card rounded-lg p-6 flex flex-col gap-3">
                {editingDescription ? (
                  <InlineEditor
                    label="Description"
                    helperText="A sentence or two. The whole record is behind Edit all fields."
                    initialValue={npc.description ?? ''}
                    submitLabel="Save description"
                    onSubmit={saveDescription}
                    onSaved={() => {
                      setEditingDescription(false);
                      setReturnFocus(true);
                      setSavedField('description');
                    }}
                    onCancel={() => {
                      setEditingDescription(false);
                      setReturnFocus(true);
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <FieldLabel>Description</FieldLabel>
                      {gate.canAct && (
                        <Button
                          ref={descriptionButton}
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingDescription(true)}
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
                    ) : (
                      <Typography color="muted" className="italic">
                        Nothing written yet
                      </Typography>
                    )}
                  </>
                )}
              </section>

              {/* ---- The three fields nothing else in the app renders ---- */}
              {(npc.appearance || npc.personality || npc.background) && (
                <section className="card rounded-lg p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {(
                    [
                      ['Appearance', npc.appearance],
                      ['Personality', npc.personality],
                      ['Background', npc.background],
                    ] as const
                  )
                    .filter(([, value]) => Boolean(value))
                    .map(([label, value]) => (
                      <div key={label} className="flex flex-col gap-2">
                        <FieldLabel>{label}</FieldLabel>
                        <Typography variant="body-sm">{value}</Typography>
                      </div>
                    ))}
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
              >
                {relationships.length ? (
                  <div className="flex flex-col divide-y card-divider">
                    {relationships.map((relation) => {
                      const body = (
                        <>
                          <EntitySigil
                            entityId={relation.id}
                            name={relation.name}
                            size={28}
                          />
                          <span className="min-w-0">
                            <Typography
                              variant="body-sm"
                              className="block truncate"
                            >
                              {relation.name}
                            </Typography>
                            <Typography
                              variant="body-sm"
                              color="muted"
                              className="block text-xs"
                            >
                              {relation.reason}
                            </Typography>
                          </span>
                        </>
                      );

                      // An affiliation is a name, not a record: there is nowhere
                      // to go, so it is not dressed up as somewhere to click.
                      return relation.href ? (
                        <button
                          key={relation.key}
                          type="button"
                          onClick={() => navigateToPage(relation.href)}
                          className="flex items-center gap-3 text-left py-2.5 first:pt-0 last:pb-0 rounded-md selectable-item"
                        >
                          {body}
                        </button>
                      ) : (
                        <div
                          key={relation.key}
                          className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                          {body}
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
                        className="px-2.5 py-1 rounded-full text-xs card typography-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <Typography variant="body-sm" color="muted" className="italic">
                    No tags yet
                  </Typography>
                )}
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
