// src/features/storytelling/index.ts
export { StoryProvider, useStory } from './chapters/context/StoryContext';
export { useChapterData } from './chapters/hooks/useChapterData';
export { useSagaData } from './sagas/hooks/useSagaData';
export type { Chapter, ChapterProgress, StoryProgress, StoryContextState, StoryContextValue } from './chapters/types';
export type { SagaData, SagaContentInput, SagaContextState, SagaContextValue } from './sagas/types';
// Components (used by pages/story/* and other consumers)
// BookViewer is the paginated book surface, now used only by SagaPage — the
// saga is one continuous work, so it keeps the page-turning presentation.
// Chapters read through ChapterReader instead, which scrolls.
export { default as BookViewer } from './stories/components/BookViewer';
export { default as BookshelfView } from './stories/components/BookshelfView';
export { default as ChapterList } from './stories/components/ChapterList';
export { default as ChapterRail } from './stories/components/ChapterRail';
export { default as ChapterReader } from './stories/components/ChapterReader';
export { default as LatestChapter } from './stories/components/LatestChapter';
export { default as ChapterForm } from './chapters/components/ChapterForm';
