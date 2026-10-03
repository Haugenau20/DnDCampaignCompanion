const React = require('/workspace/DnDCampaignCompanion/node_modules/react');
const { render, screen, fireEvent, waitFor } = require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/react');
require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/jest-dom');
const mockDetection = { id: 'entity-1', type: 'npc', text: 'Droop', confidence: .9, isConverted: false };
let mockNote = { id: 'note-1', content: 'x'.repeat(10001), extractedEntities: [mockDetection] };
const mockUpdateNote = jest.fn(async (_id, updates) => { mockNote = { ...mockNote, ...updates }; });
const mockServiceExtract = jest.fn();
const mockGetNoteById = () => mockNote;
const mockReferences = [];

jest.mock('features/collaboration/notes/context/NoteContext', () => ({ useNotes: () => ({ getNoteById: mockGetNoteById, updateNote: mockUpdateNote, convertEntity: jest.fn() }) }));
jest.mock('features/collaboration/notes/components/NoteReferences', () => ({ useNoteReferences: () => ({ references: mockReferences, isLoading: false }), normalizeTextForComparison: (text) => text.toLowerCase() }));
jest.mock('shared/hooks/useNavigation', () => ({ useNavigation: () => ({ navigateToPage: jest.fn() }) }));
jest.mock('features/campaign-entities', () => ({ useNPCs: () => ({ npcs: [] }), useLocations: () => ({ locations: [] }), useQuests: () => ({ quests: [] }), useRumors: () => ({ rumors: [] }) }));
jest.mock('features/collaboration/entity-extraction/services/EntityExtractionService', () => ({
  __esModule: true,
  default: { getInstance: () => ({ extractEntities: mockServiceExtract }) },
  UsageLimitExceededError: class UsageLimitExceededError extends Error {},
}));
jest.mock('features/collaboration/entity-extraction/context/UsageContext', () => ({ useUsageContext: () => ({
  isUsageLimitExceeded: false,
  isExtractionAvailable: () => true,
  updateUsageStatus: jest.fn(),
  setUsageLimitExceededWithInfo: jest.fn(),
}) }));

test('local extraction validation erases saved detections and claims an empty scan despite failure', async () => {
  const CampaignLinksPanel = require('/workspace/DnDCampaignCompanion/src/features/collaboration/notes/components/CampaignLinksPanel').default;
  render(React.createElement(CampaignLinksPanel, { noteId: 'note-1' }));
  await screen.findByText('Droop');
  fireEvent.click(screen.getByRole('button', { name: 'Scan note' }));
  await screen.findByText('Content is too long (maximum 10,000 characters)');
  expect(screen.getByText('No new names found in this note.')).toBeInTheDocument();
  expect(mockUpdateNote).toHaveBeenCalledTimes(2);
  expect(mockNote.extractedEntities).toEqual([]);
  expect(screen.queryByText('Droop')).not.toBeInTheDocument();
  expect(mockServiceExtract).not.toHaveBeenCalled();
});
