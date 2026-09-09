// src/pages/npcs/NPCDetailPage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import EntitySigil from 'core/components/EntitySigil';
import { RosterField } from 'core/components/Roster';
import {
  useNPCData,
  useQuests,
  useLocations,
  resolveLocationName,
} from 'features/campaign-entities';
import AttributionInfo from 'shared/components/AttributionInfo';
import Breadcrumb from 'shared/components/Breadcrumb';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';
import { useNavigation } from 'shared/context/NavigationContext';
import { ArrowLeft, Pencil } from 'lucide-react';

/** Sentence-cases one of the short enum values the type stores lowercase. */
const capitalise = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

/**
 * A note's date, as a date.
 *
 * `NPCNote.date` is a plain string with no agreed shape: the form writes
 * `YYYY-MM-DD`, while the sample-data generator writes a full ISO timestamp.
 * The directory rows print it raw, which is where
 * `2025-05-31T19:27:30.387Z` comes from on an expanded row. A date the reader
 * cannot read is not a date, so the page formats what it can and returns
 * anything unparseable untouched -- the same principle as an unresolved
 * location reference: show it as itself rather than invent a value for it.
 */
const formatNoteDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('en-uk', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

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
 * This page exists because six fields were write-only. `appearance`,
 * `personality`, `background` and all three `connections.*` arrays are
 * collected by both the create and the edit form, written to Firestore, and
 * were rendered by nothing -- the directory row shows four of the type's ten
 * content fields. Retiring `NPCCard` in 7.0 did not cause that: the card had
 * already been unreachable for a phase, and it never rendered `relatedNPCs` or
 * `affiliations` either. So this is not a second view of the row's data. It is
 * the first time some of this data has been readable at all (D61).
 *
 * Read-only by design: 7.2 adds editing in place, 7.3 the image slot. The
 * row's own expansion is untouched, because the phase is additive (D41) and a
 * page that costs the directory anything has failed regardless of how it looks.
 */
const NPCDetailPage: React.FC = () => {
  const { npcId } = useParams<{ npcId: string }>();
  const { navigateToPage } = useNavigation();
  const { npcs, loading, error, refreshNPCs } = useNPCData();
  const { getQuestById } = useQuests();
  const { locations } = useLocations();

  const npc = npcs.find((candidate) => candidate.id === npcId);

  // `loading` folds into the gate's resolving state exactly as it does on the
  // edit page: `npcs` is an empty array while auth and the campaign restore, so
  // without this the page would claim "No NPC with that id" for the
  // found-but-not-yet-loaded case (bug #1424's shape).
  const gate = usePageGate('npcs', {
    loading,
    error,
    onRetry: () => {
      void refreshNPCs();
    },
  });

  // relatedNPCs stores ids; one that no longer resolves is dropped rather than
  // printed raw, the same way the row drops an unresolvable quest.
  const associates = (npc?.connections?.relatedNPCs ?? []).flatMap((id) => {
    const found = npcs.find((candidate) => candidate.id === id);
    return found ? [found] : [];
  });

  const quests = (npc?.connections?.relatedQuests ?? []).flatMap((id) => {
    const quest = getQuestById(id);
    return quest ? [{ id, quest }] : [];
  });

  const affiliations = npc?.connections?.affiliations ?? [];

  const locationName = npc
    ? resolveLocationName(
        { location: npc.location, locationId: npc.locationId },
        locations
      )
    : undefined;

  return (
    <PageShell
      title={
        npc ? (
          <span className="flex items-center gap-3">
            <EntitySigil entityId={npc.id} name={npc.name} size={44} />
            {npc.name}
          </span>
        ) : (
          'NPC'
        )
      }
      subtitle={npc?.title}
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'NPCs', href: '/npcs' },
            { label: npc?.name ?? 'Not found' },
          ]}
          className="mb-4"
        />
      }
      actions={
        gate.canAct &&
        npc && (
          <Button
            onClick={() => navigateToPage(`/npcs/edit/${npc.id}`)}
            startIcon={<Pencil className="w-4 h-4" />}
          >
            Edit NPC
          </Button>
        )
      }
    >
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigateToPage('/npcs')}
          startIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to NPCs
        </Button>
      </div>

      <GatedContent gate={gate}>
        {npc ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
            {/* The record itself, on the page's own surface. */}
            <article className="card rounded-lg p-6 flex flex-col gap-6 h-fit">
              <RosterField label="Description" emptyText="Nothing written yet">
                {npc.description ? (
                  <Typography>{npc.description}</Typography>
                ) : undefined}
              </RosterField>

              <RosterField label="Appearance" emptyText="Not described yet">
                {npc.appearance ? (
                  <Typography>{npc.appearance}</Typography>
                ) : undefined}
              </RosterField>

              <RosterField label="Personality" emptyText="Not described yet">
                {npc.personality ? (
                  <Typography>{npc.personality}</Typography>
                ) : undefined}
              </RosterField>

              <RosterField label="Background" emptyText="Nothing recorded yet">
                {npc.background ? (
                  <Typography>{npc.background}</Typography>
                ) : undefined}
              </RosterField>

              <RosterField label="Notes" emptyText="No notes yet">
                {npc.notes?.length ? (
                  <div className="flex flex-col divide-y card-divider">
                    {npc.notes.map((note, index) => (
                      <div
                        key={`${note.date}-${index}`}
                        className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        {/* When, never who: NPCNote is { date, text } and
                            carries no author, so a byline here would be
                            invented data. */}
                        <Typography
                          variant="body-sm"
                          color="muted"
                          className="text-xs sm:w-24 shrink-0"
                        >
                          {formatNoteDate(note.date)}
                        </Typography>
                        <Typography variant="body-sm" className="min-w-0">
                          {note.text}
                        </Typography>
                      </div>
                    ))}
                  </div>
                ) : undefined}
              </RosterField>
            </article>

            {/* Standing facts and relations, on the quieter surface. */}
            <aside className="bg-secondary card-border rounded-lg p-6 flex flex-col gap-6 h-fit">
              <div className="grid grid-cols-2 gap-4">
                <RosterField label="Status">
                  <Typography variant="body-sm">
                    {capitalise(npc.status)}
                  </Typography>
                </RosterField>
                <RosterField label="Relationship">
                  <Typography variant="body-sm">
                    {capitalise(npc.relationship)}
                  </Typography>
                </RosterField>
                <RosterField label="Race" emptyText="Unrecorded">
                  {npc.race ? (
                    <Typography variant="body-sm">{npc.race}</Typography>
                  ) : undefined}
                </RosterField>
                <RosterField label="Occupation" emptyText="Unrecorded">
                  {npc.occupation ? (
                    <Typography variant="body-sm">{npc.occupation}</Typography>
                  ) : undefined}
                </RosterField>
              </div>

              <RosterField label="Last known location" emptyText="Unknown">
                {/* The stored value may be an id, a name, or free text, and the
                    directories already share one answer for that. Reusing it
                    keeps a dangling reference visible as itself (#1412)
                    instead of this page inventing a prettier name. */}
                {locationName ? (
                  <Typography variant="body-sm">{locationName}</Typography>
                ) : undefined}
              </RosterField>

              <RosterField label="Affiliations" emptyText="None recorded">
                {affiliations.length ? (
                  <div className="flex flex-wrap gap-2">
                    {affiliations.map((affiliation, index) => (
                      <span
                        key={`${affiliation}-${index}`}
                        className="px-2 py-1 rounded-full text-xs card typography-secondary"
                      >
                        {affiliation}
                      </span>
                    ))}
                  </div>
                ) : undefined}
              </RosterField>

              <RosterField label="Known associates" emptyText="None recorded">
                {associates.length ? (
                  <div className="flex flex-col gap-1.5">
                    {associates.map((associate) => (
                      <button
                        key={associate.id}
                        type="button"
                        onClick={() => navigateToPage(`/npcs/${associate.id}`)}
                        className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded-md selectable-item"
                      >
                        <EntitySigil
                          entityId={associate.id}
                          name={associate.name}
                          size={20}
                        />
                        <Typography variant="body-sm">
                          {associate.name}
                          {associate.title && (
                            <span className="typography-secondary ml-1.5">
                              · {associate.title}
                            </span>
                          )}
                        </Typography>
                      </button>
                    ))}
                  </div>
                ) : undefined}
              </RosterField>

              <RosterField label="Related quests" emptyText="No quests linked">
                {quests.length ? (
                  <div className="flex flex-col gap-1.5">
                    {quests.map(({ id, quest }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          navigateToPage(`/quests?highlight=${id}`)
                        }
                        className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded-md selectable-item"
                      >
                        <Typography variant="body-sm">
                          {quest.title}
                          {/* The status is a word, not a hue -- the same rule
                              the row settled in 6.3 (D59). */}
                          <span className="typography-secondary ml-1.5">
                            · {capitalise(quest.status)}
                          </span>
                        </Typography>
                      </button>
                    ))}
                  </div>
                ) : undefined}
              </RosterField>

              <div className="flex flex-col gap-1.5">
                <Typography
                  variant="body-sm"
                  color="muted"
                  className="text-[11px] font-semibold uppercase tracking-wider"
                >
                  Recorded by
                </Typography>
                {/* Created and last-modified are the only two points that exist
                    on ContentAttribution. Two facts, stated plainly -- not a
                    timeline (Q12). */}
                <AttributionInfo item={npc} />
              </div>
            </aside>
          </div>
        ) : (
          <NPCNotFound onBack={() => navigateToPage('/npcs')} />
        )}
      </GatedContent>
    </PageShell>
  );
};

export default NPCDetailPage;
