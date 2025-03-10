// src/utils/navigation.ts

/**
 * Navigation path type for type safety
 */
export type NavigationPath = {
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
};

/**
 * Format a path ensuring proper structure
 * @param path - Raw path string
 * @returns Formatted path starting with /
 */
export const formatPath = (path: string): string => {
  return path.startsWith('/') ? path : `/${path}`;
};

/**
 * Check if a path is active (exact match)
 * @param currentPath - Current application path
 * @param checkPath - Path to check against
 */
export const isActivePath = (currentPath: string, checkPath: string): boolean => {
  return currentPath === formatPath(checkPath);
};

/**
 * Check if a path is a parent of current path
 * @param currentPath - Current application path
 * @param parentPath - Potential parent path
 */
export const isParentPath = (currentPath: string, parentPath: string): boolean => {
  if (parentPath === '/') return currentPath !== '/';
  return currentPath.startsWith(formatPath(parentPath));
};

/**
 * Get path segments for hierarchical navigation
 * @param path - Path to split into segments
 */
export const getPathSegments = (path: string): string[] => {
  return path.split('/').filter(Boolean);
};

/**
 * Get parent path from current path
 * @param path - Current path
 */
export const getParentPath = (path: string): string => {
  const segments = getPathSegments(path);
  segments.pop();
  return segments.length ? `/${segments.join('/')}` : '/';
};

/**
 * Extract query parameters from URL
 * @param search - URL search string
 */
export const getQueryParams = (search: string): Record<string, string> => {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

/**
 * Build URL with query parameters
 * @param path - Base path
 * @param params - Query parameters
 */
export const buildUrl = (path: string, params: Record<string, string>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value);
  });
  const search = searchParams.toString();
  return search ? `${path}?${search}` : path;
};

/**
 * Create a complete navigation path object
 * @param path - Base path
 * @param params - Route parameters
 * @param query - Query parameters
 */
export const createNavigationPath = (
  path: string,
  params?: Record<string, string>,
  query?: Record<string, string>
): NavigationPath => {
  let processedPath = formatPath(path);
  
  // Replace route parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      processedPath = processedPath.replace(`:${key}`, value);
    });
  }

  return {
    path: processedPath,
    params,
    query
  };
};

/**
 * Extract route parameters from path
 * @param template - Route template (e.g., /users/:id)
 * @param path - Actual path (e.g., /users/123)
 */
export const extractRouteParams = (
  template: string,
  path: string
): Record<string, string> => {
  const templateSegments = template.split('/');
  const pathSegments = path.split('/');
  const params: Record<string, string> = {};

  templateSegments.forEach((segment, index) => {
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1);
      params[paramName] = pathSegments[index];
    }
  });

  return params;
};

/**
 * Normalize a path by removing trailing slashes and empty segments
 * @param path - Path to normalize
 */
export const normalizePath = (path: string): string => {
  return `/${path.split('/').filter(Boolean).join('/')}`;
};

/**
 * Match a path against a route pattern
 * @param pattern - Route pattern with parameters
 * @param path - Actual path to match
 */
export const matchPath = (pattern: string, path: string): boolean => {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = path.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  return patternSegments.every((segment, index) => {
    if (segment.startsWith(':')) {
      return true; // Parameter matches anything
    }
    return segment === pathSegments[index];
  });
};