// src/features/campaign-entities/quests/components/QuestObjectives.tsx
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import ObjectiveCheckbox from 'shared/components/row-controls/ObjectiveCheckbox';
import { InlineEditor } from 'shared/components/inline-edit';
import { EntityPageSection, FieldPrompt } from 'shared/components/entity-page';
import { Quest } from '../types';
import { objectiveProgressOf } from '../utils/quest-presentation';

export interface QuestObjectivesProps {
  quest: Quest;
  canAct: boolean;
  /** The same write the row makes, from the same contract. */
  onToggle: (objectiveId: string, completed: boolean) => Promise<unknown>;
  onAdd: (description: string) => Promise<void>;
  onEdit: (objectiveId: string, description: string) => Promise<void>;
  onMove: (objectiveId: string, direction: 'up' | 'down') => Promise<unknown>;
  /** Conclude the quest. Only ever called because someone asked for it. */
  onComplete: () => Promise<unknown>;
  /**
   * `15-1`'s contract: quick add names the first unwritten field and the page
   * focuses it. A quest's is `objectives`, and a quest created through quick
   * add has none -- which is exactly the state this section is for.
   */
  focusAdd?: boolean;
}

/**
 * The objectives of one quest, ticked and authored where they are read.
 *
 * **Objectives are the spine** (`15-5` item 2). They are the one part of a
 * quest that changes mid-session, which is why they are also the one part the
 * directory row keeps -- the same `ObjectiveCheckbox`, the same write, the same
 * §7 contract, so ticking from the row and ticking from the page cannot come
 * to different conclusions. What the page adds is authoring: add, reword, and
 * move one up or down.
 *
 * **Completion is offered, never assumed.** `updateQuestObjective` used to flip
 * the quest to `completed` and stamp `dateCompleted` the moment the last box
 * was ticked, in the same write, with nothing on screen saying so. Ticking the
 * last objective usually means the party did the last thing on the list, not
 * that the quest is over -- the reward is unclaimed, the patron unvisited. So
 * the last tick raises a question here instead, and the status only moves when
 * someone answers it.
 *
 * **Reorder is two buttons, not a drag handle.** `S3` draws a drag affordance;
 * a keyboard cannot use one, a phone at the table fights it, and jsdom cannot
 * test it. Up and down each name the objective they move, so the control works
 * by voice, by keyboard and one-handed.
 */
export const QuestObjectives: React.FC<QuestObjectivesProps> = ({
  quest,
  canAct,
  onToggle,
  onAdd,
  onEdit,
  onMove,
  onComplete,
  focusAdd = false,
}) => {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const addRef = useRef<HTMLDivElement>(null);

  const objectives = quest.objectives ?? [];
  const { completed, total, allComplete } = objectiveProgressOf(objectives);

  // The quick-add hand-off: open the editor and put the cursor in it, rather
  // than leaving someone to find the one control the previous screen promised.
  useEffect(() => {
    if (!focusAdd || !canAct) return;
    setAdding(true);
    addRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [focusAdd, canAct]);

  const offerCompletion = canAct && allComplete && quest.status === 'active';

  return (
    <EntityPageSection
      title="Objectives"
      count={total || undefined}
      action={
        canAct && total > 0 && !adding ? (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            Add objective
          </Button>
        ) : undefined
      }
    >
      {total > 0 ? (
        <>
          <Typography variant="body-sm" color="secondary" className="text-xs">
            {completed} of {total} ticked — tick them here or from the list, mid-session
          </Typography>

          <ul className="flex flex-col divide-y card-divider list-none p-0 m-0">
            {objectives.map((objective, index) => (
              <li key={objective.id} className="py-1 first:pt-0 last:pb-0">
                {editingId === objective.id ? (
                  <InlineEditor
                    label="Objective"
                    rows={1}
                    initialValue={objective.description}
                    submitLabel="Save objective"
                    onSubmit={(value) => onEdit(objective.id, value)}
                    onSaved={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-1">
                    <ObjectiveCheckbox
                      className="flex-1 min-w-0"
                      description={objective.description}
                      completed={objective.completed}
                      onToggle={(next) => onToggle(objective.id, next)}
                    />
                    {canAct && (
                      <>
                        <button
                          type="button"
                          aria-label={`Reword ${objective.description}`}
                          onClick={() => setEditingId(objective.id)}
                          className="button-ghost rounded-full p-1.5 shrink-0"
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        {/*
                          Disabled at the ends rather than wrapping: an
                          objective that jumped from the bottom of the list to
                          the top would be a write nobody asked for.
                        */}
                        <button
                          type="button"
                          aria-label={`Move ${objective.description} up`}
                          disabled={index === 0}
                          onClick={() => void onMove(objective.id, 'up')}
                          className="button-ghost rounded-full p-1.5 shrink-0 disabled:opacity-40"
                        >
                          <ChevronUp size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${objective.description} down`}
                          disabled={index === objectives.length - 1}
                          onClick={() => void onMove(objective.id, 'down')}
                          className="button-ghost rounded-full p-1.5 shrink-0 disabled:opacity-40"
                        >
                          <ChevronDown size={14} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        !adding && (
          <Typography variant="body-sm" color="secondary" className="italic">
            Nothing agreed yet
          </Typography>
        )
      )}

      {/*
        The offer, not the act. It appears only while the quest is still
        active, so a quest already concluded does not keep asking.
      */}
      {offerCompletion && (
        <div className="bg-secondary rounded-md p-3 flex flex-col gap-2">
          <Typography variant="body-sm">
            Every objective is ticked. Is the quest finished?
          </Typography>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={completing}
              onClick={() => {
                setCompleting(true);
                setCompleteError(null);
                void Promise.resolve(onComplete())
                  .catch((error: unknown) =>
                    setCompleteError(
                      error instanceof Error ? error.message : 'Could not complete the quest.'
                    )
                  )
                  .finally(() => setCompleting(false));
              }}
            >
              {completing ? 'Completing…' : 'Mark the quest completed'}
            </Button>
            <Typography variant="body-sm" color="secondary" className="text-xs">
              Or leave it open — ticking the last objective changes nothing on its own.
            </Typography>
          </div>
          {completeError && (
            <Typography variant="body-sm" color="error" role="alert">
              {completeError}
            </Typography>
          )}
        </div>
      )}

      {canAct && (
        <div ref={addRef}>
          {adding ? (
            <InlineEditor
              label="Add an objective"
              helperText="One thing the party agreed to do. It joins the end of the list."
              rows={1}
              submitLabel="Add objective"
              placeholder="Find the secret door"
              clearOnSave
              onSubmit={onAdd}
              onSaved={() => undefined}
              onCancel={() => setAdding(false)}
            />
          ) : (
            total === 0 && (
              <FieldPrompt onClick={() => setAdding(true)}>
                What did the party agree to do?
              </FieldPrompt>
            )
          )}
        </div>
      )}
    </EntityPageSection>
  );
};

export default QuestObjectives;
