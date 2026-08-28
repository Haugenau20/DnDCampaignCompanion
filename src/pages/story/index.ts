// pages/story/index.ts
import StoryPage from './StoryPage';
import SagaPage from './SagaPage';
import ChaptersPage from './ChaptersPage';
import ChapterCreatePage from './ChapterCreatePage';
import ChapterEditPage from './ChapterEditPage';
import SagaEditPage from './SagaEditPage';

// Export all story-related pages. `/story` now renders ChaptersPage directly
// (see app/App.tsx), so there is no more dedicated selection page and no
// default export standing in for one.
export {
  StoryPage,
  SagaPage,
  SagaEditPage,
  ChaptersPage,
  ChapterCreatePage,
  ChapterEditPage
};