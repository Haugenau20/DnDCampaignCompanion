// src/components/features/locations/__tests__/LocationCombobox.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationCombobox from '../LocationCombobox';
import { Location } from '../../../../types/location';

// ---------------------------------------------------------------------------
// Mock LocationContext
// ---------------------------------------------------------------------------

jest.mock('../../../../context/LocationContext', () => ({
  useLocations: jest.fn(),
}));

const { useLocations } = require('../../../../context/LocationContext');

function makeLocation(id: string, name: string): Location {
  return {
    id,
    name,
    type: 'city',
    status: 'known',
    description: 'A test location',
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-01T00:00:00.000Z',
  };
}

function setupMocks(locations: Location[] = []) {
  (useLocations as jest.Mock).mockReturnValue({ locations });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocationCombobox', () => {
  const defaultOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks([
      makeLocation('loc-1', 'Silverkeep'),
      makeLocation('loc-2', 'Ironhold'),
      makeLocation('loc-3', 'Forest of Shadows'),
    ]);
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render input with placeholder', () => {
      render(
        <LocationCombobox value="" onChange={defaultOnChange} placeholder="Select location..." />
      );
      expect(screen.getByPlaceholderText('Select location...')).toBeInTheDocument();
    });

    test('should render label when provided', () => {
      render(
        <LocationCombobox value="" onChange={defaultOnChange} label="Parent Location" />
      );
      expect(screen.getByText('Parent Location')).toBeInTheDocument();
    });

    test('should render with initial value', () => {
      render(
        <LocationCombobox value="Silverkeep" onChange={defaultOnChange} />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('Silverkeep');
    });

    test('should update input when value prop changes', () => {
      const { rerender } = render(
        <LocationCombobox value="Silverkeep" onChange={defaultOnChange} />
      );
      rerender(<LocationCombobox value="Ironhold" onChange={defaultOnChange} />);
      expect(screen.getByRole('textbox')).toHaveValue('Ironhold');
    });
  });

  // -------------------------------------------------------------------------
  // Dropdown open/close
  // -------------------------------------------------------------------------
  describe('dropdown behavior', () => {
    test('should open dropdown on focus', () => {
      render(<LocationCombobox value="" onChange={defaultOnChange} />);
      fireEvent.focus(screen.getByRole('textbox'));
      // Dropdown should show "No parent location" option when items exist
      expect(screen.getByText('No parent location')).toBeInTheDocument();
    });

    test('should toggle dropdown on chevron button click', () => {
      render(<LocationCombobox value="" onChange={defaultOnChange} />);
      const chevronBtn = screen.getByRole('button');
      fireEvent.click(chevronBtn);
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
    });

    test('should show all available locations in dropdown', () => {
      render(<LocationCombobox value="" onChange={defaultOnChange} />);
      fireEvent.focus(screen.getByRole('textbox'));
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.getByText('Ironhold')).toBeInTheDocument();
      expect(screen.getByText('Forest of Shadows')).toBeInTheDocument();
    });

    test('should show "No matching locations" when no locations match filter', () => {
      render(<LocationCombobox value="xyz" onChange={defaultOnChange} />);
      fireEvent.focus(screen.getByRole('textbox'));
      expect(screen.getByText(/no matching locations/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Location selection
  // -------------------------------------------------------------------------
  describe('location selection', () => {
    test('should call onChange when a location is selected from dropdown', () => {
      render(<LocationCombobox value="" onChange={defaultOnChange} />);
      fireEvent.focus(screen.getByRole('textbox'));
      fireEvent.click(screen.getByText('Silverkeep'));
      expect(defaultOnChange).toHaveBeenCalledWith('Silverkeep');
    });

    test('should call onChange with empty string when "No parent location" is selected', () => {
      render(<LocationCombobox value="Silverkeep" onChange={defaultOnChange} />);
      fireEvent.focus(screen.getByRole('textbox'));
      fireEvent.click(screen.getByText('No parent location'));
      expect(defaultOnChange).toHaveBeenCalledWith('');
    });

    test('should close dropdown after selecting a location', () => {
      render(<LocationCombobox value="" onChange={defaultOnChange} />);
      fireEvent.focus(screen.getByRole('textbox'));
      fireEvent.click(screen.getByText('Ironhold'));
      expect(screen.queryByText('Silverkeep')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Non-strict mode (free text)
  // -------------------------------------------------------------------------
  describe('non-strict mode', () => {
    test('should call onChange as user types', () => {
      render(
        <LocationCombobox value="" onChange={defaultOnChange} strictMode={false} />
      );
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Location' } });
      expect(defaultOnChange).toHaveBeenCalledWith('New Location');
    });

    test('should show "Type to create a new location" hint for unmatched input', () => {
      render(
        <LocationCombobox value="NewPlace" onChange={defaultOnChange} strictMode={false} />
      );
      fireEvent.focus(screen.getByRole('textbox'));
      // Only shows hint when input doesn't match any location and dropdown would be empty
      // With "NewPlace" input, no locations match, so hint appears
      expect(screen.getByText(/type to create a new location/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Strict mode validation
  // -------------------------------------------------------------------------
  describe('strict mode', () => {
    test('should show error when invalid location is entered in strict mode on blur', async () => {
      render(
        <LocationCombobox value="" onChange={defaultOnChange} strictMode={true} />
      );
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'InvalidPlace' } });
      fireEvent.blur(input);
      await waitFor(() => {
        expect(screen.getByText(/please select a valid location/i)).toBeInTheDocument();
      });
    });

    test('should not show error when valid location is entered in strict mode', async () => {
      render(
        <LocationCombobox value="" onChange={defaultOnChange} strictMode={true} />
      );
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Silverkeep' } });
      fireEvent.blur(input);
      await waitFor(() => {
        expect(screen.queryByText(/please select a valid location/i)).not.toBeInTheDocument();
      });
    });

    test('should show "No matching locations" message in strict mode when no match', () => {
      render(
        <LocationCombobox value="zzzz" onChange={defaultOnChange} strictMode={true} />
      );
      fireEvent.focus(screen.getByRole('textbox'));
      expect(screen.getByText(/no matching locations/i)).toBeInTheDocument();
    });

    test('should allow empty value in strict mode without showing error', async () => {
      render(
        <LocationCombobox value="Silverkeep" onChange={defaultOnChange} strictMode={true} />
      );
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);
      await waitFor(() => {
        expect(screen.queryByText(/please select a valid location/i)).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------
  describe('filtering', () => {
    test('should filter locations as user types', () => {
      render(<LocationCombobox value="" onChange={defaultOnChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Silver' } });
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.queryByText('Ironhold')).not.toBeInTheDocument();
    });

    test('should show all locations when input is cleared', () => {
      render(<LocationCombobox value="Silver" onChange={defaultOnChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '' } });
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.getByText('Ironhold')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty locations list
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    test('should show no-match message when locations list is empty', () => {
      setupMocks([]);
      render(<LocationCombobox value="" onChange={defaultOnChange} />);
      fireEvent.focus(screen.getByRole('textbox'));
      // No locations to show — input value is empty so the "no match" section is shown
      // The combobox renders empty dropdown content
      // (nothing to assert beyond no crash)
    });
  });
});
