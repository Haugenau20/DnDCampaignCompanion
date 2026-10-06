// src/assets/images.d.ts
/**
 * A picture imported as a module is its built URL (a hashed file under
 * `assets/`). In jest the import is `src/__mocks__/fileMock.ts`.
 */
declare module '*.webp' {
  const src: string;
  export default src;
}
