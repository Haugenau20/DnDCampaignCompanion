// src/features/campaign-entities/locations/components/__tests__/LocationFormSections.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  BasicInfoSection,
  FeaturesSection,
  TagsSection,
  RelatedQuestsSection,
  RelatedNPCsSection,
} from '../LocationFormSections';
import { Location } from '../../types';
import { NPC } from '../../../npcs/types';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

jest.mock('../../context/LocationContext', () => ({
  useLocations: jest.fn(() => ({ locations: [] })),
}));

const { useLocations } = require('../../context/LocationContext');

jest.mock('../../../quests/context/QuestContext', () => ({
  useQuests: jest.fn(),
}));

const { useQuests } = require('../../../quests/context/QuestContext');

function setupQuestsMock(quests: any[] = []) {
  (useQuests as jest.Mock).mockReturnValue({ quests });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeFormData(overrides: Partial<Location> = {}): Partial<Location> {
  return {
    name: '',
    description: '',
    type: 'poi',
    status: 'known',
    features: [],
    connectedNPCs: [],
    relatedQuests: [],
    notes: [],
    tags: [],
    ...overrides,
  };
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render "Basic Information" heading', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
  });

  test('should render Name label', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Name *')).toBeInTheDocument();
  });

  test('should render Description label', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Description *')).toBeInTheDocument();
  });

  test('should render Type select', () => {
    render(<BasicInfoSection formData={makeFormData({ type: 'city' })} handleInputChange={handleInputChange} />);
    const selects = screen.getAllByRole('combobox');
    const typeSelect = selects.find(s => (s as HTMLSelectElement).value === 'city');
    expect(typeSelect).toBeDefined();
  });

  test('should render Status select', () => {
    render(<BasicInfoSection formData={makeFormData({ status: 'explored' })} handleInputChange={handleInputChange} />);
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'explored');
    expect(statusSelect).toBeDefined();
  });

  test('should call handleInputChange with name field when name changes', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    const nameInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(nameInput, { target: { value: 'Silverkeep' } });
    expect(handleInputChange).toHaveBeenCalledWith('name', 'Silverkeep');
  });

  test('should call handleInputChange with type when type select changes', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    const selects = screen.getAllByRole('combobox');
    const typeSelect = selects.find(s => (s as HTMLSelectElement).value === 'poi') as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'city' } });
    expect(handleInputChange).toHaveBeenCalledWith('type', 'city');
  });

  test('should call handleInputChange with status when status select changes', () => {
    render(<BasicInfoSection formData={makeFormData({ status: 'known' })} handleInputChange={handleInputChange} />);
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'known') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'visited' } });
    expect(handleInputChange).toHaveBeenCalledWith('status', 'visited');
  });

  test('should render name with prefilled value', () => {
    render(<BasicInfoSection formData={makeFormData({ name: 'Ironhold' })} handleInputChange={handleInputChange} />);
    const nameInput = screen.getAllByRole('textbox')[0];
    expect(nameInput).toHaveValue('Ironhold');
  });

  test('should render description with prefilled value', () => {
    render(<BasicInfoSection formData={makeFormData({ description: 'A dark dungeon' })} handleInputChange={handleInputChange} />);
    expect(screen.getByDisplayValue('A dark dungeon')).toBeInTheDocument();
  });

  test('should render all Type options', () => {
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByRole('option', { name: 'Region' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'City' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Town' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Village' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Dungeon' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Landmark' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Building' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Point of Interest' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// BasicInfoSection - parentId resolution via combobox selection (Task 2 probe)
// ---------------------------------------------------------------------------
//
// LocationCombobox only ever deals in location *names* (it lists
// `locations.map(loc => loc.name)`), and BasicInfoSection turns the selected
// name back into an id by re-slugifying it:
//   onChange={(value) => handleInputChange('parentId', generateLocationId(value))}
// That is only correct while `id === slugify(name)`. Location names are
// editable after creation, so a location's stored id can drift away from
// what slugifying its *current* name would produce (e.g. created as
// "Stonebridge" -> id "stonebridge", then renamed to "New Stonebridge Docks"
// without its id ever changing). Selecting such a location as a parent
// re-derives an id from the new name instead of reading the location's
// actual id.

describe('BasicInfoSection - parentId resolution via combobox selection (Task 2 probe)', () => {
  afterEach(() => {
    (useLocations as jest.Mock).mockReturnValue({ locations: [] });
  });

  test('parentId set by selecting a renamed location should resolve to that location\'s actual id', () => {
    // This location was created when its name was "Stonebridge" (its id was
    // derived from that original name at creation time), then later renamed.
    // Its id was never updated - ids are stable, names are editable.
    const renamedLocation = {
      id: 'stonebridge',
      name: 'New Stonebridge Docks',
    };
    (useLocations as jest.Mock).mockReturnValue({ locations: [renamedLocation] });

    const handleInputChange = jest.fn();
    render(<BasicInfoSection formData={makeFormData()} handleInputChange={handleInputChange} />);

    // Open the parent-location combobox and select the renamed location by
    // its current display name - the only thing LocationCombobox exposes.
    const comboboxInput = screen.getByPlaceholderText('Select parent location...');
    fireEvent.focus(comboboxInput);
    fireEvent.click(screen.getByText('New Stonebridge Docks'));

    const parentIdCall = handleInputChange.mock.calls.find(call => call[0] === 'parentId');
    expect(parentIdCall).toBeDefined();
    const resolvedParentId = parentIdCall![1];

    // PROVEN, UNFILED DEFECT - see Task 2 of the domain-data-types batch.
    // Do NOT "fix" this by editing the test: fixing it means changing what
    // LocationCombobox emits (a name) to instead emit an id, and
    // LocationCombobox is also consumed by QuestFormSections, so that
    // contract change is a design decision for the orchestrator, not this
    // test. This assertion is expected to fail: generateLocationId('New
    // Stonebridge Docks') derives 'new-stonebridge-docks', which does not
    // match the location's real id 'stonebridge', so parentId resolves to no
    // location at all.
    const resolvesToRealLocation = [renamedLocation].some(loc => loc.id === resolvedParentId);
    expect(resolvesToRealLocation).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FeaturesSection Tests
// ---------------------------------------------------------------------------

describe('FeaturesSection', () => {
  const handleInputChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render "Notable Features" heading', () => {
    render(<FeaturesSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Notable Features')).toBeInTheDocument();
  });

  test('should render existing features', () => {
    render(
      <FeaturesSection
        formData={makeFormData({ features: ['Ancient walls', 'Market square'] })}
        handleInputChange={handleInputChange}
      />
    );
    expect(screen.getByDisplayValue('Ancient walls')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Market square')).toBeInTheDocument();
  });

  test('should call handleInputChange with new feature when + button is clicked', () => {
    render(<FeaturesSection formData={makeFormData({ features: [] })} handleInputChange={handleInputChange} />);
    // The + button (PlusCircle icon button)
    const addButton = screen.getAllByRole('button')[0];
    fireEvent.click(addButton);
    expect(handleInputChange).toHaveBeenCalledWith('features', ['']);
  });

  test('should call handleInputChange when feature text changes', () => {
    render(
      <FeaturesSection
        formData={makeFormData({ features: ['Old text'] })}
        handleInputChange={handleInputChange}
      />
    );
    const featureInput = screen.getByDisplayValue('Old text');
    fireEvent.change(featureInput, { target: { value: 'New text' } });
    expect(handleInputChange).toHaveBeenCalledWith('features', ['New text']);
  });

  test('should call handleInputChange removing feature when X button is clicked', () => {
    render(
      <FeaturesSection
        formData={makeFormData({ features: ['Feature to remove'] })}
        handleInputChange={handleInputChange}
      />
    );
    // X button is the last button (remove button for the feature)
    const buttons = screen.getAllByRole('button');
    const removeButton = buttons[buttons.length - 1];
    fireEvent.click(removeButton);
    expect(handleInputChange).toHaveBeenCalledWith('features', []);
  });
});

// ---------------------------------------------------------------------------
// TagsSection Tests
// ---------------------------------------------------------------------------

describe('TagsSection', () => {
  const handleInputChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render "Tags" heading', () => {
    render(<TagsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  test('should render existing tags', () => {
    render(
      <TagsSection
        formData={makeFormData({ tags: ['trade-hub', 'safe'] })}
        handleInputChange={handleInputChange}
      />
    );
    expect(screen.getByText('trade-hub')).toBeInTheDocument();
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  test('should disable Add button when tag input is empty', () => {
    render(<TagsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });

  test('should enable Add button when tag input has content', async () => {
    render(<TagsSection formData={makeFormData()} handleInputChange={handleInputChange} />);
    const tagInput = screen.getByPlaceholderText('Enter tag...');
    await userEvent.type(tagInput, 'new-tag');
    expect(screen.getByRole('button', { name: /^add$/i })).not.toBeDisabled();
  });

  test('should call handleInputChange with new tag when Add is clicked', async () => {
    render(
      <TagsSection
        formData={makeFormData({ tags: ['existing'] })}
        handleInputChange={handleInputChange}
      />
    );
    const tagInput = screen.getByPlaceholderText('Enter tag...');
    await userEvent.type(tagInput, 'new-tag');
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(handleInputChange).toHaveBeenCalledWith('tags', ['existing', 'new-tag']);
  });

  test('should call handleInputChange removing tag when X is clicked', () => {
    render(
      <TagsSection
        formData={makeFormData({ tags: ['to-remove'] })}
        handleInputChange={handleInputChange}
      />
    );
    const tagContainer = screen.getByText('to-remove').closest('div');
    const xButton = tagContainer?.querySelector('button');
    expect(xButton).toBeDefined();
    fireEvent.click(xButton!);
    expect(handleInputChange).toHaveBeenCalledWith('tags', []);
  });
});

// ---------------------------------------------------------------------------
// RelatedQuestsSection Tests
// ---------------------------------------------------------------------------

describe('RelatedQuestsSection', () => {
  const handleInputChange = jest.fn();
  const setSelectedQuests = jest.fn();
  const setIsQuestDialogOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setupQuestsMock([
      { id: 'q-1', title: 'Quest Alpha', status: 'active' },
      { id: 'q-2', title: 'Quest Beta', status: 'active' },
    ]);
  });

  test('should render "Select Related Quests" button', () => {
    render(
      <RelatedQuestsSection
        formData={makeFormData()}
        handleInputChange={handleInputChange}
        selectedQuests={new Set()}
        setSelectedQuests={setSelectedQuests}
        isQuestDialogOpen={false}
        setIsQuestDialogOpen={setIsQuestDialogOpen}
      />
    );
    expect(screen.getByRole('button', { name: /select related quests/i })).toBeInTheDocument();
  });

  test('should call setIsQuestDialogOpen(true) when "Select Related Quests" is clicked', () => {
    render(
      <RelatedQuestsSection
        formData={makeFormData()}
        handleInputChange={handleInputChange}
        selectedQuests={new Set()}
        setSelectedQuests={setSelectedQuests}
        isQuestDialogOpen={false}
        setIsQuestDialogOpen={setIsQuestDialogOpen}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select related quests/i }));
    expect(setIsQuestDialogOpen).toHaveBeenCalledWith(true);
  });

  test('should render selected quest as a tag', () => {
    setupQuestsMock([{ id: 'q-1', title: 'Quest Alpha', status: 'active' }]);
    render(
      <RelatedQuestsSection
        formData={makeFormData()}
        handleInputChange={handleInputChange}
        selectedQuests={new Set(['q-1'])}
        setSelectedQuests={setSelectedQuests}
        isQuestDialogOpen={false}
        setIsQuestDialogOpen={setIsQuestDialogOpen}
      />
    );
    expect(screen.getByText('Quest Alpha')).toBeInTheDocument();
  });

  test('should call setSelectedQuests when X is clicked on a selected quest', () => {
    setupQuestsMock([{ id: 'q-1', title: 'Quest Alpha', status: 'active' }]);
    render(
      <RelatedQuestsSection
        formData={makeFormData()}
        handleInputChange={handleInputChange}
        selectedQuests={new Set(['q-1'])}
        setSelectedQuests={setSelectedQuests}
        isQuestDialogOpen={false}
        setIsQuestDialogOpen={setIsQuestDialogOpen}
      />
    );
    const tagContainer = screen.getByText('Quest Alpha').closest('div');
    const xButton = tagContainer?.querySelector('button');
    fireEvent.click(xButton!);
    expect(setSelectedQuests).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// RelatedNPCsSection Tests
// ---------------------------------------------------------------------------

describe('RelatedNPCsSection', () => {
  const handleInputChange = jest.fn();
  const setSelectedNPCs = jest.fn();
  const setIsNPCDialogOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render "Select Connected NPCs" button', () => {
    render(
      <RelatedNPCsSection
        formData={makeFormData()}
        handleInputChange={handleInputChange}
        npcs={[makeNPC('n-1', 'Aldric')]}
        selectedNPCs={new Set()}
        setSelectedNPCs={setSelectedNPCs}
        isNPCDialogOpen={false}
        setIsNPCDialogOpen={setIsNPCDialogOpen}
      />
    );
    expect(screen.getByRole('button', { name: /select connected npcs/i })).toBeInTheDocument();
  });

  test('should call setIsNPCDialogOpen(true) when button is clicked', () => {
    render(
      <RelatedNPCsSection
        formData={makeFormData()}
        handleInputChange={handleInputChange}
        npcs={[makeNPC('n-1', 'Aldric')]}
        selectedNPCs={new Set()}
        setSelectedNPCs={setSelectedNPCs}
        isNPCDialogOpen={false}
        setIsNPCDialogOpen={setIsNPCDialogOpen}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select connected npcs/i }));
    expect(setIsNPCDialogOpen).toHaveBeenCalledWith(true);
  });

  test('should render selected NPC as a tag', () => {
    const npcs = [makeNPC('n-1', 'Aldric')];
    render(
      <RelatedNPCsSection
        formData={makeFormData()}
        handleInputChange={handleInputChange}
        npcs={npcs}
        selectedNPCs={new Set(['n-1'])}
        setSelectedNPCs={setSelectedNPCs}
        isNPCDialogOpen={false}
        setIsNPCDialogOpen={setIsNPCDialogOpen}
      />
    );
    expect(screen.getByText('Aldric')).toBeInTheDocument();
  });

  test('should call setSelectedNPCs when X is clicked on a selected NPC', () => {
    const npcs = [makeNPC('n-1', 'Aldric')];
    render(
      <RelatedNPCsSection
        formData={makeFormData()}
        handleInputChange={handleInputChange}
        npcs={npcs}
        selectedNPCs={new Set(['n-1'])}
        setSelectedNPCs={setSelectedNPCs}
        isNPCDialogOpen={false}
        setIsNPCDialogOpen={setIsNPCDialogOpen}
      />
    );
    const tagContainer = screen.getByText('Aldric').closest('div');
    const xButton = tagContainer?.querySelector('button');
    fireEvent.click(xButton!);
    expect(setSelectedNPCs).toHaveBeenCalled();
  });
});
