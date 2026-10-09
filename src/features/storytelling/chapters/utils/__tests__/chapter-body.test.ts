// src/features/storytelling/chapters/utils/__tests__/chapter-body.test.ts
//
// T134: a chapter's text is a document of its own, `chapters/{id}/body/text`.
// The copy chapters before kept on themselves was moved there in production,
// and text left on a chapter is read by nothing.
import { act, renderHook } from '@testing-library/react';
import {
  bodyDelete,
  chapterBodyPathOf,
  contentLengthOf,
  contentWrites,
  readChapterContent,
} from '../chapter-body';
import { useChapterContent } from '../../hooks/useChapterContent';
import type { Chapter } from '../../types';

const mockListeners: Array<{ path: string; onNext: (docs: unknown[]) => void; closed: boolean }> = [];
const mockGetCollectionFromServer = jest.fn();

jest.mock('core/services/firebase', () => ({
  __esModule: true,
  default: {
    document: {
      getCollectionFromServer: (path: string) => mockGetCollectionFromServer(path),
      subscribeToCollection: (path: string, onNext: (docs: unknown[]) => void) => {
        const listener = { path, onNext, closed: false };
        mockListeners.push(listener);
        return () => {
          listener.closed = true;
        };
      },
    },
  },
}));

let mockChaptersPath: string | null = 'groups/g/campaigns/c/chapters';
jest.mock('shared/hooks/useCampaignCollectionPath', () => ({
  useCampaignCollectionPath: () => mockChaptersPath,
}));

const CHAPTERS = 'groups/g/campaigns/c/chapters';
const chapter = (overrides: Partial<Chapter> = {}): Chapter =>
  ({ id: 'ch-1', title: 'The Mines', order: 1, ...overrides }) as Chapter;

beforeEach(() => {
  mockListeners.length = 0;
  mockGetCollectionFromServer.mockReset();
  mockChaptersPath = CHAPTERS;
});

describe('the writes', () => {
  it("store the text in the chapter's body, and on the chapter its length and an empty copy", () => {
    expect(contentWrites(CHAPTERS, 'ch-1', 'Speak friend')).toEqual({
      body: { type: 'set', collection: `${CHAPTERS}/ch-1/body`, id: 'text', data: { content: 'Speak friend' } },
      chapterFields: { content: null, contentLength: 12 },
    });
  });

  it("delete the chapter's body", () => {
    expect(bodyDelete(CHAPTERS, 'ch-1')).toEqual({ type: 'delete', collection: `${CHAPTERS}/ch-1/body`, id: 'text' });
    expect(chapterBodyPathOf(CHAPTERS, 'ch-1')).toBe(`${CHAPTERS}/ch-1/body`);
  });
});

describe('contentLengthOf', () => {
  it("is the length the chapter stores, whatever text is left on it", () => {
    expect(contentLengthOf(chapter({ content: 'abc', contentLength: 99 }))).toBe(99);
    expect(contentLengthOf(chapter({ content: null, contentLength: 99 }))).toBe(99);
    expect(contentLengthOf(chapter())).toBe(0);
  });
});

describe('readChapterContent', () => {
  it('reads the body from the server, not text left on the chapter', async () => {
    mockGetCollectionFromServer.mockResolvedValue([{ id: 'text', content: 'Speak friend' }]);
    await expect(readChapterContent(CHAPTERS, chapter({ content: 'Old text' }))).resolves.toBe('Speak friend');
    expect(mockGetCollectionFromServer).toHaveBeenCalledWith(`${CHAPTERS}/ch-1/body`);
  });

  it('is empty for a chapter with no body, and fails when the body cannot be read', async () => {
    mockGetCollectionFromServer.mockResolvedValueOnce([]);
    await expect(readChapterContent(CHAPTERS, chapter())).resolves.toBe('');
    mockGetCollectionFromServer.mockRejectedValueOnce(new Error('offline'));
    await expect(readChapterContent(CHAPTERS, chapter())).rejects.toThrow('offline');
  });
});

describe('useChapterContent', () => {
  it("reads the body live, and is undefined until it arrives", () => {
    const { result } = renderHook(() => useChapterContent(chapter({ content: null })));
    expect(result.current).toBeUndefined();
    expect(mockListeners.map((l) => l.path)).toEqual([`${CHAPTERS}/ch-1/body`]);

    act(() => mockListeners[0].onNext([{ id: 'text', content: 'Speak friend' }]));
    expect(result.current).toBe('Speak friend');

    act(() => mockListeners[0].onNext([{ id: 'text', content: 'Speak friend and enter' }]));
    expect(result.current).toBe('Speak friend and enter');
  });

  it("is empty for a chapter that has no body", () => {
    const { result } = renderHook(() => useChapterContent(chapter()));
    act(() => mockListeners[0].onNext([]));
    expect(result.current).toBe('');
  });

  it("reads the body, not text left on the chapter", () => {
    const { result } = renderHook(() => useChapterContent(chapter({ content: 'Written by an older browser' })));
    expect(mockListeners).toHaveLength(1);
    act(() => mockListeners[0].onNext([{ id: 'text', content: 'Speak friend' }]));
    expect(result.current).toBe('Speak friend');
  });

  it("never shows another chapter's text, or another campaign's, while the next one loads", () => {
    const { result, rerender } = renderHook(({ c }) => useChapterContent(c), {
      initialProps: { c: chapter({ content: null }) },
    });
    act(() => mockListeners[0].onNext([{ id: 'text', content: 'Chapter one' }]));

    rerender({ c: chapter({ id: 'ch-2', content: null }) });
    expect(mockListeners[0].closed).toBe(true);
    expect(result.current).toBeUndefined();

    act(() => mockListeners[1].onNext([{ id: 'text', content: 'Chapter two' }]));
    mockChaptersPath = 'groups/g/campaigns/other/chapters';
    rerender({ c: chapter({ id: 'ch-2', content: null }) });
    expect(result.current).toBeUndefined();
  });

  it('reads nothing without a chapter or a campaign', () => {
    renderHook(() => useChapterContent(undefined));
    mockChaptersPath = null;
    renderHook(() => useChapterContent(chapter()));
    expect(mockListeners).toEqual([]);
  });
});
