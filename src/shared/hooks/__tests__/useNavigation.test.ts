// src/hooks/__tests__/useNavigation.test.ts
import { renderHook } from '@testing-library/react';
import { useNavigation } from '../useNavigation';

// ---------------------------------------------------------------------------
// Mock react-router-dom
// ---------------------------------------------------------------------------
const mockLocationValue = {
  pathname: '/npcs',
  search: '?filter=active',
  hash: '#section-1',
};

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock NavigationContext
// ---------------------------------------------------------------------------
const mockNavigateFn = jest.fn();

jest.mock('../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation: useNavigationContext } = require('../../context/NavigationContext');
const { useLocation } = require('react-router-dom');

const makeContextMock = (overrides: Record<string, unknown> = {}) => ({
  state: {
    currentPath: '/npcs',
    previousPath: null,
    navigationStack: [{ path: '/npcs', timestamp: 1000 }],
    queryParams: {},
  },
  navigateToPage: mockNavigateFn,
  goBack: jest.fn(),
  updateQueryParams: jest.fn(),
  getCurrentQueryParams: jest.fn().mockReturnValue({}),
  clearHistory: jest.fn(),
  createPath: jest.fn(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocation.mockReturnValue(mockLocationValue);
    (useNavigationContext as jest.Mock).mockReturnValue(makeContextMock());
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    test('should expose all navigation utilities', () => {
      const { result } = renderHook(() => useNavigation());

      expect(typeof result.current.navigateWithParams).toBe('function');
      expect(typeof result.current.getCurrentParams).toBe('function');
      expect(typeof result.current.updateParams).toBe('function');
      expect(typeof result.current.createPath).toBe('function');
      expect(typeof result.current.getBreadcrumbs).toBe('function');
      expect(typeof result.current.shouldHighlightPath).toBe('function');
    });

    test('should expose path utility functions', () => {
      const { result } = renderHook(() => useNavigation());

      expect(typeof result.current.formatPath).toBe('function');
      expect(typeof result.current.isActivePath).toBe('function');
      expect(typeof result.current.isParentPath).toBe('function');
      expect(typeof result.current.getPathSegments).toBe('function');
      expect(typeof result.current.getParentPath).toBe('function');
    });

    test('should expose current location info', () => {
      const { result } = renderHook(() => useNavigation());

      expect(result.current.currentPath).toBe('/npcs');
      expect(result.current.currentSearch).toBe('?filter=active');
      expect(result.current.currentHash).toBe('#section-1');
    });

    test('should expose navigationState', () => {
      const { result } = renderHook(() => useNavigation());
      expect(result.current.navigationState).toBeDefined();
      expect(result.current.navigationState.pathSegments).toBeDefined();
      expect(result.current.navigationState.breadcrumbs).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // navigateWithParams
  // -------------------------------------------------------------------------
  describe('navigateWithParams', () => {
    test('should call navigateToPage with a URL including query params', () => {
      const { result } = renderHook(() => useNavigation());

      result.current.navigateWithParams('/npcs', { filter: 'active', sort: 'name' });

      expect(mockNavigateFn).toHaveBeenCalledWith(
        expect.stringContaining('/npcs')
      );
      expect(mockNavigateFn).toHaveBeenCalledWith(
        expect.stringContaining('filter=active')
      );
    });
  });

  // -------------------------------------------------------------------------
  // getCurrentParams
  // -------------------------------------------------------------------------
  describe('getCurrentParams', () => {
    test('should parse and return query params from current location', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, search: '?name=Gandalf&type=wizard' });
      const { result } = renderHook(() => useNavigation());

      const params = result.current.getCurrentParams();

      expect(params).toEqual({ name: 'Gandalf', type: 'wizard' });
    });

    test('should return empty object when no query string', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, search: '' });
      const { result } = renderHook(() => useNavigation());

      const params = result.current.getCurrentParams();
      expect(params).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // updateParams
  // -------------------------------------------------------------------------
  describe('updateParams', () => {
    test('should merge new params with existing and navigate', () => {
      useLocation.mockReturnValue({
        ...mockLocationValue,
        pathname: '/locations',
        search: '?existing=value',
      });
      const { result } = renderHook(() => useNavigation());

      result.current.updateParams({ newKey: 'newValue' });

      expect(mockNavigateFn).toHaveBeenCalledWith(
        expect.stringContaining('newKey=newValue')
      );
    });
  });

  // -------------------------------------------------------------------------
  // createPath
  // -------------------------------------------------------------------------
  describe('createPath', () => {
    test('should return a NavigationPath object with correct path', () => {
      const { result } = renderHook(() => useNavigation());

      const navPath = result.current.createPath('/quests', { id: 'q-1' }, { tab: 'overview' });

      expect(navPath.path).toBe('/quests');
      expect(navPath.params).toEqual({ id: 'q-1' });
      expect(navPath.query).toEqual({ tab: 'overview' });
    });

    test('should normalize path to ensure leading slash', () => {
      const { result } = renderHook(() => useNavigation());

      const navPath = result.current.createPath('quests');
      expect(navPath.path).toBe('/quests');
    });
  });

  // -------------------------------------------------------------------------
  // getBreadcrumbs
  // -------------------------------------------------------------------------
  describe('getBreadcrumbs', () => {
    test('should return breadcrumb segments from current pathname', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/npcs/detail/npc-1' });
      const { result } = renderHook(() => useNavigation());

      const breadcrumbs = result.current.getBreadcrumbs();

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toEqual({ label: 'npcs', path: '/npcs' });
      expect(breadcrumbs[1]).toEqual({ label: 'detail', path: '/npcs/detail' });
      expect(breadcrumbs[2]).toEqual({ label: 'npc-1', path: '/npcs/detail/npc-1' });
    });

    test('should return empty array for root path', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/' });
      const { result } = renderHook(() => useNavigation());

      const breadcrumbs = result.current.getBreadcrumbs();
      expect(breadcrumbs).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // shouldHighlightPath
  // -------------------------------------------------------------------------
  describe('shouldHighlightPath', () => {
    test('should return true for exact match when exact=true', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/npcs' });
      const { result } = renderHook(() => useNavigation());

      expect(result.current.shouldHighlightPath('/npcs', true)).toBe(true);
    });

    test('should return false for non-matching path when exact=true', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/quests' });
      const { result } = renderHook(() => useNavigation());

      expect(result.current.shouldHighlightPath('/npcs', true)).toBe(false);
    });

    test('should return true for parent path when exact=false (default)', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/npcs/detail/1' });
      const { result } = renderHook(() => useNavigation());

      expect(result.current.shouldHighlightPath('/npcs')).toBe(true);
    });

    test('should return false for non-parent path when exact=false', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/quests' });
      const { result } = renderHook(() => useNavigation());

      expect(result.current.shouldHighlightPath('/npcs')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Path utility wrappers
  // -------------------------------------------------------------------------
  describe('path utility wrappers', () => {
    test('isActivePath should check current pathname for exact match', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/npcs' });
      const { result } = renderHook(() => useNavigation());

      expect(result.current.isActivePath('/npcs')).toBe(true);
      expect(result.current.isActivePath('/quests')).toBe(false);
    });

    test('isParentPath should check if current pathname starts with path', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/npcs/detail/1' });
      const { result } = renderHook(() => useNavigation());

      expect(result.current.isParentPath('/npcs')).toBe(true);
      expect(result.current.isParentPath('/quests')).toBe(false);
    });

    test('getPathSegments should return current pathname segments', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/npcs/detail' });
      const { result } = renderHook(() => useNavigation());

      expect(result.current.getPathSegments()).toEqual(['npcs', 'detail']);
    });

    test('getParentPath should return the parent of the current path', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/npcs/detail' });
      const { result } = renderHook(() => useNavigation());

      expect(result.current.getParentPath()).toBe('/npcs');
    });

    test('formatPath should ensure leading slash', () => {
      const { result } = renderHook(() => useNavigation());

      expect(result.current.formatPath('npcs')).toBe('/npcs');
      expect(result.current.formatPath('/npcs')).toBe('/npcs');
    });
  });

  // -------------------------------------------------------------------------
  // navigationState memoized value
  // -------------------------------------------------------------------------
  describe('navigationState', () => {
    test('should include pathSegments, parentPath, and breadcrumbs', () => {
      useLocation.mockReturnValue({ ...mockLocationValue, pathname: '/npcs/detail' });
      const { result } = renderHook(() => useNavigation());

      expect(result.current.navigationState.pathSegments).toEqual(['npcs', 'detail']);
      expect(result.current.navigationState.parentPath).toBe('/npcs');
      expect(Array.isArray(result.current.navigationState.breadcrumbs)).toBe(true);
    });

    test('should merge context state into navigationState', () => {
      const ctx = makeContextMock({
        state: {
          currentPath: '/npcs',
          previousPath: '/quests',
          navigationStack: [],
          queryParams: {},
        },
      });
      (useNavigationContext as jest.Mock).mockReturnValue(ctx);
      const { result } = renderHook(() => useNavigation());

      expect(result.current.navigationState.previousPath).toBe('/quests');
    });
  });
});
