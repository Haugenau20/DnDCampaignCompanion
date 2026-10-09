// src/features/storytelling/chapters/hooks/useChapterContent.ts
import { useEffect, useState } from 'react';
import firebaseServices from 'core/services/firebase';
import { useCampaignCollectionPath } from 'shared/hooks/useCampaignCollectionPath';
import type { Chapter } from '../types';
import { CHAPTER_BODY_ID, chapterBodyPathOf, ownContentOf } from '../utils/chapter-body';

/**
 * A chapter's text (T134), live: the copy on the chapter while it has one,
 * else its body document. Undefined while the body loads, or with no chapter.
 *
 * @param chapter The chapter being read or edited
 */
export function useChapterContent(chapter: Pick<Chapter, 'id' | 'content'> | undefined): string | undefined {
  const chaptersPath = useCampaignCollectionPath('chapters');
  const own = chapter ? ownContentOf(chapter) : undefined;
  const chapterId = chapter?.id;
  const path = chaptersPath && chapterId ? chapterBodyPathOf(chaptersPath, chapterId) : null;
  const [body, setBody] = useState<{ path: string; content: string } | undefined>(undefined);

  useEffect(() => {
    if (own !== undefined || !path) return undefined;
    return firebaseServices.document.subscribeToCollection<{ id: string; content?: string }>(
      path,
      (documents) => setBody({ path, content: documents.find((doc) => doc.id === CHAPTER_BODY_ID)?.content ?? '' }),
      (error) => console.error('Could not read the chapter:', error)
    );
  }, [own, path]);

  if (own !== undefined) return own;
  // Never another chapter's text -- or another campaign's -- while this one's loads.
  return body && body.path === path ? body.content : undefined;
}
