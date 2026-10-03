/* Ordinary synthetic flat model values through actual mapper/context/write normalizers. */
const ROOT = process.env.REVIEW_REPO || '/workspace/DnDCampaignCompanion';
const React = require(ROOT + '/node_modules/react');
const { render, act, cleanup } = require(ROOT + '/node_modules/@testing-library/react');
let mockNote, mockDeliver, observed;
const mockNavigate = jest.fn();
const mockNPCs = [{ id: 'npc-barliman', name: 'Barliman' }];
const mockLocations = [{ id: 'loc-bree', name: 'Bree' }];
const mockAddNPC = jest.fn(async () => 'npc-created');
const mockAddQuest = jest.fn(async () => 'quest-created');
const mockCreateLocation = jest.fn(async () => 'location-created');
const mockAddRumor = jest.fn(async () => 'rumor-created');
const mockDocument = {
  subscribeToCollection: (_path, next) => { mockDeliver = next; next([mockNote]); return () => {}; },
  updateDocumentWithAttribution: jest.fn(async (_path, _id, updates) => { mockNote = { ...mockNote, ...updates }; mockDeliver([mockNote]); }),
};
jest.mock('features/user-management', () => ({ useAuth: () => ({ user: { uid: 'synthetic-reader' } }), useGroups: () => ({ activeGroupId: 'synthetic-group' }), useCampaigns: () => ({ activeCampaignId: 'synthetic-campaign' }), useUser: () => ({ activeGroupUserProfile: {} }) }));
jest.mock('features/campaign-entities', () => ({
  useNPCs: () => ({ npcs: mockNPCs, addNPC: mockAddNPC }),
  useLocations: () => ({ locations: mockLocations, createLocation: mockCreateLocation }),
  useQuests: () => ({ addQuest: mockAddQuest }), useRumors: () => ({ addRumor: mockAddRumor }),
  normaliseObjectives: (...args) => require(ROOT + '/src/features/campaign-entities/quests/utils/quest-objectives').normaliseObjectives(...args),
}));
jest.mock('features/collaboration', () => ({ useNotes: (...args) => require(ROOT + '/src/features/collaboration/notes/context/NoteContext').useNotes(...args) }));
jest.mock('shared/hooks/useCampaignContextStatus', () => ({ useCampaignContextStatus: () => ({ isResolving: false }) }));
jest.mock('core/services/firebase/data/DocumentService', () => ({ __esModule: true, default: { getInstance: () => mockDocument } }));
jest.mock('core/attribution', () => ({ buildCreationAttribution: () => ({}) }));
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('firebase/firestore', () => ({ where: (...args) => args }));
const { NoteProvider, useNotes } = require(ROOT + '/src/features/collaboration/notes/context/NoteContext');
const { useQuickAddCreate } = require(ROOT + '/src/shared/components/quick-add/useQuickAddCreate');
const { splitInitialData } = require(ROOT + '/src/shared/components/quick-add/quickAddSpecs');
const { mapOpenAIEntityToExtractedEntity } = require(ROOT + '/src/features/collaboration/entity-extraction/services/entityMapper');
function Consumer() { observed = { notes: useNotes(), create: useQuickAddCreate() }; return null; }
async function start(flat) {
  mockNote = { id: 'note-1', title: 'Session at Bree', content: 'Synthetic note', campaignId: 'synthetic-campaign', createdAt: '2026-10-03', updatedAt: '2026-10-03', extractedEntities: [mapOpenAIEntityToExtractedEntity(flat)] };
  render(React.createElement(NoteProvider, null, React.createElement(Consumer)));
  await act(async () => {});
  await act(async () => { await observed.notes.convertEntity(mockNote.id, mockNote.extractedEntities[0].id, flat.type); });
  if (flat.type !== 'rumor') {
    const { state } = mockNavigate.mock.calls[0][1];
    const initial = splitInitialData(flat.type, state.initialData);
    await act(async () => { await observed.create(flat.type, { name: initial.initialName, line: initial.initialLine, parentId: initial.parentId }, { carry: initial.carry, noteId: state.noteId, entityId: state.entityId }); });
  }
}
afterEach(() => { cleanup(); jest.clearAllMocks(); });

test('NPC preserves prose, normalizes a place name and marks the source with the actual id', async () => {
  await start({ type: 'npc', text: 'Barliman', confidence: .9, name: 'Barliman', race: null, title: null, occupation: 'Innkeeper', location: ' bree ', relationship: 'friendly', description: 'An innkeeper.', context: 'Barliman welcomed the travelers.' });
  expect(mockAddNPC).toHaveBeenCalledWith(expect.objectContaining({ name: 'Barliman', race: '', title: '', occupation: 'Innkeeper', location: ' bree ', locationId: 'loc-bree', relationship: 'friendly', description: 'An innkeeper.\n\nContext: Barliman welcomed the travelers.' }));
  expect(mockNote.extractedEntities[0]).toEqual(expect.objectContaining({ isConverted: true, convertedToId: 'npc-created' }));
});
test('location prose parent becomes an existing id and context survives', async () => {
  await start({ type: 'location', text: 'Prancing Pony', confidence: .8, name: 'Prancing Pony', locationType: 'building', parentLocation: 'Bree', description: 'The inn.', context: 'We stayed at the Prancing Pony.' });
  expect(mockCreateLocation).toHaveBeenCalledWith(expect.objectContaining({ type: 'building', parentId: 'loc-bree', description: 'The inn.\n\nContext: We stayed at the Prancing Pony.' }));
  expect(mockNote.extractedEntities[0].convertedToId).toBe('location-created');
});
test('quest strings become objectives and related names become existing ids', async () => {
  await start({ type: 'quest', text: 'Find the pony', confidence: .8, title: 'Find the pony', description: null, objectives: [' Ask Barliman ', 'Search Bree'], relatedNPCNames: ['BARLIMAN', 'Nobody in the directory'], locationName: 'Bree' });
  expect(mockAddQuest).toHaveBeenCalledWith(expect.objectContaining({ description: 'Created from note: Session at Bree', relatedNPCIds: ['npc-barliman'], locationId: 'loc-bree', objectives: [ { id: 'objective-0', description: 'Ask Barliman', completed: false }, { id: 'objective-1', description: 'Search Bree', completed: false } ] }));
  expect(mockAddQuest.mock.calls[0][0]).not.toHaveProperty('relatedNPCNames');
  expect(mockNote.extractedEntities[0].convertedToId).toBe('quest-created');
});
test('rumor keeps the speaker distinct from source kind and defaults absent verification', async () => {
  await start({ type: 'rumor', text: 'Road closed', confidence: .8, title: 'Road closed', content: 'The eastern road is closed.', status: null, sourceType: 'npc', sourceName: 'Barliman' });
  expect(mockAddRumor).toHaveBeenCalledWith(expect.objectContaining({ title: 'Road closed', content: 'The eastern road is closed.', status: 'unconfirmed', sourceType: 'npc', sourceName: 'Barliman' }));
  expect(mockNote.extractedEntities[0].convertedToId).toBe('rumor-created');
  expect(mockNavigate).toHaveBeenCalledWith('/rumors?highlight=rumor-created');
});
