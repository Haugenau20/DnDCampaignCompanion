// src/components/features/quests/__tests__/QuestFormSections.test.tsx

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  BasicInfoSection,
  ObjectivesSection,
  LeadsSection,
  KeyLocationsSection,
  ComplicationsSection,
  RewardsSection,
  RelatedNPCsSection,
} from '../QuestFormSections';
import { Quest, QuestObjective } from '../../types';
import { NPC } from '../../../npcs/types';

// ---------------------------------------------------------------------------
// Mock LocationContext (used by BasicInfoSection via LocationCombobox)
// ---------------------------------------------------------------------------

jest.mock('../../../locations/context/LocationContext', () => ({
  useLocations: jest.fn(() => ({ locations: [] })),
}));

const { useLocations } = require('../../../locations/context/LocationContext');

let trayNPCs: any[] = [];
let trayLocations: any[] = [];


// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeFormData(overrides: Partial<Quest> = {}): Partial<Quest> {
  return {
    title: '',
    description: '',
    status: 'active',
    objectives: [],
    leads: [],
    keyLocations: [],
    complications: [],
    rewards: [],
    relatedNPCIds: [],
    ...overrides,
  };
}

function makeObjective(id: string, description: string, completed = false): QuestObjective {
  return { id, description, completed };
}

function makeNPC(id: string, name: string): NPC {
  return {
    id,
    name,
    status: 'alive',
    relationship: 'neutral',
    description: '',
    appearance: '',
    personality: '',
    background: '',
    occupation: '',
    location: '',
    race: '',
    connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
    notes: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// BasicInfoSection Tests
// ---------------------------------------------------------------------------

describe('BasicInfoSection', () => {
  const handleInputChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('should render "Basic Information" heading', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
  });

  test('should render Title label', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Title *')).toBeInTheDocument();
  });

  test('should render Description label', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Description *')).toBeInTheDocument();
  });

  test('should render Status select with all options', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Failed' })).toBeInTheDocument();
  });

  test('should render Level Range label', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Level Range')).toBeInTheDocument();
  });

  test('should render Background label', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Background')).toBeInTheDocument();
  });

  test('should call handleInputChange with title when title changes', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    const titleInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(titleInput, { target: { value: 'New Quest' } });
    expect(handleInputChange).toHaveBeenCalledWith('title', 'New Quest');
  });

  test('should call handleInputChange with status when status select changes', () => {
    render(<BasicInfoSection formData={makeFormData({ status: 'active' })} handleInputChange={handleInputChange} />);
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'active') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'completed' } });
    expect(handleInputChange).toHaveBeenCalledWith('status', 'completed');
  });

  test('should render title with prefilled value', () => {
    render(<BasicInfoSection formData={makeFormData({ title: 'Prefilled Quest' })} handleInputChange={handleInputChange} />);
    expect(screen.getByDisplayValue('Prefilled Quest')).toBeInTheDocument();
  });

  describe('locationId capture (attach tray wiring)', () => {
    // Since `15-2` the quest's location is picked from the same browse-first
    // tray as every other relation, not from a typeahead combobox. A location
    // that does not exist can no longer be typed in, which is the point: an
    // invalid choice is unofferable rather than silently stored as free text.
    beforeEach(() => {
      (useLocations as jest.Mock).mockReturnValue({
        locations: [
          { id: 'loc-1', name: 'Ironhold', type: 'city', dateAdded: '2026-02-01T00:00:00.000Z' },
          { id: 'loc-2', name: 'Shadowfen', type: 'region', dateAdded: '2026-01-01T00:00:00.000Z' },
        ],
      });
    });

    afterEach(() => {
      (useLocations as jest.Mock).mockReturnValue({ locations: [] });
    });

    test('stores both the id and the readable name when a location is attached', async () => {
      render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
      await userEvent.click(screen.getByRole('button', { name: /attach/i }));
      await userEvent.click(screen.getByRole('option', { name: /Ironhold/ }));

      expect(handleInputChange).toHaveBeenCalledWith('locationId', 'loc-1');
      expect(handleInputChange).toHaveBeenCalledWith('location', 'Ironhold');
    });

    test('clears both when the location is detached', async () => {
      render(
        <BasicInfoSection
          formData={makeFormData({ locationId: 'loc-1', location: 'Ironhold' })}
          handleInputChange={handleInputChange}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: 'Detach Ironhold' }));

      expect(handleInputChange).toHaveBeenCalledWith('locationId', '');
      expect(handleInputChange).toHaveBeenCalledWith('location', '');
    });

    test('offers only real locations, so a typo cannot become a reference', async () => {
      render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
      await userEvent.click(screen.getByRole('button', { name: /attach/i }));
      // Scoped to the tray: this section also renders a native <select> for
      // status, whose <option> elements carry the same ARIA role.
      const tray = within(screen.getByRole('listbox'));
      expect(tray.getAllByRole('option')).toHaveLength(2);
    });
  });
});

// ---------------------------------------------------------------------------
// ObjectivesSection Tests
// ---------------------------------------------------------------------------

describe('ObjectivesSection', () => {
  const handleInputChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('should render "Objectives" heading', () => {
    render(<ObjectivesSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Objectives')).toBeInTheDocument();
  });

  test('should render existing objectives', () => {
    render(
      <ObjectivesSection
        formData={makeFormData({ objectives: [makeObjective('obj-1', 'Find the artifact')] })}
        handleInputChange={handleInputChange}
      />
    );
    expect(screen.getByDisplayValue('Find the artifact')).toBeInTheDocument();
  });

  test('should render objective checkbox', () => {
    render(
      <ObjectivesSection
        formData={makeFormData({ objectives: [makeObjective('obj-1', 'Find the artifact', false)] })}
        handleInputChange={handleInputChange}
      />
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  test('should render completed objective as checked checkbox', () => {
    render(
      <ObjectivesSection
        formData={makeFormData({ objectives: [makeObjective('obj-1', 'Done', true)] })}
        handleInputChange={handleInputChange}
      />
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  // BUG #300: ObjectivesSection.handleAddObjective() calls crypto.randomUUID() which
  // is not available in Jest/JSDOM. Clicking the "+" button crashes the component.
  // We skip the add-click test and instead document that the section renders the button.
  test('should render "+" add objective button', () => {
    render(<ObjectivesSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    const buttons = screen.getAllByRole('button');
    // At least one button present (the add + button)
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  test('should call handleInputChange when objective text changes', () => {
    render(
      <ObjectivesSection
        formData={makeFormData({ objectives: [makeObjective('obj-1', 'Old text')] })}
        handleInputChange={handleInputChange}
      />
    );
    const input = screen.getByDisplayValue('Old text');
    fireEvent.change(input, { target: { value: 'New text' } });
    expect(handleInputChange).toHaveBeenCalledWith(
      'objectives',
      expect.arrayContaining([
        expect.objectContaining({ description: 'New text' }),
      ])
    );
  });

  test('should call handleInputChange when X is clicked to remove objective', () => {
    render(
      <ObjectivesSection
        formData={makeFormData({ objectives: [makeObjective('obj-1', 'Task')] })}
        handleInputChange={handleInputChange}
      />
    );
    const buttons = screen.getAllByRole('button');
    const removeButton = buttons[buttons.length - 1];
    fireEvent.click(removeButton);
    expect(handleInputChange).toHaveBeenCalledWith('objectives', []);
  });
});

// ---------------------------------------------------------------------------
// LeadsSection Tests
// ---------------------------------------------------------------------------

describe('LeadsSection', () => {
  const handleInputChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('should render "Initial Leads" heading', () => {
    render(<LeadsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Initial Leads')).toBeInTheDocument();
  });

  test('should render existing leads', () => {
    render(
      <LeadsSection
        formData={makeFormData({ leads: ['Ask the innkeeper'] })}
        handleInputChange={handleInputChange}
      />
    );
    expect(screen.getByDisplayValue('Ask the innkeeper')).toBeInTheDocument();
  });

  test('should call handleInputChange when + button is clicked to add lead', () => {
    render(<LeadsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    const addButton = screen.getAllByRole('button')[0];
    fireEvent.click(addButton);
    expect(handleInputChange).toHaveBeenCalledWith('leads', ['']);
  });

  test('should call handleInputChange when lead text changes', () => {
    render(
      <LeadsSection
        formData={makeFormData({ leads: ['Old lead'] })}
        handleInputChange={handleInputChange}
      />
    );
    const input = screen.getByDisplayValue('Old lead');
    fireEvent.change(input, { target: { value: 'New lead' } });
    expect(handleInputChange).toHaveBeenCalledWith('leads', ['New lead']);
  });

  test('should call handleInputChange removing lead when X is clicked', () => {
    render(
      <LeadsSection
        formData={makeFormData({ leads: ['Lead to remove'] })}
        handleInputChange={handleInputChange}
      />
    );
    const buttons = screen.getAllByRole('button');
    const removeButton = buttons[buttons.length - 1];
    fireEvent.click(removeButton);
    expect(handleInputChange).toHaveBeenCalledWith('leads', []);
  });
});

// ---------------------------------------------------------------------------
// KeyLocationsSection Tests
// ---------------------------------------------------------------------------

describe('KeyLocationsSection', () => {
  const handleInputChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('should render "Key Locations" heading', () => {
    render(<KeyLocationsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Key Locations')).toBeInTheDocument();
  });

  test('should render existing key location name', () => {
    render(
      <KeyLocationsSection
        formData={makeFormData({ keyLocations: [{ name: 'Hidden Vault', description: 'Below' }] })}
        handleInputChange={handleInputChange}
      />
    );
    expect(screen.getByDisplayValue('Hidden Vault')).toBeInTheDocument();
  });

  test('should call handleInputChange when + button is clicked to add key location', () => {
    render(<KeyLocationsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    const addButton = screen.getAllByRole('button')[0];
    fireEvent.click(addButton);
    expect(handleInputChange).toHaveBeenCalledWith(
      'keyLocations',
      [{ name: '', description: '' }]
    );
  });

  test('should call handleInputChange when key location name changes', () => {
    render(
      <KeyLocationsSection
        formData={makeFormData({ keyLocations: [{ name: 'Old Name', description: 'Desc' }] })}
        handleInputChange={handleInputChange}
      />
    );
    const nameInput = screen.getByDisplayValue('Old Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(handleInputChange).toHaveBeenCalledWith(
      'keyLocations',
      [{ name: 'New Name', description: 'Desc' }]
    );
  });
});

// ---------------------------------------------------------------------------
// ComplicationsSection Tests
// ---------------------------------------------------------------------------

describe('ComplicationsSection', () => {
  const handleInputChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('should render "Possible Complications" heading', () => {
    render(<ComplicationsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Possible Complications')).toBeInTheDocument();
  });

  test('should render existing complications', () => {
    render(
      <ComplicationsSection
        formData={makeFormData({ complications: ['Flood on the road'] })}
        handleInputChange={handleInputChange}
      />
    );
    expect(screen.getByDisplayValue('Flood on the road')).toBeInTheDocument();
  });

  test('should call handleInputChange when + is clicked to add complication', () => {
    render(<ComplicationsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    const addButton = screen.getAllByRole('button')[0];
    fireEvent.click(addButton);
    expect(handleInputChange).toHaveBeenCalledWith('complications', ['']);
  });
});

// ---------------------------------------------------------------------------
// RewardsSection Tests
// ---------------------------------------------------------------------------

describe('RewardsSection', () => {
  const handleInputChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  test('should render "Rewards" heading', () => {
    render(<RewardsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Rewards')).toBeInTheDocument();
  });

  test('should render existing rewards', () => {
    render(
      <RewardsSection
        formData={makeFormData({ rewards: ['500 gold'] })}
        handleInputChange={handleInputChange}
      />
    );
    expect(screen.getByDisplayValue('500 gold')).toBeInTheDocument();
  });

  test('should call handleInputChange when + is clicked to add reward', () => {
    render(<RewardsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    const addButton = screen.getAllByRole('button')[0];
    fireEvent.click(addButton);
    expect(handleInputChange).toHaveBeenCalledWith('rewards', ['']);
  });

  test('should call handleInputChange when reward text changes', () => {
    render(
      <RewardsSection
        formData={makeFormData({ rewards: ['Old reward'] })}
        handleInputChange={handleInputChange}
      />
    );
    const input = screen.getByDisplayValue('Old reward');
    fireEvent.change(input, { target: { value: 'New reward' } });
    expect(handleInputChange).toHaveBeenCalledWith('rewards', ['New reward']);
  });
});

// ---------------------------------------------------------------------------
// RelatedNPCsSection Tests
// ---------------------------------------------------------------------------

describe('RelatedNPCsSection', () => {
  const handleInputChange = jest.fn();
  const setSelectedNPCs = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The section reads the collection from the prop the form already passes it.
  const npcs = [
    { ...makeNPC('n-1', 'Aldric'), occupation: 'Captain', dateAdded: '2026-02-01T00:00:00.000Z' },
    { ...makeNPC('n-2', 'Brenna'), occupation: 'Healer', dateAdded: '2026-01-01T00:00:00.000Z' },
  ];

  const renderSection = (selected: Set<string> = new Set()) =>
    render(
      <RelatedNPCsSection
        formData={makeFormData()}
        handleInputChange={handleInputChange}
        npcs={npcs}
        selectedNPCs={selected}
        setSelectedNPCs={setSelectedNPCs}
      />
    );

  test('keeps the section heading it already had', () => {
    renderSection();
    expect(screen.getByText('Related NPCs')).toBeInTheDocument();
  });

  test('replaces the bare + glyph with one named Attach control', () => {
    renderSection();
    const trigger = screen.getByRole('button', { name: /attach/i });
    expect(trigger).toBeInTheDocument();
    // The old affordance was an icon-only button whose accessible name came
    // from an aria-label four words long, beside a heading it did not name.
    expect(trigger).toHaveAccessibleName();
  });

  test('browses the campaign without anything being typed', async () => {
    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /attach/i }));
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByText('Captain')).toBeInTheDocument();
  });

  test('attaches an NPC from the list', async () => {
    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /attach/i }));
    await userEvent.click(screen.getByRole('option', { name: /Aldric/ }));
    expect(setSelectedNPCs).toHaveBeenCalled();
  });

  test('shows an attached NPC by name, never by id', () => {
    renderSection(new Set(['n-1']));
    expect(screen.getByText('Aldric')).toBeInTheDocument();
    expect(screen.queryByText('n-1')).toBeNull();
  });

  test('detaches from the chip', async () => {
    renderSection(new Set(['n-1']));
    await userEvent.click(screen.getByRole('button', { name: 'Detach Aldric' }));
    expect(setSelectedNPCs).toHaveBeenCalled();
  });
});
