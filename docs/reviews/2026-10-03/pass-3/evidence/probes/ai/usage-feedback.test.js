/* Actual provider, hook, panel and meter. IO and unrelated feature data only are mocked. */
const ROOT = process.env.REVIEW_REPO || '/workspace/DnDCampaignCompanion';
const React = require(ROOT + '/node_modules/react');
const { render, screen, fireEvent, act, cleanup } = require(ROOT + '/node_modules/@testing-library/react');
require(ROOT + '/node_modules/@testing-library/jest-dom');
const mockNote = { id: 'note-1', content: 'Barliman serves the travelers at the Prancing Pony in Bree.', extractedEntities: [] };
const mockGetNoteById = () => mockNote;
const mockReferences = [];
let mockServerStatus, mockCachedStatus;
const mockFetch = jest.fn(async () => { mockCachedStatus = structuredCloneSimple(mockServerStatus); return mockCachedStatus; });
const mockExtract = jest.fn();
const mockService = { fetchUsageStatus: mockFetch, extractEntities: mockExtract,
  getCurrentUsage: () => mockCachedStatus, clearUsageCache() { mockCachedStatus = null; } };
const structuredCloneSimple = value => JSON.parse(JSON.stringify(value));
jest.mock('features/user-management', () => ({ useAuth: () => ({ user: { uid: 'synthetic-reader' } }) }));
jest.mock('features/collaboration/notes/context/NoteContext', () => ({ useNotes: () => ({ getNoteById: mockGetNoteById, updateNote: jest.fn(async () => {}), convertEntity: jest.fn() }) }));
jest.mock('features/collaboration/notes/components/NoteReferences', () => ({ useNoteReferences: () => ({ references: mockReferences, isLoading: false }), normalizeTextForComparison: (text) => text.toLowerCase() }));
jest.mock('shared/hooks/useNavigation', () => ({ useNavigation: () => ({ navigateToPage: jest.fn() }) }));
jest.mock('features/campaign-entities', () => ({ useNPCs: () => ({ npcs: [] }), useLocations: () => ({ locations: [] }), useQuests: () => ({ quests: [] }), useRumors: () => ({ rumors: [] }) }));
jest.mock('features/collaboration/entity-extraction/services/EntityExtractionService', () => ({
  __esModule: true, default: { getInstance: () => mockService },
  UsageLimitExceededError: class UsageLimitExceededError extends Error {},
}));
const { UsageProvider } = require(ROOT + '/src/features/collaboration/entity-extraction/context/UsageContext');
const UsageMeter = require(ROOT + '/src/features/collaboration/entity-extraction/components/UsageMeter').default;
const CampaignLinksPanel = require(ROOT + '/src/features/collaboration/notes/components/CampaignLinksPanel').default;
function UI() { return React.createElement(UsageProvider, null,
  React.createElement(CampaignLinksPanel, { noteId: 'note-1' }), React.createElement(UsageMeter)); }
function status(count, exceeded = false, customLimit) {
  const lastReset = '2026-10-03T00:00:00.000Z';
  return { usage: { daily: { count, limit: 10, lastReset }, weekly: { count, limit: 30, lastReset }, monthly: { count, limit: 100, lastReset }, ...(customLimit === undefined ? {} : { customLimit }) },
    limitExceeded: exceeded, ...(exceeded ? { exceededPeriod: 'daily' } : {}),
    nextReset: { daily: '2026-10-04T00:00:00.000Z', weekly: '2026-10-05T00:00:00.000Z', monthly: '2026-11-01T00:00:00.000Z' } };
}
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-03T23:59:00.000Z'));
  mockServerStatus = status(0); mockCachedStatus = null; mockExtract.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); jest.useRealTimers(); });

test('a healthy tab stays gated after its daily allowance naturally resets', async () => {
  mockServerStatus = status(10, true);
  const view = render(React.createElement(UI));
  await act(async () => {});
  expect(screen.getByRole('button', { name: 'Scan note' })).toBeDisabled();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  mockServerStatus = status(0, false);
  await act(async () => { jest.advanceTimersByTime(120000); });
  view.rerender(React.createElement(UI));
  await act(async () => {});
  expect(new Date().toISOString()).toBe('2026-10-04T00:01:00.000Z');
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('usage-row-daily')).toHaveTextContent('10 of 10');
  expect(screen.getByRole('button', { name: 'Scan note' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Scan note' }));
  expect(mockExtract).not.toHaveBeenCalled();
});

test('an ordinary failed model request leaves displayed usage unchanged and unrefreshed', async () => {
  mockServerStatus = status(9);
  mockExtract.mockImplementation(async () => {
    // This increment-before-model-error is independently exercised by response-probe.cjs.
    mockServerStatus = status(10, true);
    throw new Error('Failed to extract entities');
  });
  render(React.createElement(UI));
  await act(async () => {});
  expect(screen.getByTestId('usage-row-daily')).toHaveTextContent('9 of 10');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Scan note' })); });
  expect(screen.getByText('Failed to extract entities')).toBeInTheDocument();
  expect(mockServerStatus.usage.daily.count).toBe(10);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('usage-row-daily')).toHaveTextContent('9 of 10');
  expect(screen.getByRole('button', { name: 'Scan note' })).toBeEnabled();
});

test('a configured zero daily allowance is displayed as ten while scanning is disabled', async () => {
  mockServerStatus = status(0, true, 0);
  render(React.createElement(UI));
  await act(async () => {});
  expect(screen.getByRole('button', { name: 'Scan note' })).toBeDisabled();
  expect(screen.getByTestId('usage-row-daily')).toHaveTextContent('0 of 10');
  expect(screen.getByRole('progressbar', { name: 'Smart detection scans used today' })).toHaveAttribute('aria-valuemax', '10');
});
