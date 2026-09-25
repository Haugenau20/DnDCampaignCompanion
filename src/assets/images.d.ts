// src/assets/images.d.ts
/**
 * A picture imported as a module is its built URL (webpack's `asset/resource`,
 * hashed file name). Declared here rather than through `react-app-env.d.ts`:
 * that file pulls in `react-scripts`' types, whose read-only `NODE_ENV` breaks
 * `setupTests.ts`. In jest the import is `src/__mocks__/fileMock.ts`.
 */
declare module '*.webp' {
  const src: string;
  export default src;
}
