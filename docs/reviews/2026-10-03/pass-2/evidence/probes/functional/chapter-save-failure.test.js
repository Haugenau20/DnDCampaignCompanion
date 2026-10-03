const React = require('/workspace/DnDCampaignCompanion/node_modules/react');
const { render, screen, fireEvent, waitFor } = require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/react');
require('/workspace/DnDCampaignCompanion/node_modules/@testing-library/jest-dom');
const mockNavigateToPage = jest.fn();
const mockCreateChapter = jest.fn(async () => { throw new Error('Synthetic write refused'); });
const mockUpdateChapter = jest.fn(async () => { throw new Error('Synthetic write refused'); });
jest.mock('shared/context/NavigationContext', () => ({ useNavigation: () => ({ navigateToPage: mockNavigateToPage }) }));
jest.mock('features/storytelling/chapters/context/StoryContext', () => ({ useStory: () => ({ chapters: [], createChapter: mockCreateChapter, updateChapter: mockUpdateChapter }) }));

test.each(['create', 'edit'])('current chapter %s form navigates away when save rejects', async (mode) => {
  const ChapterForm = require('/workspace/DnDCampaignCompanion/src/features/storytelling/chapters/components/ChapterForm').default;
  render(React.createElement(ChapterForm, { mode, chapter: mode === 'edit' ? { id: 'chapter-a', title: 'Old title', content: 'Old content', order: 1 } : undefined }));
  fireEvent.change(screen.getByLabelText('Chapter Title'), { target: { value: 'Unsaved title' } });
  fireEvent.change(screen.getByLabelText('Chapter Content'), { target: { value: 'My paragraph should remain for retry.' } });
  fireEvent.click(screen.getByRole('button', { name: mode === 'create' ? 'Create Chapter' : 'Save Changes' }));
  await waitFor(() => expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters'));
  expect(mode === 'create' ? mockCreateChapter : mockUpdateChapter).toHaveBeenCalled();
});
