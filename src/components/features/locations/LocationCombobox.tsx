import React, { useState, useEffect, useRef } from 'react';
import { useLocations } from '../../../context/LocationContext';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import Typography from '../../core/Typography';
import clsx from 'clsx';

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

const LocationCombobox: React.FC<LocationComboboxProps> = ({
  value,
  onChange,
  label,
  placeholder = "Select or enter location...",
  className = ""
}) => {
  const { locations } = useLocations();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
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

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
  };

  // Handle location selection
  const handleLocationSelect = (location: string) => {
    setInputValue(location);
    onChange(location);
    setIsOpen(false);
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
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          placeholder={placeholder}
          className="w-full rounded-lg border p-2 pl-10 pr-8 focus:outline-none input"
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

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto dropdown"
        >
          {filteredLocations.length > 0 ? (
            <div className="py-1">
              {filteredLocations.map((location) => (
                <button
                  key={location}
                  onClick={() => handleLocationSelect(location)}
                  className={clsx(
                    "w-full text-left px-4 py-2",
                    location === inputValue 
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
                No matching locations. Type to add new.
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationCombobox;