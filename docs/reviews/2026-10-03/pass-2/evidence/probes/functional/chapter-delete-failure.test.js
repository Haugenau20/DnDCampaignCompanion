const React = require('/workspace/DnDCampaignCompanion/node_modules/react');
const { render, screen, fireEvent, waitFor } = require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/react');
require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/jest-dom');
const mockChapter = { id: 'chapter-a', title: 'A chapter', content: 'Some content', order: 1 };
const mockChapters = [mockChapter];
const mockGetChapterById = () => mockChapter;
const mockDeleteChapter = jest.fn(async () => { throw new Error('Synthetic delete refused'); });
jest.mock('/workspace/DnDCampaignCompanion/node_modules/react-router-dom', () => ({ useParams: () => ({ chapterId: 'chapter-a' }), Navigate: () => null }));
jest.mock('shared/context/NavigationContext', () => ({ useNavigation: () => ({ navigateToPage: jest.fn() }) }));
jest.mock('shared/components/gated', () => ({ usePageGate: () => ({ state: 'ready' }), GatedContent: ({ children }) => children }));
jest.mock('shared/components/page-shell/PageShell', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('shared/components/Breadcrumb', () => ({ __esModule: true, default: () => null }));
jest.mock('core/components/Dialog', () => ({ __esModule: true, default: ({ open, children }) => open ? React.createElement('div', { role: 'dialog' }, children) : null }));
jest.mock('features/storytelling', () => ({
  useStory: () => ({ chapters: mockChapters, getChapterById: mockGetChapterById, isLoading: false, deleteChapter: mockDeleteChapter }),
  ChapterForm: ({ onDeleteClick }) => React.createElement('button', { onClick: onDeleteClick }, 'Open delete'),
}));

test('current chapter delete callback swallows failure, closes dialog and leaves retry disabled', async () => {
  const ChapterEditPage = require('/workspace/DnDCampaignCompanion/src/pages/story/ChapterEditPage').default;
  render(React.createElement(ChapterEditPage));
  fireEvent.click(screen.getByRole('button', { name: 'Open delete' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Chapter' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(mockDeleteChapter).toHaveBeenCalledWith('chapter-a');
  expect(screen.queryByText('Synthetic delete refused')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open delete' }));
  expect(screen.getByRole('button', { name: 'Delete Chapter' })).toBeDisabled();
});
