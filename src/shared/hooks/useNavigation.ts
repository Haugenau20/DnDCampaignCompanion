// src/hooks/useNavigation.ts
import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation as useNavigationContext } from '../context/NavigationContext';
import {
  formatPath,
  isActivePath,
  isParentPath,
  getQueryParams,
  buildUrl,
  getPathSegments,
  getParentPath,
  NavigationPath
} from '../utils/navigation';

/**
 * Enhanced navigation hook that combines context navigation with utility functions
 */
export const useNavigation = () => {
  const navigation = useNavigationContext();
  const location = useLocation();

  /**
   * Navigate with query parameters
   */
  const navigateWithParams = useCallback((
    path: string,
    params: Record<string, string>
  ) => {
    const url = buildUrl(path, params);
    navigation.navigateToPage(url);
  }, [navigation]);

  /**
   * Get current query parameters
   */
  const getCurrentParams = useCallback(() => {
    return getQueryParams(location.search);
  }, [location.search]);

  /**
   * Update query parameters without navigation
   */
  const updateParams = useCallback((
    params: Record<string, string>
  ) => {
    const currentParams = getCurrentParams();
    const url = buildUrl(location.pathname, { ...currentParams, ...params });
    navigation.navigateToPage(url);
  }, [location.pathname, getCurrentParams, navigation]);

  /**
   * Create a navigation path object
   */
  const createPath = useCallback((
    path: string,
    params?: Record<string, string>,
    query?: Record<string, string>
  ): NavigationPath => {
    return {
      path: formatPath(path),
      params,
      query
    };
  }, []);

  /**
   * Get breadcrumb path segments
   */
  const getBreadcrumbs = useCallback(() => {
    const segments = getPathSegments(location.pathname);
    return segments.map((_, index) => {
      const path = '/' + segments.slice(0, index + 1).join('/');
      return {
        label: segments[index],
        path
      };
    });
  }, [location.pathname]);

  /**
   * Check if path should be highlighted in navigation
   */
  const shouldHighlightPath = useCallback((
    path: string,
    exact: boolean = false
  ): boolean => {
    return exact 
      ? isActivePath(location.pathname, path)
      : isParentPath(location.pathname, path);
  }, [location.pathname]);

  /**
   * Get navigation state including computed values
   */
  const navigationState = useMemo(() => ({
    ...navigation.state,
    pathSegments: getPathSegments(location.pathname),
    parentPath: getParentPath(location.pathname),
    breadcrumbs: getBreadcrumbs()
  }), [location.pathname, navigation.state, getBreadcrumbs]);

  return {
    // Original navigation context
    ...navigation,
    
    // Enhanced navigation utilities
    navigateWithParams,
    getCurrentParams,
    updateParams,
    createPath,
    getBreadcrumbs,
    shouldHighlightPath,
    
    // Path utilities
    formatPath,
    isActivePath: (path: string) => isActivePath(location.pathname, path),
    isParentPath: (path: string) => isParentPath(location.pathname, path),
    getPathSegments: () => getPathSegments(location.pathname),
    getParentPath: () => getParentPath(location.pathname),
    
    // Enhanced state
    navigationState,
    
    // Current location info
    currentPath: location.pathname,
    currentSearch: location.search,
    currentHash: location.hash
  };
};

export default useNavigation;