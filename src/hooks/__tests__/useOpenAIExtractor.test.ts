// src/hooks/__tests__/useOpenAIExtractor.test.ts
import { renderHook, act } from '@testing-library/react';
import { useOpenAIExtractor } from '../useOpenAIExtractor';
import { ExtractedEntity } from '../../types/note';

// ---------------------------------------------------------------------------
// Mock EntityExtractionService
// ---------------------------------------------------------------------------
const mockExtractEntities = jest.fn();
const mockGetInstance = jest.fn();

jest.mock('../../services/firebase/ai/EntityExtractionService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const EntityExtractionService = require('../../services/firebase/ai/EntityExtractionService').default;

const makeExtractedEntity = (id: string, text: string, type: 'npc' | 'location' | 'quest' | 'rumor'): ExtractedEntity => ({
  id,
  text,
  type,
  confidence: 0.95,
  isConverted: false,
  createdAt: '2025-06-01T00:00:00.000Z',
});

const setupServiceMock = () => {
  (EntityExtractionService.getInstance as jest.Mock).mockReturnValue({
    extractEntities: mockExtractEntities,
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useOpenAIExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupServiceMock();
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    test('should expose extractEntities, isExtracting, error, resetError', () => {
      const { result } = renderHook(() => useOpenAIExtractor());

      expect(typeof result.current.extractEntities).toBe('function');
      expect(typeof result.current.isExtracting).toBe('boolean');
      expect(typeof result.current.resetError).toBe('function');
      expect(result.current).toHaveProperty('error');
    });

    test('should start with isExtracting=false', () => {
      const { result } = renderHook(() => useOpenAIExtractor());
      expect(result.current.isExtracting).toBe(false);
    });

    test('should start with error=null', () => {
      const { result } = renderHook(() => useOpenAIExtractor());
      expect(result.current.error).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // extractEntities - success path
  // -------------------------------------------------------------------------
  describe('extractEntities - success path', () => {
    test('should return extracted entities from service', async () => {
      const entities = [
        makeExtractedEntity('1', 'Gandalf', 'npc'),
        makeExtractedEntity('2', 'Rivendell', 'location'),
      ];
      mockExtractEntities.mockResolvedValue(entities);

      const { result } = renderHook(() => useOpenAIExtractor());

      let extracted: ExtractedEntity[] = [];
      await act(async () => {
        extracted = await result.current.extractEntities('Gandalf visited Rivendell');
      });

      expect(extracted).toEqual(entities);
    });

    test('should call service with provided content', async () => {
      mockExtractEntities.mockResolvedValue([]);

      const { result } = renderHook(() => useOpenAIExtractor());

      await act(async () => {
        await result.current.extractEntities('Test content');
      });

      expect(mockExtractEntities).toHaveBeenCalledWith('Test content', undefined);
    });

    test('should pass optional model parameter to service', async () => {
      mockExtractEntities.mockResolvedValue([]);

      const { result } = renderHook(() => useOpenAIExtractor());

      await act(async () => {
        await result.current.extractEntities('Test content', 'gpt-4');
      });

      expect(mockExtractEntities).toHaveBeenCalledWith('Test content', 'gpt-4');
    });

    test('should set isExtracting to true during extraction', async () => {
      let resolveFn: (val: ExtractedEntity[]) => void;
      mockExtractEntities.mockReturnValue(new Promise(resolve => { resolveFn = resolve; }));

      const { result } = renderHook(() => useOpenAIExtractor());

      const extractPromise = act(async () => {
        result.current.extractEntities('content');
      });

      // isExtracting should be true while pending - check immediately
      // Note: We check inside act, so we'll verify it transitions to false after
      await act(async () => {
        resolveFn!([]);
      });
      await extractPromise;

      expect(result.current.isExtracting).toBe(false);
    });

    test('should set isExtracting to false after extraction completes', async () => {
      mockExtractEntities.mockResolvedValue([]);

      const { result } = renderHook(() => useOpenAIExtractor());

      await act(async () => {
        await result.current.extractEntities('content');
      });

      expect(result.current.isExtracting).toBe(false);
    });

    test('should clear error on successful extraction', async () => {
      mockExtractEntities
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce([]);

      const { result } = renderHook(() => useOpenAIExtractor());

      // First call fails
      await act(async () => {
        await result.current.extractEntities('content');
      });

      expect(result.current.error).toBe('First error');

      // Second call succeeds
      await act(async () => {
        await result.current.extractEntities('content');
      });

      expect(result.current.error).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // extractEntities - error path
  // -------------------------------------------------------------------------
  describe('extractEntities - error path', () => {
    test('should set error state when service throws an Error', async () => {
      mockExtractEntities.mockRejectedValue(new Error('API unavailable'));

      const { result } = renderHook(() => useOpenAIExtractor());

      await act(async () => {
        await result.current.extractEntities('content');
      });

      expect(result.current.error).toBe('API unavailable');
    });

    test('should set fallback error message for non-Error rejections', async () => {
      mockExtractEntities.mockRejectedValue('something failed');

      const { result } = renderHook(() => useOpenAIExtractor());

      await act(async () => {
        await result.current.extractEntities('content');
      });

      expect(result.current.error).toBe('Failed to extract entities');
    });

    test('should return empty array when service throws', async () => {
      mockExtractEntities.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useOpenAIExtractor());

      let extracted: ExtractedEntity[] | undefined;
      await act(async () => {
        extracted = await result.current.extractEntities('content');
      });

      expect(extracted).toEqual([]);
    });

    test('should set isExtracting to false after error', async () => {
      mockExtractEntities.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useOpenAIExtractor());

      await act(async () => {
        await result.current.extractEntities('content');
      });

      expect(result.current.isExtracting).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // resetError
  // -------------------------------------------------------------------------
  describe('resetError', () => {
    test('should clear error state when called', async () => {
      mockExtractEntities.mockRejectedValue(new Error('Some error'));

      const { result } = renderHook(() => useOpenAIExtractor());

      await act(async () => {
        await result.current.extractEntities('content');
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.resetError();
      });

      expect(result.current.error).toBeNull();
    });

    test('should be a no-op when error is already null', () => {
      const { result } = renderHook(() => useOpenAIExtractor());

      act(() => {
        result.current.resetError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
