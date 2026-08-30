// src/shared/components/contact/CategoryChips.tsx
import React from "react";
import { clsx } from "clsx";
import { CONTACT_CATEGORIES, ContactCategoryId } from "./contact-categories";

/**
 * Props for the CategoryChips component
 */
interface CategoryChipsProps {
  /** The currently selected category, or null if none is chosen yet */
  value: ContactCategoryId | null;
  /** Called with the id of a newly selected category */
  onChange: (id: ContactCategoryId) => void;
  /** Disables selection, e.g. while a submission is in flight */
  disabled?: boolean;
}

/**
 * The single-select pill row that replaces the free-text subject field.
 *
 * Built as a real radiogroup rather than a row of toggle buttons: only the
 * selected chip sits in the tab order, so a keyboard user tabs into the group
 * once instead of through five controls, which is what a radio group is for.
 */
const CategoryChips: React.FC<CategoryChipsProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div
      role="radiogroup"
      aria-label="What's this about?"
      className="flex flex-wrap gap-2"
    >
      {CONTACT_CATEGORIES.map((category, index) => {
        const isSelected = value === category.id;
        // With nothing selected, the first chip is the group's tab stop.
        const isTabStop = isSelected || (value === null && index === 0);

        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isTabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(category.id)}
            className={clsx(
              "button chip rounded-full border px-4 py-2 text-sm",
              isSelected && "chip-selected"
            )}
          >
            {category.chipLabel}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryChips;
