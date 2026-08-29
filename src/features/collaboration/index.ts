// src/features/collaboration/index.ts

// Note context and hooks
export { NoteProvider, useNotes } from './notes/context/NoteContext';
export { useNoteData } from './notes/hooks/useNoteData';
export { useCreateNote } from './notes/hooks/useCreateNote';
// Note presentation helpers — pure, no Firebase, safe for any consumer.
export { deriveTitle, displayTitle, MAX_DERIVED_TITLE_LENGTH } from './notes/utils/note-title';
export { matchesInText } from './notes/utils/entity-matching';
export { formatLastSaved } from './notes/utils/save-status';
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

// Entity extraction: usage context and hooks
export { UsageProvider, useUsageContext } from './entity-extraction/context/UsageContext';
export { useEntityExtractor } from './entity-extraction/hooks/useEntityExtractor';
export { useOpenAIExtractor } from './entity-extraction/hooks/useOpenAIExtractor';
// Entity extraction components consumed by pages/notes/* and layout
export { default as EntityExtractor } from './entity-extraction/components/EntityExtractor';
export { default as FloatingUsageIndicator } from './entity-extraction/components/FloatingUsageIndicator';
export { default as EntityCard } from './entity-extraction/components/EntityCard';
// Entity extraction / usage types
export type {
  UsagePeriod,
  PeriodUsage,
  EntityExtractionUsage,
  UsageStatus,
  UsageLimitError,
} from './entity-extraction/types';

// NOTE: `entity-extraction/services/EntityExtractionService` and
// `entity-extraction/services/entityMapper` are deliberately NOT re-exported
// here. Both import only direct service files (`services/firebase/core/*`,
// `services/openai/types`), not the `services/firebase` index, so they don't
// carry the eager-Firebase-init hazard described above — but they currently
// have no consumers outside this domain (only used via the useEntityExtractor
// / useOpenAIExtractor hooks and UsageContext, all already re-exported).
// Import by path if that changes.
