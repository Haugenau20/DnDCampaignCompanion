const React = require('/workspace/DnDCampaignCompanion/node_modules/react');
const { render, screen, waitFor } = require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/react');
require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/jest-dom');

const mockNote = { id: 'note-b', title: 'B campaign field notes', content: 'The party met the baker in campaign B.', campaignId: 'campaign-b', extractedEntities: [], updatedAt: '2026-01-01' };
const mockGetNoteById = jest.fn(() => undefined);
const mockGetDocument = jest.fn(async () => mockNote);

jest.mock('/workspace/DnDCampaignCompanion/node_modules/react-router-dom', () => ({ useParams: () => ({ noteId: 'note-b' }) }));
jest.mock('shared/hooks/useNavigation', () => ({ useNavigation: () => ({ navigateToPage: jest.fn() }) }));
jest.mock('features/user-management', () => ({
  useAuth: () => ({ user: { uid: 'synthetic' } }),
  useGroups: () => ({ activeGroupId: 'group-a' }),
  useCampaigns: () => ({ activeCampaignId: 'campaign-a', activeCampaign: { name: 'Campaign A' }, campaigns: [{ id: 'campaign-b', name: 'Campaign B' }] }),
}));
jest.mock('shared/components/gated', () => ({ usePageGate: () => ({ state: 'ready' }), GatedContent: ({ children }) => children }));
jest.mock('shared/components/page-shell/PageShell', () => ({ __esModule: true, default: ({ title, children }) => React.createElement('main', null, React.createElement('h1', null, title), children) }));
jest.mock('core/components/Dialog', () => ({ __esModule: true, default: () => null }));
jest.mock('core/services/firebase/data/DocumentService', () => ({ __esModule: true, default: { getInstance: () => ({ getDocument: mockGetDocument }) } }));
jest.mock('features/collaboration/notes/context/NoteContext', () => ({ useNotes: () => ({ getNoteById: mockGetNoteById, updateNote: jest.fn(), saveNote: jest.fn() }) }));
jest.mock('features/collaboration', () => ({
  useNotes: () => ({ getNoteById: mockGetNoteById, deleteNote: jest.fn(), archiveNote: jest.fn(), isLoading: false }),
  NoteEditor: jest.requireActual('/workspace/DnDCampaignCompanion/src/features/collaboration/notes/components/NoteEditor').default,
  CampaignLinksPanel: () => null,
  UsageMeter: () => null,
}));

test('current source fetches cross-campaign content but renders an empty read-only editor', async () => {
  const NotePage = require('/workspace/DnDCampaignCompanion/src/pages/notes/NotePage').default;
  render(React.createElement(NotePage));
  await screen.findByText('Note from Different Campaign');
  expect(mockGetDocument).toHaveBeenCalledWith('groups/group-a/users/synthetic/notes', 'note-b');
  expect(screen.getByRole('heading', { name: mockNote.title })).toBeInTheDocument();
  expect(screen.getByLabelText('Note title')).toHaveValue('');
  expect(screen.getByLabelText('Note content')).toHaveValue('');
  expect(screen.getByLabelText('Note content')).toBeDisabled();
  expect(screen.getByText(/0 words/)).toBeInTheDocument();
  expect(screen.queryByText(mockNote.content)).not.toBeInTheDocument();
});
