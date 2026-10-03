const React = require('/workspace/DnDCampaignCompanion/node_modules/react');
const {render, act, cleanup} = require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/react');
const mockEmpty = [];
let mockNPCs = [];
jest.mock('features/storytelling', () => ({useStory: () => ({chapters: mockEmpty})}));
jest.mock('features/campaign-entities', () => ({
  useNPCs: () => ({npcs: mockNPCs}),
  useQuests: () => ({quests: mockEmpty}),
  useRumors: () => ({rumors: mockEmpty}),
  useLocations: () => ({locations: mockEmpty}),
  rumorTitleText: () => '',
}));
jest.mock('features/collaboration', () => ({useNotes: () => ({notes: mockEmpty})}));
const {SearchProvider, useSearch: useSearchContext} = require('/workspace/DnDCampaignCompanion/src/shared/context/SearchContext.tsx');
const {useSearch} = require('/workspace/DnDCampaignCompanion/src/shared/hooks/useSearch.ts');
let mockCurrent;
function Consumer() {
  mockCurrent = {...useSearch({active: true}), context: useSearchContext()};
  return null;
}
function tree() {return React.createElement(SearchProvider, null, React.createElement(Consumer));}
beforeEach(() => {mockNPCs = []; jest.useFakeTimers();});
afterEach(() => {cleanup(); jest.useRealTimers();});

test('REACT lead: a settled empty campaign never makes the actual search index ready', async () => {
  render(tree());
  await act(async () => {jest.advanceTimersByTime(5000);});
  expect(mockCurrent.isIndexReady).toBe(false);
  console.log(JSON.stringify({probe: 'empty-search-index', afterAllEmptyCollections: 'not ready'}));
});

test('REACT lead: removing all records retains the prior index and returns deleted/old campaign data on a new query', async () => {
  mockNPCs = [{id: 'alice', name: 'Alice', description: 'From the previous campaign'}];
  const view = render(tree());
  expect(mockCurrent.isIndexReady).toBe(true);
  mockNPCs = [];
  view.rerender(tree());
  await act(async () => {await mockCurrent.context.handleSearch('Alice');});
  expect(mockCurrent.results).toHaveLength(1);
  expect(mockCurrent.results[0].id).toBe('alice');
  console.log(JSON.stringify({probe: 'search-transition-to-zero', currentDocuments: 0, staleResultIds: mockCurrent.results.map(result => result.id)}));
});

test('REACT lead: search issued before collection arrival remains empty after the index becomes ready', async () => {
  const view = render(tree());
  await act(async () => {mockCurrent.onSearch('Alice');});
  await act(async () => {jest.advanceTimersByTime(180);});
  expect(mockCurrent.results).toHaveLength(0);
  mockNPCs = [{id: 'alice', name: 'Alice', description: 'Loaded after the query'}];
  view.rerender(tree());
  await act(async () => {jest.advanceTimersByTime(5000);});
  expect(mockCurrent.isIndexReady).toBe(true);
  expect(mockCurrent.query).toBe('Alice');
  expect(mockCurrent.results).toHaveLength(0);
  await act(async () => {await mockCurrent.context.handleSearch('Alice');});
  expect(mockCurrent.results).toHaveLength(1);
  console.log(JSON.stringify({probe: 'query-before-search-index', afterDataArrivalResults: 0, afterExplicitRepeatResults: 1}));
});
