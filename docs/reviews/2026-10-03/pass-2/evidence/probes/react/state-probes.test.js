const React = require('/workspace/DnDCampaignCompanion/node_modules/react');
const { render, screen, fireEvent, act, cleanup } = require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/react');
const { MemoryRouter, Routes, Route, useNavigate } = require('/workspace/DnDCampaignCompanion/node_modules/react-router-dom');

const mockNPCs = [
  {id: 'a', name: 'Alice', description: 'Original Alice description', status: 'alive', relationship: 'friendly', connections: {relatedNPCs: ['b'], relatedQuests: [], affiliations: []}, notes: [], tags: []},
  {id: 'b', name: 'Bob', description: 'Original Bob description', status: 'alive', relationship: 'friendly', connections: {relatedNPCs: ['a'], relatedQuests: [], affiliations: []}, notes: [], tags: []},
];
const mockUpdateDocument = jest.fn();
const mockRefreshNPCs = jest.fn(async () => mockNPCs);
const mockFirestore = {
  getCollection: jest.fn(async () => []),
  subscribeToCollection: jest.fn(() => () => {}),
  createDocument: jest.fn(),
  updateDocumentWithAttribution: mockUpdateDocument,
  deleteDocument: jest.fn(),
};
const mockGroups = [{id: 'g', name: 'Group'}];
const mockCampaigns = [{id: 'c', name: 'Campaign'}];
jest.mock('features/user-management', () => ({
  AUTH_STATE_CHANGED_EVENT: 'synthetic-context-change',
  useAuth: () => ({user: {uid: 'u'}, loading: false}),
  useGroups: () => ({activeGroupId: 'g', groups: mockGroups, setActiveGroup: jest.fn()}),
  useCampaigns: () => ({activeCampaignId: 'c', activeCampaign: mockCampaigns[0], campaigns: mockCampaigns, setActiveCampaign: jest.fn()}),
  useUser: () => ({userProfile: {uid: 'u'}, activeGroupUserProfile: {username: 'tester', characters: []}}),
  useFirestore: () => mockFirestore,
  signInPathFor: () => '/signin',
}));
jest.mock('shared/hooks/useCampaignContextStatus', () => ({
  useCampaignContextStatus: () => ({isResolving: false, hasRequiredContext: true, missingContext: null}),
}));
jest.mock('features/campaign-entities/npcs/hooks/useNPCData', () => ({
  useNPCData: () => ({npcs: mockNPCs, loading: false, error: null, refreshNPCs: mockRefreshNPCs, hasRequiredContext: true}),
}));
jest.mock('features/campaign-entities', () => ({
  useNPCs: (...args) => jest.requireActual('features/campaign-entities/npcs/context/NPCContext').useNPCs(...args),
  useQuests: () => ({quests: [], getQuestById: () => undefined}),
  useRumors: () => ({rumors: [], updateRumor: jest.fn()}),
  useLocations: () => ({locations: []}),
  resolveLocationName: () => undefined,
  rumorTitleText: () => '',
}));
jest.mock('core/services/firebase', () => ({__esModule: true, default: {campaign: {getCampaigns: jest.fn()}, document: {batchOperations: jest.fn()}}}));
jest.mock('shared/components/AttributionInfo', () => ({__esModule: true, default: () => null}));
jest.mock('shared/hooks/useImageAttachment', () => ({useImageAttachment: () => ({upload: jest.fn(), remove: jest.fn()}), discardImage: jest.fn()}));
jest.mock('shared/components/attach-tray/AttachTray', () => ({__esModule: true, default: () => null}));
jest.mock('shared/context/NavigationContext', () => ({
  useNavigation: () => ({navigateToPage: require('/workspace/DnDCampaignCompanion/node_modules/react-router-dom').useNavigate()}),
}));

const mockNotes = [{id: 'note-1', title: 'Original title', content: 'Original content', extractedEntities: [], status: 'active', tags: [], updatedAt: '2026-01-01T00:00:00Z', dateModified: '2026-01-01T00:00:00Z', campaignId: 'c', isUnsaved: false}];
const mockUpdateNote = jest.fn(async () => {});
const mockSaveNote = jest.fn(async () => {});
const mockGetNoteById = jest.fn(id => mockNotes.find(note => note.id === id));
jest.mock('features/collaboration/notes/context/NoteContext', () => ({
  useNotes: () => ({getNoteById: mockGetNoteById, updateNote: mockUpdateNote, saveNote: mockSaveNote}),
}));
jest.mock('core/components/Markdown', () => ({__esModule: true, default: ({content, children}) => require('/workspace/DnDCampaignCompanion/node_modules/react').createElement('span', null, content || children)}));

const NPCDetailPage = require('/workspace/DnDCampaignCompanion/src/pages/npcs/NPCDetailPage.tsx').default;
const { NPCProvider } = require('/workspace/DnDCampaignCompanion/src/features/campaign-entities/npcs/context/NPCContext.tsx');
const NoteEditor = require('/workspace/DnDCampaignCompanion/src/features/collaboration/notes/components/NoteEditor.tsx').default;
const ChapterReader = require('/workspace/DnDCampaignCompanion/src/features/storytelling/stories/components/ChapterReader.tsx').default;

function NavControl() {
  const navigate = useNavigate();
  return React.createElement('button', {onClick: () => navigate('/npcs/b')}, 'Navigate to Bob');
}
function renderNPC() {
  return render(React.createElement(MemoryRouter, {initialEntries: ['/npcs/a']},
    React.createElement(NPCProvider, null,
      React.createElement(NavControl),
      React.createElement(Routes, null, React.createElement(Route, {path: '/npcs/:npcId', element: React.createElement(NPCDetailPage)})))));
}
afterEach(() => {cleanup(); jest.useRealTimers(); jest.restoreAllMocks();});
beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateDocument.mockResolvedValue(undefined);
  mockUpdateNote.mockResolvedValue(undefined);
  mockSaveNote.mockResolvedValue(undefined);
});

test('REACT lead: actual reused NPC detail editor submits Alice draft to Bob', async () => {
  renderNPC();
  fireEvent.click(screen.getByRole('button', {name: 'Edit description'}));
  const field = screen.getByRole('textbox', {name: 'Description'});
  fireEvent.change(field, {target: {value: 'Draft belonging only to Alice'}});
  fireEvent.click(screen.getByRole('button', {name: 'Navigate to Bob'}));
  expect(screen.getByRole('textbox', {name: 'Description'}).value).toBe('Draft belonging only to Alice');
  await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Save description'}));});
  expect(mockUpdateDocument).toHaveBeenCalledWith('npcs', 'b', expect.objectContaining({name: 'Bob', description: 'Draft belonging only to Alice'}));
  console.log(JSON.stringify({probe: 'npc-route-draft-target', write: mockUpdateDocument.mock.calls[0]}));
});

test('REACT lead: actual write error replaces ready page, destroys draft and Retry cannot clear writeError', async () => {
  mockUpdateDocument.mockRejectedValue(new Error('Synthetic write rejected'));
  renderNPC();
  fireEvent.click(screen.getByRole('button', {name: 'Edit description'}));
  fireEvent.change(screen.getByRole('textbox', {name: 'Description'}), {target: {value: 'Unrecoverable unsaved prose'}});
  await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Save description'}));});
  expect(screen.queryByRole('textbox', {name: 'Description'})).toBeNull();
  expect(screen.getByText('Synthetic write rejected')).toBeTruthy();
  await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Try again'}));});
  expect(mockRefreshNPCs).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('textbox', {name: 'Description'})).toBeNull();
  expect(screen.getByText('Synthetic write rejected')).toBeTruthy();
  console.log(JSON.stringify({probe: 'write-error-gate', editorUnmounted: true, readRetryInvoked: true, errorStillBlocksPage: true}));
});

test('REACT lead: typed note content disappears on All notes navigation before debounce', async () => {
  jest.useFakeTimers();
  function Surface() {
    const [open, setOpen] = React.useState(true);
    return open ? React.createElement(NoteEditor, {noteId: 'note-1', onBack: () => setOpen(false)}) : React.createElement('p', null, 'Notes list');
  }
  render(React.createElement(Surface));
  fireEvent.change(screen.getByRole('textbox', {name: 'Note content'}), {target: {value: 'New text lost before 2 seconds'}});
  fireEvent.click(screen.getByRole('button', {name: 'All notes'}));
  await act(async () => {jest.advanceTimersByTime(35000);});
  expect(mockUpdateNote).not.toHaveBeenCalled();
  expect(mockSaveNote).not.toHaveBeenCalled();
  render(React.createElement(NoteEditor, {noteId: 'note-1'}));
  expect(screen.getByRole('textbox', {name: 'Note content'}).value).toBe('Original content');
  console.log(JSON.stringify({probe: 'note-unmount-before-debounce', writes: 0, reopenedContent: screen.getByRole('textbox', {name: 'Note content'}).value}));
});

test('REACT lead: note autosave rejection logs only and does not surface reason', async () => {
  jest.useFakeTimers();
  const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockUpdateNote.mockRejectedValue(new Error('Synthetic note save refused'));
  render(React.createElement(NoteEditor, {noteId: 'note-1'}));
  fireEvent.change(screen.getByRole('textbox', {name: 'Note content'}), {target: {value: 'Text awaiting persistence'}});
  await act(async () => {jest.advanceTimersByTime(2000);});
  expect(mockUpdateNote).toHaveBeenCalledTimes(1);
  expect(logged).toHaveBeenCalled();
  expect(screen.queryByText('Synthetic note save refused')).toBeNull();
  expect(screen.getByText('Unsaved changes')).toBeTruthy();
  console.log(JSON.stringify({probe: 'note-autosave-error', rejectionLogged: true, visibleFailureReason: false}));
});

test('REACT lead: equal-content chapter switch neither restores B nor marks B complete', async () => {
  let scrollY = 0;
  Object.defineProperty(window, 'innerHeight', {configurable: true, value: 1000});
  Object.defineProperty(window, 'scrollY', {configurable: true, get: () => scrollY});
  const scrollTo = jest.fn(options => {scrollY = options.top;});
  window.scrollTo = scrollTo;
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const top = this.dataset.testid === 'chapter-reader-prose' ? -scrollY : 0;
    const height = this.dataset.testid === 'chapter-reader-prose' ? 500 : 0;
    return {top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({})};
  });
  const reportA = jest.fn();
  const reportB = jest.fn();
  const common = {content: 'Identical copied chapter body', chapterCount: 2};
  const view = render(React.createElement(ChapterReader, {...common, title: 'Chapter A', chapterNumber: 1, position: 0, onProgressChange: reportA}));
  expect(reportA).toHaveBeenCalledWith(100, true);
  view.rerender(React.createElement(ChapterReader, {...common, title: 'Chapter B', chapterNumber: 2, position: 0, onProgressChange: reportB}));
  expect(reportB).not.toHaveBeenCalled();
  console.log(JSON.stringify({probe: 'chapter-equal-body-identity', firstChapterMarkedComplete: true, secondChapterMarkedComplete: false}));
});
