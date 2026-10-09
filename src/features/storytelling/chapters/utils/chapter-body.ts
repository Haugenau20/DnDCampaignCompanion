// src/features/storytelling/chapters/utils/chapter-body.ts
import firebaseServices from 'core/services/firebase';
import type { Chapter } from '../types';

/**
 * A chapter's text in a document of its own (T134):
 * `chapters/{id}/body/text`, holding `{ content }`.
 *
 * The text sat on the chapter, so the listener every story page opens
 * downloaded the whole book, and search sent every chapter's text through the
 * index. The chapter keeps its title, place and summary, and `contentLength`
 * for the shelf; the text is read where a chapter is opened.
 *
 * Chapters written before held their text as `content`;
 * `scripts/migrate-records.js` moved it into the body in production, and the
 * app reads only the body now. Saving the text still sets the chapter's
 * `content` to `null`, so text a browser on the app from before T134 left
 * there does not outlive the next save.
 */

/** The body document's id, under the chapter's `body` collection. */
export const CHAPTER_BODY_ID = 'text';

/** Where a chapter's body lives. */
export const chapterBodyPathOf = (chaptersPath: string, chapterId: string): string =>
  `${chaptersPath}/${chapterId}/body`;

/** How long a chapter's text is, without reading it. */
export const contentLengthOf = (chapter: Pick<Chapter, 'contentLength'>): number => chapter.contentLength ?? 0;

/**
 * A chapter's text, read from the server: for something that needs every
 * chapter's text at once, such as the export.
 *
 * @param chaptersPath The campaign's chapters
 * @param chapter The chapter
 * @throws when the body cannot be read
 */
export async function readChapterContent(chaptersPath: string, chapter: Pick<Chapter, 'id'>): Promise<string> {
  const bodies = await firebaseServices.document.getCollectionFromServer<{ content?: string }>(
    chapterBodyPathOf(chaptersPath, chapter.id)
  );
  return bodies.find((body) => body.id === CHAPTER_BODY_ID)?.content ?? '';
}

/**
 * The batch writes that store a chapter's text: its body, and on the chapter
 * its length and an empty `content`.
 *
 * @param chaptersPath The campaign's chapters
 * @param chapterId The chapter
 * @param content The text
 * @returns The body's write, and the fields for the chapter's own write
 */
export function contentWrites(chaptersPath: string, chapterId: string, content: string) {
  return {
    body: {
      type: 'set' as const,
      collection: chapterBodyPathOf(chaptersPath, chapterId),
      id: CHAPTER_BODY_ID,
      data: { content },
    },
    chapterFields: { content: null, contentLength: content.length },
  };
}

/**
 * The batch write that deletes a chapter's body, beside the chapter's own
 * delete: a subcollection outlives its parent.
 */
export const bodyDelete = (chaptersPath: string, chapterId: string) => ({
  type: 'delete' as const,
  collection: chapterBodyPathOf(chaptersPath, chapterId),
  id: CHAPTER_BODY_ID,
});
