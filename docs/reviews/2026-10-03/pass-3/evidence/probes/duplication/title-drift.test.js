// Review-only current-behavior diagnostics: actual view/helpers, synthetic records.
const React = require('/workspace/DnDCampaignCompanion/node_modules/react');
const {render, screen, fireEvent, cleanup, act} = require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/react');
const {rumorTitleText} = require('/workspace/DnDCampaignCompanion/src/features/campaign-entities/rumors/utils/rumor-title.ts');
const {displayTitle} = require('/workspace/DnDCampaignCompanion/src/features/collaboration/notes/utils/note-title.ts');
const mockEmpty = [];
let mockNotes = [];
jest.mock('shared/context/QuickAddContext', () => ({useQuickAdd: () => ({openQuickAdd: jest.fn()})}));
jest.mock('features/storytelling', () => ({useStory: () => ({chapters: mockEmpty})}));
jest.mock('features/campaign-entities', () => ({
  useNPCs: () => ({npcs: mockEmpty}), useQuests: () => ({quests: mockEmpty}),
  useRumors: () => ({rumors: mockEmpty}), useLocations: () => ({locations: mockEmpty}),
  rumorTitleText: jest.requireActual('/workspace/DnDCampaignCompanion/src/features/campaign-entities/rumors/utils/rumor-title.ts').rumorTitleText,
}));
jest.mock('features/collaboration', () => ({useNotes: () => ({notes: mockNotes})}));
const {default: AttachTray} = require('/workspace/DnDCampaignCompanion/src/shared/components/attach-tray/AttachTray.tsx');
const {SearchProvider, useSearch} = require('/workspace/DnDCampaignCompanion/src/shared/context/SearchContext.tsx');
let mockSearch;
function SearchConsumer() { mockSearch = useSearch(); return null; }
afterEach(() => {cleanup(); mockNotes = [];});

test('DUP-001: ordinary unnamed rumors lose their names and cannot be filtered by directory title in actual AttachTray', () => {
  const rumors = [
    {id:'r1', title:'', content:'Traders saw a dragon near the bridge', status:'unconfirmed'},
    {id:'r2', title:'', content:'Caravans avoid the western road', status:'unconfirmed'},
  ];
  expect(rumorTitleText(rumors[0])).toBe('Traders saw a dragon near the bridge');
  render(React.createElement(AttachTray, {
    kinds:['rumor'], sources:{rumor:rumors}, attachedIds:[], onAttach:jest.fn(), onDetach:jest.fn(),
  }));
  fireEvent.click(screen.getByRole('button', {name:'Attach'}));
  const labels = screen.getAllByRole('option').map(o=>o.textContent);
  expect(screen.getAllByRole('option').map(o=>o.querySelector('.font-heading').textContent)).toEqual(['','']);
  expect(labels.every(label=>!label.includes('Traders') && !label.includes('Caravans'))).toBe(true);
  fireEvent.change(screen.getByRole('textbox', {name:'Filter the list'}), {target:{value:'Traders'}});
  expect(screen.queryAllByRole('option')).toHaveLength(0);
  console.log(JSON.stringify({probe:'DUP-001-rumor-attach', expectedName:rumorTitleText(rumors[0]), actualOptionText:labels, filteredMatchCount:0}));
});

test('DUP-001: actual global search returns blank or legacy note labels for content-derived titles', async () => {
  mockNotes = [
    {id:'n1', title:'', content:'Dragon under the bridge', extractedEntities:[]},
    {id:'n2', title:'New Note', content:'Dragon behind the tower', extractedEntities:[]},
    {id:'n3', title:'Explicit name', content:'Dragon above the river', extractedEntities:[]},
  ];
  render(React.createElement(SearchProvider, null, React.createElement(SearchConsumer)));
  await act(async()=>{await mockSearch.handleSearch('Dragon');});
  const labels=Object.fromEntries(mockSearch.results.map(r=>[r.id,r.title]));
  expect(labels).toEqual({n1:'', n2:'New Note', n3:'Explicit name'});
  expect(mockNotes.map(displayTitle)).toEqual(['Dragon under the bridge','Dragon behind the tower','Explicit name']);
  console.log(JSON.stringify({probe:'DUP-001-note-search', directoryLabels:mockNotes.map(displayTitle), globalResultLabels:labels}));
});
