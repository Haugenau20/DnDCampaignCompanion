// src/features/campaign-entities/quests/components/QuestRowSummary.tsx
import React from 'react';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import EntitySigil from 'core/components/EntitySigil';
import StateLadder from 'shared/components/row-controls/StateLadder';
import ObjectiveCheckbox from 'shared/components/row-controls/ObjectiveCheckbox';
import { Quest, QuestStatus } from '../types';
import { QUEST_STATUS_OPTIONS } from '../utils/quest-presentation';

export interface QuestRowSummaryProps {
  quest: Quest;
  /** Resolve an NPC id to a name and a one-line description, or `null`. */
  npcFor: (npcId: string) => { name: string; line: string } | null;
  onToggleObjective: (objectiveId: string, completed: boolean) => Promise<unknown>;
  onChangeStatus: (status: QuestStatus) => Promise<unknown>;
  onOpenNPC: (npcId: string) => void;
  /** The way into `/quests/:questId`, where the prep material now lives. */
  onOpenQuest: () => void;
}

/**
 * The status options moved to `quest-presentation.ts` in `15-5`, so the row and
 * `/quests/:questId` offer the same three words in the same order. A quest
 * concludes, so its status has real valence -- but the *ladder* does not paint
 * it: the selected chip says "this is the current one", and the valence belongs
 * to the status word in the collapsed row.
 */

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
 * `15-5` built that page, so the surplus has gone to it and the second,
 * closed disclosure that held it here in the meantime is gone with it. What is
 * left is the four facts and a way in: description, objectives, who is in it,
 * the status control, and *More info*.
 */
export const QuestRowSummary: React.FC<QuestRowSummaryProps> = ({
  quest,
  npcFor,
  onToggleObjective,
  onChangeStatus,
  onOpenNPC,
  onOpenQuest,
}) => {
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
          options={QUEST_STATUS_OPTIONS}
          value={quest.status}
          ariaLabel={`Status of ${quest.title}`}
          onChange={onChangeStatus}
        />

        {/*
          The way into the quest's own page, where the prep material lives
          since `15-5`. It sits in the expanded content and never in the
          collapsed row: the collapsed row is the highest-frequency surface in
          the product and does not get a second control (D41). A row that is
          already open has said it wants more.
        */}
        <Button variant="outline" size="sm" onClick={onOpenQuest} className="self-start">
          More info
        </Button>
      </div>
    </div>
  );
};

export default QuestRowSummary;
