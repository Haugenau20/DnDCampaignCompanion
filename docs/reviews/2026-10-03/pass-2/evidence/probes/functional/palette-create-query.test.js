const React = require('/workspace/DnDCampaignCompanion/node_modules/react');
const { render, screen, fireEvent } = require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/react');
require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/jest-dom');
const mockOpenQuickAdd = jest.fn();
jest.mock('shared/hooks/useSearch', () => ({ useSearch: () => ({ query: 'Droop', results: [], isSearching: false, isQueryTooShort: false, isIndexReady: true, onSearch: jest.fn(), onClearSearch: jest.fn() }) }));
jest.mock('shared/context/NavigationContext', () => ({ useNavigation: () => ({ navigateToPage: jest.fn(), createPath: jest.fn() }) }));
jest.mock('shared/context/QuickAddContext', () => ({ useQuickAdd: () => ({ openQuickAdd: mockOpenQuickAdd }) }));
jest.mock('features/collaboration', () => ({ useCreateNote: () => ({ createAndOpen: jest.fn() }) }));
jest.mock('features/campaign-entities', () => ({ useCreateRumor: () => ({ createAndOpen: jest.fn() }) }));
jest.mock('features/user-management', () => ({ useCampaigns: () => ({ activeCampaign: { name: 'Synthetic campaign' } }) }));

test('current palette named-create action calls actual creation hook without the typed name', () => {
  const CommandPalette = require('/workspace/DnDCampaignCompanion/src/shared/components/command-palette/CommandPalette').default;
  render(React.createElement(CommandPalette, { isOpen: true, onClose: jest.fn(), triggerRef: { current: null } }));
  fireEvent.click(screen.getByText('New NPC named "Droop"'));
  expect(mockOpenQuickAdd).toHaveBeenCalledWith('npc');
  expect(mockOpenQuickAdd.mock.calls[0][1]).toBeUndefined();
});
