// src/utils/__tests__/navigation.test.ts

import {
  formatPath,
  isActivePath,
  isParentPath,
  getPathSegments,
  getParentPath,
  getQueryParams,
  buildUrl,
  createNavigationPath,
  extractRouteParams,
  normalizePath,
  matchPath,
} from '../navigation';

describe('navigation', () => {
  describe('formatPath', () => {
    test('should add leading slash when missing', () => {
      expect(formatPath('foo')).toBe('/foo');
    });

    test('should leave path unchanged when already starting with /', () => {
      expect(formatPath('/foo')).toBe('/foo');
    });

    test('should handle empty string by prepending slash', () => {
      expect(formatPath('')).toBe('/');
    });

    test('should not modify nested paths', () => {
      expect(formatPath('/a/b/c')).toBe('/a/b/c');
      expect(formatPath('a/b/c')).toBe('/a/b/c');
    });
  });

  describe('isActivePath', () => {
    test('should return true when paths match exactly', () => {
      expect(isActivePath('/foo', '/foo')).toBe(true);
      expect(isActivePath('/foo', 'foo')).toBe(true);
    });

    test('should return false when paths differ', () => {
      expect(isActivePath('/foo', '/bar')).toBe(false);
      expect(isActivePath('/foo/bar', '/foo')).toBe(false);
    });
  });

  describe('isParentPath', () => {
    test('should return true when current path starts with parent path', () => {
      expect(isParentPath('/users/123', '/users')).toBe(true);
      expect(isParentPath('/users/123/edit', '/users')).toBe(true);
    });

    test('should treat "/" as parent only for non-root paths', () => {
      expect(isParentPath('/foo', '/')).toBe(true);
      expect(isParentPath('/', '/')).toBe(false);
    });

    test('should return false when path does not start with parent', () => {
      expect(isParentPath('/users', '/admin')).toBe(false);
    });

    test('should handle bare parent path without leading slash', () => {
      expect(isParentPath('/users/123', 'users')).toBe(true);
    });
  });

  describe('getPathSegments', () => {
    test('should split a path into segments, omitting empty ones', () => {
      expect(getPathSegments('/users/123/edit')).toEqual(['users', '123', 'edit']);
    });

    test('should return an empty array for "/"', () => {
      expect(getPathSegments('/')).toEqual([]);
    });

    test('should ignore trailing/leading slashes', () => {
      expect(getPathSegments('/users//123/')).toEqual(['users', '123']);
    });

    test('should return empty array for empty string', () => {
      expect(getPathSegments('')).toEqual([]);
    });
  });

  describe('getParentPath', () => {
    test('should return the parent path one level up', () => {
      expect(getParentPath('/users/123/edit')).toBe('/users/123');
      expect(getParentPath('/users/123')).toBe('/users');
    });

    test('should return "/" for top-level paths', () => {
      expect(getParentPath('/users')).toBe('/');
    });

    test('should return "/" for root path', () => {
      expect(getParentPath('/')).toBe('/');
    });
  });

  describe('getQueryParams', () => {
    test('should parse simple query strings', () => {
      expect(getQueryParams('?foo=bar&baz=qux')).toEqual({ foo: 'bar', baz: 'qux' });
    });

    test('should return an empty object for empty search', () => {
      expect(getQueryParams('')).toEqual({});
    });

    test('should accept search without leading ?', () => {
      expect(getQueryParams('a=1&b=2')).toEqual({ a: '1', b: '2' });
    });

    test('should URL-decode values', () => {
      expect(getQueryParams('?name=John%20Doe')).toEqual({ name: 'John Doe' });
    });

    test('should retain only the last value when same key appears multiple times', () => {
      // URLSearchParams.forEach yields all values; later overwrites earlier in our reducer
      const result = getQueryParams('?k=1&k=2');
      expect(result.k).toBe('2');
    });
  });

  describe('buildUrl', () => {
    test('should build url with query parameters', () => {
      expect(buildUrl('/users', { id: '123', q: 'test' })).toBe('/users?id=123&q=test');
    });

    test('should return the path unchanged when no params are present', () => {
      expect(buildUrl('/users', {})).toBe('/users');
    });

    test('should skip empty values', () => {
      expect(buildUrl('/users', { id: '123', empty: '' })).toBe('/users?id=123');
    });

    test('should URL-encode special characters in values', () => {
      const result = buildUrl('/search', { q: 'hello world' });
      expect(result).toBe('/search?q=hello+world');
    });
  });

  describe('createNavigationPath', () => {
    test('should add leading slash and return a NavigationPath object', () => {
      const result = createNavigationPath('users');
      expect(result).toEqual({ path: '/users', params: undefined, query: undefined });
    });

    test('should replace route params in the path', () => {
      const result = createNavigationPath('/users/:id', { id: '42' });
      expect(result.path).toBe('/users/42');
      expect(result.params).toEqual({ id: '42' });
    });

    test('should handle multiple route params', () => {
      const result = createNavigationPath('/users/:userId/posts/:postId', {
        userId: '1',
        postId: '99',
      });
      expect(result.path).toBe('/users/1/posts/99');
    });

    test('should include query in returned object', () => {
      const result = createNavigationPath('/users', undefined, { sort: 'asc' });
      expect(result.query).toEqual({ sort: 'asc' });
    });
  });

  describe('extractRouteParams', () => {
    test('should extract parameters from a simple template', () => {
      expect(extractRouteParams('/users/:id', '/users/123')).toEqual({ id: '123' });
    });

    test('should extract multiple parameters', () => {
      expect(
        extractRouteParams('/users/:userId/posts/:postId', '/users/1/posts/99')
      ).toEqual({ userId: '1', postId: '99' });
    });

    test('should return empty object when template has no params', () => {
      expect(extractRouteParams('/users/list', '/users/list')).toEqual({});
    });
  });

  describe('normalizePath', () => {
    test('should remove duplicate slashes and trailing slashes', () => {
      expect(normalizePath('/users//123/')).toBe('/users/123');
    });

    test('should normalize a path missing leading slash', () => {
      expect(normalizePath('users/123')).toBe('/users/123');
    });

    test('should return "/" for empty or root path', () => {
      expect(normalizePath('')).toBe('/');
      expect(normalizePath('/')).toBe('/');
    });
  });

  describe('matchPath', () => {
    test('should match identical static paths', () => {
      expect(matchPath('/users/list', '/users/list')).toBe(true);
    });

    test('should match paths with parameter placeholders', () => {
      expect(matchPath('/users/:id', '/users/123')).toBe(true);
    });

    test('should return false when segment counts differ', () => {
      expect(matchPath('/users/:id', '/users/123/edit')).toBe(false);
    });

    test('should return false for mismatched static segments', () => {
      expect(matchPath('/users/list', '/users/profile')).toBe(false);
    });

    test('should match nested patterns with multiple params', () => {
      expect(matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')).toBe(true);
    });
  });
});
