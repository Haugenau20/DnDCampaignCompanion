// src/features/collaboration/index.ts

// Note context and hooks
export { NoteProvider, useNotes } from './notes/context/NoteContext';
export { useNoteData } from './notes/hooks/useNoteData';
// Components consumed by pages/notes/* and other external consumers
export { default as NotesList } from './notes/components/NotesList';
export { default as NoteEditor } from './notes/components/NoteEditor';
export { default as NoteCard } from './notes/components/NoteCard';
export { default as NoteReferences } from './notes/components/NoteReferences';
export type { NoteEditorRef } from './notes/components/NoteEditor';
// Named helpers re-exported from NoteReferences for consumers still outside
// the collaboration domain (e.g. EntityExtractor, pending its own migration)
export type { PotentialReference } from './notes/components/NoteReferences';
export { normalizeTextForComparison } from './notes/components/NoteReferences';
// Note types
export type { Note, NoteStatus, ExtractedEntity, EntityType, NoteContextValue } from './notes/types';

// NOTE: `notes/utils/note-relationships` is deliberately NOT re-exported here.
// It imports the `services/firebase` index, which calls initializeFirebaseServices()
// at module scope (and therefore getAnalytics()). Re-exporting it would make every
// `import ... from 'features/collaboration'` eagerly initialize Firebase, crashing any
// jsdom test that has not mocked it — the same failure that keeps
// src/test-utils/__tests__/enhanced-test-utils.test.tsx from loading.
// It currently has no consumers outside the domain; import it by path if that changes.
