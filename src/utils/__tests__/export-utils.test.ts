// src/utils/__tests__/export-utils.test.ts

import { exportChaptersAsText } from '../export-utils';
import type { Chapter } from 'features/storytelling';

/**
 * Read a Blob's text content. jsdom's Blob does not implement .text(),
 * so we route through Blob constructor's internal parts via FileReader,
 * which IS available in jsdom.
 */
const readBlobAsText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

describe('export-utils', () => {
  describe('exportChaptersAsText', () => {
    let createObjectURLSpy: jest.SpyInstance;
    let revokeObjectURLSpy: jest.SpyInstance;
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;
    let clickSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();

      // Mock URL.createObjectURL / revokeObjectURL (not present in jsdom by default)
      (global as any).URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      (global as any).URL.revokeObjectURL = jest.fn();
      createObjectURLSpy = (global as any).URL.createObjectURL;
      revokeObjectURLSpy = (global as any).URL.revokeObjectURL;

      appendChildSpy = jest.spyOn(document.body, 'appendChild');
      removeChildSpy = jest.spyOn(document.body, 'removeChild');
      // Spy on click prototype so we capture every created anchor
      clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    const makeChapter = (overrides: Partial<Chapter> = {}): Chapter => ({
      id: 'chapter-01',
      title: 'Chapter Title',
      content: 'Chapter content body.',
      order: 1,
      createdBy: 'test-user',
      createdByUsername: 'Test User',
      dateAdded: '2025-06-15T00:00:00Z',
      ...overrides,
    });

    test('should create a Blob and trigger a download', () => {
      const chapters: Chapter[] = [makeChapter()];
      exportChaptersAsText(chapters);

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLSpy.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('text/plain');

      // Anchor was appended and clicked
      expect(appendChildSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    test('should set anchor href to the created object URL and use the expected filename', () => {
      const chapters: Chapter[] = [makeChapter()];
      exportChaptersAsText(chapters);

      const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(anchor.tagName).toBe('A');
      expect(anchor.href).toContain('blob:mock-url');
      expect(anchor.download).toBe('campaign-chapters.txt');
    });

    test('should sort chapters by order before serializing', () => {
      const chapters: Chapter[] = [
        makeChapter({ id: 'c3', title: 'Third', order: 3, content: 'Third content' }),
        makeChapter({ id: 'c1', title: 'First', order: 1, content: 'First content' }),
        makeChapter({ id: 'c2', title: 'Second', order: 2, content: 'Second content' }),
      ];
      exportChaptersAsText(chapters);

      const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
      // Use the constructor's stored content rather than Blob.text() to be jsdom-friendly
      // We can use the FileReader-less approach by reading via Response
      return readBlobAsText(blob).then((text) => {
        const firstIdx = text.indexOf('First');
        const secondIdx = text.indexOf('Second');
        const thirdIdx = text.indexOf('Third');
        expect(firstIdx).toBeGreaterThan(-1);
        expect(secondIdx).toBeGreaterThan(firstIdx);
        expect(thirdIdx).toBeGreaterThan(secondIdx);
      });
    });

    test('should include a header, per-chapter heading, content, and separator', () => {
      const chapters: Chapter[] = [makeChapter({ order: 1, title: 'Intro', content: 'Hello' })];
      exportChaptersAsText(chapters);

      const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
      return readBlobAsText(blob).then((text) => {
        expect(text).toContain('# Campaign Chapter Content');
        expect(text).toContain('## Chapter 1: Intro');
        expect(text).toContain('Hello');
        expect(text).toContain('-----');
      });
    });

    test('should not mutate the input chapters array', () => {
      const chapters: Chapter[] = [
        makeChapter({ order: 2 }),
        makeChapter({ order: 1 }),
      ];
      const snapshot = chapters.map((c) => c.order);
      exportChaptersAsText(chapters);
      expect(chapters.map((c) => c.order)).toEqual(snapshot);
    });

    test('should clean up DOM anchor and revoke URL after timeout', () => {
      const chapters: Chapter[] = [makeChapter()];
      exportChaptersAsText(chapters);

      // Cleanup is scheduled, not yet executed
      expect(removeChildSpy).not.toHaveBeenCalled();
      expect(revokeObjectURLSpy).not.toHaveBeenCalled();

      jest.advanceTimersByTime(150);

      expect(removeChildSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    test('should still produce a valid blob when given empty chapter array', () => {
      exportChaptersAsText([]);
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
      return readBlobAsText(blob).then((text) => {
        expect(text).toContain('# Campaign Chapter Content');
      });
    });
  });
});
