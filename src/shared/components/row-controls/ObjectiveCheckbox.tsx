// src/shared/components/row-controls/ObjectiveCheckbox.tsx
import React from "react";
import clsx from "clsx";
import Typography from "core/components/Typography";
import { usePendingWrite } from "./usePendingWrite";

export interface ObjectiveCheckboxProps {
  /** The objective's text. Also the checkbox's accessible name. */
  description: string;
  completed: boolean;
  /** Perform the write. Rejecting leaves the box as the record has it. */
  onToggle: (completed: boolean) => Promise<unknown>;
  className?: string;
}

/**
 * One quest objective, tickable where it is read.
 *
 * Closes T016. `updateQuestObjective(questId, objectiveId, completed)` has been
 * on the quest context, on its interface, and covered by a dedicated eight-case
 * suite for some time -- with **no production component calling it**. Ticking an
 * objective meant opening the edit form.
 *
 * The box it replaces was a decorative `<div>` marked `aria-hidden`, so giving
 * this an accessible name is new work rather than a prop change: a real
 * `<input type="checkbox">` named by the objective it belongs to.
 *
 * **It is a write, not a toggle** (§7): pending state on its own row, the box
 * showing what the record holds until the server agrees, and the reason in
 * words beside it when the write is refused. A ticked objective keeps its
 * strike and stays where it is -- the list is never reordered under someone
 * mid-session.
 */
export const ObjectiveCheckbox: React.FC<ObjectiveCheckboxProps> = ({
  description,
  completed,
  onToggle,
  className,
}) => {
  const { isPending, error, run } = usePendingWrite();

  return (
    <div className={clsx("flex flex-col gap-0.5", className)}>
      {/*
        A 44px row holding a 22px box on a phone: ticking an objective at the
        table is the most common one-handed action in the product (S9's
        implementer notes). From `sm` up the pointer is a mouse and the row
        tightens, which is what keeps a five-objective quest inside the
        expansion's ~220px budget (§1.3).
      */}
      <div className="flex items-center gap-3 min-h-[44px] sm:min-h-[34px]">
        {/*
          The label wraps the box and its description and nothing else. The
          pending indicator is a sibling: inside the label it would become part
          of the checkbox's accessible name, so a screen reader would announce
          the objective as "Slay the dragon Saving…".
        */}
        <label className="flex items-center gap-3 flex-1 cursor-pointer">
          <input
            type="checkbox"
            checked={completed}
            disabled={isPending}
            onChange={(event) => {
              void run(() => onToggle(event.target.checked));
            }}
            className={clsx(
              "w-[22px] h-[22px] shrink-0 rounded border disabled:cursor-wait",
              // The theme owns the colour, as it did for the decorative box
              // this replaces -- never a hardcoded one, and never Tailwind's
              // `accent-*`, which would ignore the campaign's palette.
              completed ? "objective-completed" : "objective-pending"
            )}
          />
          <Typography
            variant="body"
            className={clsx(
              "flex-1",
              // A ticked objective keeps its strike, and keeps its place.
              completed && "line-through typography-secondary"
            )}
          >
            {description}
          </Typography>
        </label>

        {isPending && (
          <Typography variant="body-sm" color="secondary" aria-live="polite" className="shrink-0">
            Saving…
          </Typography>
        )}
      </div>

      {error && (
        <Typography variant="body-sm" color="error" role="alert" className="pl-[34px]">
          {error}
        </Typography>
      )}
    </div>
  );
};

export default ObjectiveCheckbox;
