// src/features/campaign-entities/locations/components/LocationChildStrategyChoice.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import { LocationChildStrategy } from '../types';

/** One answer to "what happens to the places inside?", as the dialog words it. */
export interface LocationChildStrategyOption {
  value: LocationChildStrategy;
  label: string;
  detail: string;
}

export interface LocationChildStrategyChoiceProps {
  /** Read by screen readers as the question the options answer. */
  legend: string;
  /** Keep them first: it is the default, and the one nothing is lost by. */
  options: LocationChildStrategyOption[];
  value: LocationChildStrategy;
  onChange: (value: LocationChildStrategy) => void;
  disabled?: boolean;
}

/**
 * The question deleting a place asks about the places inside it (§6.2: never
 * orphan, never decide silently), shared by deleting one place and several.
 */
export const LocationChildStrategyChoice: React.FC<LocationChildStrategyChoiceProps> = ({
  legend,
  options,
  value,
  onChange,
  disabled = false,
}) => (
  <fieldset className="flex flex-col gap-2 border-0 p-0 m-0">
    <legend className="sr-only">{legend}</legend>
    {options.map((option) => (
      <label
        key={option.value}
        className="flex items-start gap-3 p-3 rounded-md card-border border cursor-pointer selectable-item"
      >
        <input
          type="radio"
          name="location-child-strategy"
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
          disabled={disabled}
          className="mt-1 shrink-0"
        />
        <span className="min-w-0">
          <Typography variant="body-sm" className="block">
            {option.label}
          </Typography>
          <Typography variant="body-sm" color="secondary" className="block text-xs">
            {option.detail}
          </Typography>
        </span>
      </label>
    ))}
  </fieldset>
);

export default LocationChildStrategyChoice;
