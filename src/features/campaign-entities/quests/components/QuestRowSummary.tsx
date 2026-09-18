// src/features/campaign-entities/quests/components/QuestRowSummary.tsx
import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Typography from 'core/components/Typography';
import EntitySigil from 'core/components/EntitySigil';
import StateLadder from 'shared/components/row-controls/StateLadder';
import ObjectiveCheckbox from 'shared/components/row-controls/ObjectiveCheckbox';
import { Quest, QuestStatus } from '../types';

export interface QuestRowSummaryProps {
  quest: Quest;
  /** Resolve an NPC id to a name and a one-line description, or `null`. */
  npcFor: (npcId: string) => { name: string; line: string } | null;
  onToggleObjective: (objectiveId: string, completed: boolean) => Promise<unknown>;
  onChangeStatus: (status: QuestStatus) => Promise<unknown>;
  onOpenNPC: (npcId: string) => void;
  /** The surplus the quest page takes over in `15-5`. */
  prep?: React.ReactNode;
}

const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'completed' as const, label: 'Completed', selectedClassName: 'outcome-completed' },
  { value: 'failed' as const, label: 'Failed', selectedClassName: 'outcome-failed' },
];

/** The uppercase micro-label each part of the summary is introduced by. */
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
 * What an expanded quest row holds: four facts, and nothing else.
 *
 * The row used to render nine sections and two actions -- a detail page inside
 * an accordion, about 1,100px tall, which pushed the next quest off screen.
 * `00-entity-authoring.md` §3 divides the record by one test: *can this be read
 * while scanning five of them?* Description, objectives, who is in it and the
 * status control pass it. Background, leads, complications, rewards, level
 * range and the rest are read once while prepping, which is what a page is for.
 *
 * Until `/quests/:questId` exists (`15-5`) that surplus has nowhere to go, so
 * it stays here behind a second, closed disclosure -- reachable, but no longer
 * the thing the row costs you. `15-1` item 1 allows exactly this and asks that
 * the PR say which was done.
 */
export const QuestRowSummary: React.FC<QuestRowSummaryProps> = ({
  quest,
  npcFor,
  onToggleObjective,
  onChangeStatus,
  onOpenNPC,
  prep,
}) => {
  const [showPrep, setShowPrep] = useState(false);
  const prepId = React.useId();

  const relatedNPCIds = quest.relatedNPCIds ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 pt-4">
      <div className="flex flex-col gap-4">
        <Typography variant="body-sm">{quest.description}</Typography>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <FieldLabel>Objectives</FieldLabel>
            {quest.objectives.length > 0 && (
              <Typography variant="body-sm" color="secondary" className="text-xs">
                — tick them here, mid-session
              </Typography>
            )}
          </div>

          {quest.objectives.length ? (
            <div className="flex flex-col">
              {quest.objectives.map((objective) => (
                <ObjectiveCheckbox
                  key={objective.id}
                  description={objective.description}
                  completed={objective.completed}
                  onToggle={(completed) => onToggleObjective(objective.id, completed)}
                />
              ))}
            </div>
          ) : (
            <Typography variant="body-sm" color="secondary" className="italic">
              No objectives recorded
            </Typography>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <FieldLabel>Who is in it</FieldLabel>
          {relatedNPCIds.length ? (
            <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
              {relatedNPCIds.map((npcId) => {
                const npc = npcFor(npcId);
                // A reference that no longer resolves says so; it never prints
                // the id as though it were a name.
                if (!npc) {
                  return (
                    <li key={npcId}>
                      <Typography variant="body-sm" color="secondary" className="italic">
                        Someone no longer in the directory
                      </Typography>
                    </li>
                  );
                }
                return (
                  <li key={npcId}>
                    <button
                      type="button"
                      onClick={() => onOpenNPC(npcId)}
                      className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full chip"
                    >
                      <EntitySigil entityId={npcId} name={npc.name} size={16} />
                      <span className="font-heading text-sm">{npc.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Typography variant="body-sm" color="secondary" className="italic">
              Nobody attached yet
            </Typography>
          )}
        </div>

        <StateLadder
          label="Status"
          options={STATUS_OPTIONS}
          value={quest.status}
          ariaLabel={`Status of ${quest.title}`}
          onChange={onChangeStatus}
        />

        {prep && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowPrep((shown) => !shown)}
              aria-expanded={showPrep}
              aria-controls={prepId}
              className="flex items-center gap-1 text-sm typography-secondary text-left"
            >
              <ChevronRight
                size={14}
                aria-hidden="true"
                className={showPrep ? 'rotate-90 transition-transform' : 'transition-transform'}
              />
              Prep — background, leads, rewards
            </button>
            {/*
              The display class is applied only while open. `hidden` is an
              attribute selector, so a class like `flex` outranks
              `[hidden] { display: none }` and the block stays on screen --
              which is how the "bounded" expansion measured 1,040px in the
              running app while every test passed.
            */}
            <div
              id={prepId}
              hidden={!showPrep}
              className={showPrep ? 'flex flex-col gap-4' : undefined}
            >
              {prep}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestRowSummary;
