import React, { useState, useEffect, useRef } from 'react';
import { useLocations } from '../../../context/LocationContext';
import { MapPin, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import Typography from '../../core/Typography';
import clsx from 'clsx';

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  /**
   * If true, only allows selection from existing locations
   * If false, allows custom location names to be entered
   */
  strictMode?: boolean;
}

const LocationCombobox: React.FC<LocationComboboxProps> = ({
  value,
  onChange,
  label,
  placeholder = "Select location...",
  className = "",
  strictMode = false
}) => {
  const { locations } = useLocations();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get unique location names from the locations context
  const uniqueLocations = Array.from(
    new Set(locations.map(loc => loc.name))
  ).sort();

  // Filter locations based on input
  const filteredLocations = uniqueLocations.filter(loc =>
    loc.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Check if input value is a valid location
  const isValidLocation = inputValue === '' || uniqueLocations.some(
    loc => loc.toLowerCase() === inputValue.toLowerCase()
  );

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    // If not in strict mode, update value as user types
    if (!strictMode) {
      onChange(e.target.value);
    }
    
    setError(null);
  };

  // Handle location selection
  const handleLocationSelect = (location: string) => {
    setInputValue(location);
    onChange(location);
    setIsOpen(false);
    setError(null);
  };

  // Handle input blur - validate location in strict mode
  const handleBlur = () => {
    // If not in strict mode, any input is valid
    if (!strictMode) {
      return;
    }
    
    // Allow empty value (no parent location)
    if (inputValue === '') {
      onChange('');
      setError(null);
      return;
    }

    // If input doesn't match any location, show error
    if (!isValidLocation) {
      setError('Please select a valid location');
      // Reset to previous valid value
      setInputValue(value);
      return;
    }

    // Find exact match (case insensitive)
    const matchedLocation = uniqueLocations.find(
      loc => loc.toLowerCase() === inputValue.toLowerCase()
    );
    
    if (matchedLocation) {
      // Update with correctly cased value
      setInputValue(matchedLocation);
      onChange(matchedLocation);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        handleBlur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value]);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium mb-1 form-label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={clsx(
            "w-full rounded-lg border p-2 pl-10 pr-8 focus:outline-none input",
            error && "input-error"
          )}
        />
        <MapPin 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 typography-secondary" 
          size={16}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 typography-secondary"
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center mt-1 gap-1">
          <AlertCircle size={14} className="form-error" />
          <Typography variant="body-sm" color="error">
            {error}
          </Typography>
        </div>
      )}

      {/* Helper message */}
      {!strictMode && !error && filteredLocations.length === 0 && inputValue && (
        <div className="mt-1">
          <Typography variant="body-sm" color="secondary">
            Type to create a new location
          </Typography>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto dropdown"
        >
          {filteredLocations.length > 0 ? (
            <div className="py-1">
              {/* Empty option */}
              <button
                onClick={() => handleLocationSelect('')}
                className={clsx(
                  "w-full text-left px-4 py-2",
                  inputValue === '' 
                    ? `dropdown-item-active`
                    : `dropdown-item`
                )}
              >
                <Typography variant="body-sm">
                  No parent location
                </Typography>
              </button>
              
              {filteredLocations.map((location) => (
                <button
                  key={location}
                  onClick={() => handleLocationSelect(location)}
                  className={clsx(
                    "w-full text-left px-4 py-2",
                    location.toLowerCase() === inputValue.toLowerCase()
                      ? `dropdown-item-active`
                      : `dropdown-item`
                  )}
                >
                  <Typography variant="body-sm">
                    {location}
                  </Typography>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-2">
              <Typography variant="body-sm" color="secondary">
                {strictMode 
                  ? "No matching locations" 
                  : "No matching locations, type to create new"}
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationCombobox;