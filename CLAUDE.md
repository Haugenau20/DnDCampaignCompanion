# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚧 ARCHITECTURE EVOLUTION IN PROGRESS

**IMPORTANT**: All four feature domains are migrated. The `shared/`/`core/` pass is what remains.

| Domain | Status |
|---|---|
| `features/user-management/` (auth, groups, profiles, admin) | ✅ migrated |
| `features/storytelling/` (chapters, stories, sagas) | ✅ migrated |
| `features/campaign-entities/` (npcs, quests, locations, rumors) | ✅ migrated |
| `features/collaboration/` (notes, AI entity extraction) | ✅ migrated |
| `shared/` + `core/` infrastructure pass | 🚧 **in progress** (Phase 3e, branch `migration/shared-core`) |

**What that means in practice**: migrated domains live in `src/features/<domain>/` and expose a
barrel `index.ts` — import from the barrel, never reach into their internals. Everything not yet
migrated still sits in the old functional layout (`src/context/`, `src/components/`, `src/hooks/`,
`src/types/`). Expect both shapes in the tree, and put new code in the shape its domain has
already reached.

**Still awaiting migration** — all bound for `shared/` or `core/`: `context/{NavigationContext,SearchContext}`,
`components/core/`, `components/layout/`, `components/shared/`, `components/features/contact/`,
`hooks/{useFirebaseData,useNavigation,useSearch}`, `types/{common,search,user}.ts`,
`services/firebase/` (minus the AI service, now in `collaboration`), and `test-utils/`.

**Two boundary calls that filenames get wrong** — verify by opening the file, not by guessing from
the name: `UsageContext` sounds like shared infrastructure but imports `EntityExtractionService`, so
it is `collaboration/entity-extraction/`. `useSessionManager` sounds like collaboration but tracks
auth session activity via `useAuth`, so it is `user-management/auth/hooks/`. Both are now in their
correct homes.

**Both known deviations from the dependency rules below are now closed** — audited 2026-07-27, one
resolved by decision and one resolved in code the same day. They are kept here because the reasoning
matters when the same questions resurface.

1. **`features/` → other `features/`** happens 26 times (campaign-entities and storytelling both
   depend on user-management; the four entity create/edit forms depend on collaboration for
   `useNotes().markEntityAsConverted`). All go through the target domain's **barrel**; none reaches
   into another feature's internals. **Resolved 2026-07-27**: the dependency rule below is amended
   to match this practice instead of forcing a decoupling seam. Barrel-level coupling is acceptable —
   it's the same public-API contract every consumer of a feature already goes through — because it
   preserves the ability to refactor a domain's internals without breaking the domains that depend on
   it. Internals coupling is the thing the original rule existed to prevent, and audit found none.
2. **`core/` → `features/`, a genuine inversion that blocked creating `core/` at all.**
   **Resolved 2026-07-27 in code.** `AuthService`, `UserService`, `GroupService` and
   `InvitationService` moved back to `services/firebase/{auth,user,group}/` — each file's own header
   comment still named that path, because they originated there and were carried into
   `user-management` only because it migrated first. The four remaining consumers use `UserService`
   purely as a **type** (instances come from `ServiceRegistry`), so those are now `import type` and
   carry no runtime edge. The 9 imports that reached into user-management's internals are gone too:
   its barrel now exports the 7 components external callers need, so `App.tsx`,
   `components/layout/Header.tsx` and `components/shared/ContextSwitcher.tsx` go through it.

   **Adding components to that barrel first required removing 12 intra-domain self-barrel imports**,
   which would otherwise have become real cycles (`index.ts` → `AdminPanel.tsx` → `index.ts`). The
   three later-migrated domains have zero such imports; user-management was the pre-pattern outlier.
   **Inside a domain, import siblings directly — never your own barrel.**

**Related trap in the same file, also resolved**: `services/firebase/index.ts` used to run
`initializeFirebaseServices()` — and therefore `getAnalytics()` — at module scope, so any barrel
re-exporting something with a transitive path to it eagerly initialized Firebase and crashed jsdom
tests. Initialization is now memoized behind `getFirebaseServices()`, with the exported services as
lazy stand-ins, so importing the module is side-effect free and the
`firebaseServices.auth.method()` shape is unchanged. This unblocked
`test-utils/__tests__/enhanced-test-utils.test.tsx`, which had never been able to load.
`collaboration`'s barrel still omits `notes/utils/note-relationships`; that omission is now
belt-and-braces rather than load-bearing.

**Key Documents** (note: `docs/backlog/` no longer exists — these moved):
- `docs/testing/post-test-coverage-roadmap.md` — **start here**; the live status and execution order
- `docs/architecture/migration/hybrid-feature-first-restructuring-strategy.md` — the original plan (not updated with progress)
- `docs/architecture/migration/codebase-restructuring-analysis.md` - Architecture analysis and recommendations
- `docs/architecture/migration/attribution-consolidation-findings.md` — a worked example of an audit whose predictions were wrong, and why
- `docs/testing/bug-tracking/README.md` — live bug tracker
- `docs/architecture/migration/deep-dive-feature-enhancements.md` - Advanced feature roadmap
- `docs/architecture/migration/third-party-integration-analysis.md` - Integration opportunities

## Build Commands

### Current Environment Management
- Run development: `.\scripts\manage-environment.ps1 -Environment dev -Action start`
- Build production: `.\scripts\manage-environment.ps1 -Environment prod -Action start`
- Stop environments: `.\scripts\manage-environment.ps1 -Environment dev|prod -Action stop`
- Generate sample data: `.\scripts\manage-dev-data.ps1 -Action generate`
- View logs: `.\scripts\manage-environment.ps1 -Environment dev|prod -Action logs [-Service frontend|emulators]`

### Testing Commands
- Run test suite: `npm test` (jest)
- Coverage: `npm run test:coverage` — CI floor is set in `jest.config.ts` (85% statements/functions/lines, 81% branches)
- Behavioural suites only: `npm run test:behavioral`
- HTML report: `npm run test:html`
- Single file, fast: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="<pattern>"`

**A non-zero failure count is expected.** The behavioural suites intentionally contain failing
tests that mark catalogued bugs (`docs/testing/bug-tracking/`). Compare against the current
baseline before assuming you broke something — never "fix" a red test by editing it.

### Verifying a change before proposing a merge
- `npx tsc --noEmit` — type errors block the deploy, since `react-scripts build` type-checks all of `src/`
- `npm test` — compare the failure count against the recorded baseline
- **`npm run build` — required, and not implied by the two above.** `react-scripts`' webpack honours
  tsconfig `baseUrl` but **ignores `paths`**, so `@/...` alias imports pass both `tsc` and jest and
  then fail the production build with `Module not found`. Use bare `baseUrl` imports
  (`types/common`, `shared/attribution`) in anything that ships; `@/` is safe only in `__tests__/`
  and `test-utils/`, which are never bundled. Adding a new top-level `src/` directory also means
  adding it to the resolver allow-list in `jest.config.ts`.

## Code Style Guidelines

### Current Standards
- **TypeScript**: Use strict typing with interfaces/types in dedicated files
- **Theme System**: NEVER use hardcoded colors - always use theme variables
- **Formatting**: React components use PascalCase, utilities use camelCase
- **Quotes**: Use double quotes (") per ESLint config
- **Documentation**: Provide JSDoc comments for all functions, components, and complex variables
- **Components**: Components should focus on player-facing features (not DM tools)
- **Firebase**: Always use service classes from BaseFirebaseService

### Post-Restructuring Standards (PLANNED)
- **Feature Organization**: Each feature contains components/, hooks/, context/, services/, types/, pages/
- **Public APIs**: Features export clean interfaces via index.ts barrel exports
- **Import Restrictions**: Features can import from shared/, core/, and other features' public barrels (index.ts) — never another feature's internals
- **Domain Boundaries**: Campaign entities grouped together, clear separation from storytelling/collaboration
- **Service Pattern**: All integrations extend BaseFirebaseService singleton pattern
- **Testing Requirements**: All business logic requires tests before implementation

## Project Purpose
This is a tool for D&D players (not DMs) to collect and organize their shared campaign data including stories, rumors, NPCs, locations, and quests.

## Development Principles
- Follow KISS (Keep It Simple, Stupid): Write straightforward, uncomplicated solutions
- Apply YAGNI (You Aren't Gonna Need It): Don't add speculative features
- Adhere to SOLID Principles
- Maintain DRY (Don't Repeat Yourself): Avoid code duplication

## Architecture

### Current Architecture (TRANSITIONAL)
- **State Management**: React Context API providers for state management
- **Components**: Organized in core, features, layout, and shared directories
- **Firebase**: Access through context hooks like `useAuth()`, `useGroups()`, etc.
- **Feature Organization**: NPCs, Locations, Quests, Rumors, and Stories each have dedicated context providers and components
- **Known Issues**: High cognitive load, scattered feature logic across 6+ directories per feature

### Target Architecture (Feature-First with Shared Infrastructure)
```
src/
├── features/
│   ├── campaign-entities/     # NPCs, Quests, Locations, Rumors + shared relationship logic
│   ├── storytelling/         # Chapters, Stories, Timeline
│   ├── collaboration/        # Notes, AI entity extraction, AI usage tracking
│   └── user-management/      # Auth, Groups, Profiles
├── shared/                   # Cross-domain shared components, hooks, contexts
├── core/                     # Infrastructure: Firebase services, UI primitives, theme
├── pages/                    # Route definitions (thin orchestrators)
└── app/                      # App setup and root providers
```

### Dependency Rules (POST-RESTRUCTURING)
- `app/` → `features/`, `shared/`, `core/`
- `pages/` → `features/` (via public APIs), `shared/`, `core/`
- `features/` → `shared/`, `core/`, and other features' **public barrels** (NOT other features' internals)
- `shared/` → `core/`
- `core/` → (no internal dependencies)

### Migration Status
- **Phase**: All four feature domains are migrated. Next is the `shared`/`core` infrastructure pass, then post-migration bug triage.
- **Order**: user-management → storytelling → campaign-entities → collaboration. Deliberately sequential; each domain must be green before the next starts. Within collaboration, `notes` had to precede `entity-extraction` for the same reason — extraction imports notes' types and helpers.
- **Per-domain exit criteria**: all tests pass except the documented bug markers, coverage on the migrated domain does not drop, no new bugs introduced by the move itself, and a `migration/<domain>-complete` tag on `main` at merge.
- **Risk Level**: Low-Medium (incremental, with a behavioural test suite as the safety net)

## Testing Strategy (CRITICAL PRE-RESTRUCTURING)

### Testing Philosophy
**CRITICAL**: Tests must define expected behavior and reveal bugs - NOT be modified to pass

#### Core Testing Principles
1. **Specification-Based Testing**: Write tests based on requirements and expected behavior, not current implementation
2. **Let Tests Fail**: If tests fail, they reveal bugs in the codebase that need fixing
3. **Tests as Documentation**: Tests serve as the source of truth for what code should do
4. **No Test Modification**: Never change tests to make them pass - fix the code or document the issue
5. **Bug Discovery**: Failing tests are valuable - they identify problems before restructuring

#### Test-First Approach
- **Write tests based on interfaces and specifications**
- **Let failures reveal auth issues, Firebase config problems, or validation bugs**  
- **Document any failures as potential issues to investigate**
- **Use test failures to improve code quality before major refactoring**

### Current State
- **Testing Infrastructure**: Jest + React Testing Library, ~3,970 tests across ~180 suites
- **Coverage**: ~89% statements / ~90% lines / ~86% functions / ~81% branches, with a CI floor in `jest.config.ts`
- **Baseline**: the documented-bug-marker failures. Check `docs/testing/results/pre-migration-baseline.md` and the latest migration doc for the current number before treating any red test as a regression.
- **Firebase Testing**: Emulator integration available but underutilized

#### A failing test is not automatically a bug
Three of the catalogued "bugs" (#013, #014, #300) turned out to be a missing `crypto.randomUUID` in
JSDOM: the tests aborted on the environment error *before reaching any assertion*, so the behaviour
they described was never exercised. They sat in the tracker for a year as deferred architectural
work. When triaging a red test, first establish that it actually executed the code it names — a test
that dies on an environment error is indistinguishable, in a failure count, from one that found a
real defect.

### Required Before Restructuring
1. **Context Layer Testing**: All Firebase contexts (NPC, Quest, Location, Rumor, Story, Note)
2. **Cross-Feature Relationships**: Entity relationship integrity and cascading updates
3. **Critical User Workflows**: End-to-end campaign creation, note-taking, entity extraction
4. **Data Integrity**: Referential consistency, concurrent modifications, error handling
5. **Performance Testing**: Large dataset handling, search functionality, load times

### Testing Priorities (See docs/backlog/test-design-strategy.md)
- **Priority 1**: Campaign entity CRUD operations and relationships
- **Priority 2**: Note-taking and AI entity extraction workflows  
- **Priority 3**: User management and group system functionality
- **Priority 4**: Known issues from todo list (StoryContext errors, admin panel issues)
- **Priority 5**: Performance and scalability edge cases

### Implementation Timeline
- **Week 1**: Foundation and core context testing
- **Week 2**: Cross-feature relationships and integration tests
- **Week 3**: Workflows, edge cases, and performance testing
- **Success Criteria**: 90%+ context coverage, 100% relationship coverage, all critical paths tested

## Technology Stack

### Current Core Stack
- **Frontend**: React 18.2.0 with TypeScript, TailwindCSS with custom theme system
- **Backend**: Firebase (Auth, Firestore, Functions, Hosting, Analytics)
- **AI Integration**: OpenAI (GPT-3.5-turbo/GPT-4) for entity extraction with usage tracking
- **Development**: Jest + React Testing Library, ESLint, PowerShell automation scripts
- **Icons**: Lucide React (91+ usages throughout application)

### Planned Advanced Features (Roadmap - See docs/backlog/deep-dive-feature-enhancements.md)

#### Rich Content & Editing
- **TipTap Editor**: Replace basic textareas with collaborative rich text editing
- **D&D Extensions**: Entity mentions (@NPC_NAME), dice rolling (/roll 1d20+5), stat blocks
- **Real-time Collaboration**: Yjs + WebSocket for live collaborative editing

#### Data Visualization & Analytics  
- **React Flow**: Interactive entity relationship networks and campaign mapping
- **D3.js**: Campaign analytics dashboard, character interaction heatmaps
- **React Chrono**: Campaign timeline and session chronology visualization
- **Leaflet**: Interactive world maps with location markers and quest routes

#### Enhanced Search & Discovery
- **Algolia**: Intelligent multi-index search across all campaign entities
- **Semantic Search**: AI-powered content discovery and plot consistency analysis
- **Advanced Filtering**: Cross-entity search with relevance ranking

#### Third-Party Integrations (See docs/backlog/third-party-integration-analysis.md)
- **D&D 5e SRD API**: Official spells, monsters, equipment integration
- **Discord API**: Campaign coordination via webhooks and bot commands  
- **Enhanced AI Services**: Multiple AI models for diverse content generation
- **Analytics**: Sentry (error tracking), Mixpanel (user behavior), GA4 (journeys)

### Integration Architecture Pattern
- **Service Classes**: All integrations extend BaseFirebaseService singleton pattern
- **React Hooks**: Consistent loading/error state management (useIntegration pattern)
- **Context Providers**: Hierarchical state management with dependency injection
- **Environment Awareness**: Seamless dev/prod configuration with emulator support

## Development Workflow (UPDATED)

### Pre-Development Requirements
1. **Review Architecture Docs**: Study `docs/backlog/` before starting new features
2. **Check Migration Status**: Verify which domains have been migrated in restructuring strategy
3. **Run Test Suite**: Ensure all tests pass before making changes
4. **Validate Environment**: Confirm Firebase emulators and dependencies are working

### Feature Development Process (CURRENT STRUCTURE)
1. **Impact Assessment**: Determine if feature should wait for post-restructuring implementation
2. **Context Integration**: Use existing context providers and service classes
3. **Component Organization**: Follow current directory structure (components/features/)
4. **Cross-Feature Dependencies**: Document any dependencies for restructuring consideration
5. **Testing Requirements**: Add tests for new business logic (prepare for restructuring)

### Feature Development Process (POST-RESTRUCTURING)
1. **Domain Assignment**: Determine which feature domain your change belongs to
2. **Public API Design**: Plan how your feature will expose functionality via index.ts
3. **Import Restrictions**: Use shared/ and core/ only - never direct feature imports
4. **Service Pattern**: Extend BaseFirebaseService for new integrations
5. **Testing Requirements**: Comprehensive test coverage for all business logic

### Integration Development Guidelines
1. **Service Architecture**: Follow BaseFirebaseService extension pattern
2. **Environment Configuration**: Support both development and production setups
3. **Error Handling**: Implement circuit breakers and graceful degradation
4. **Rate Limiting**: Respect third-party API limits and implement usage tracking
5. **Security**: Never expose API keys in frontend code - use Firebase Functions

### Emergency Fixes During Migration
- **Small Fixes**: Can be applied to current structure with caution
- **Large Features**: Should wait for post-restructuring implementation
- **Bug Fixes**: Prioritize fixing in current structure, plan migration
- **Critical Issues**: May require temporary workarounds during migration phases