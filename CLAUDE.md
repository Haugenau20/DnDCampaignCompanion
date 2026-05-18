# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚧 ARCHITECTURE EVOLUTION IN PROGRESS

**IMPORTANT**: This codebase is planned for major restructuring. Before starting new development:

1. **Review Backlog**: `docs/backlog/` contains comprehensive transformation plans
2. **Current State**: Functional/technical architecture (components/, context/, services/)  
3. **Target State**: Feature-first domains (campaign-entities/, storytelling/, collaboration/, user-management/)
4. **Testing First**: All business logic must be tested before restructuring begins (see `docs/backlog/testing-before-restructuring-guide.md`)
5. **Migration Status**: Track progress in `docs/backlog/hybrid-feature-first-restructuring-strategy.md`

**For New Features**: Consider whether to implement in current structure (if urgent) or wait for post-restructuring (if possible). Complex features should align with planned domain boundaries.

**Key Documents**:
- `docs/backlog/codebase-restructuring-analysis.md` - Architecture analysis and recommendations
- `docs/backlog/hybrid-feature-first-restructuring-strategy.md` - Step-by-step migration plan
- `docs/backlog/deep-dive-feature-enhancements.md` - Advanced feature roadmap
- `docs/backlog/third-party-integration-analysis.md` - Integration opportunities

## Build Commands

### Current Environment Management
- Run development: `.\scripts\manage-environment.ps1 -Environment dev -Action start`
- Build production: `.\scripts\manage-environment.ps1 -Environment prod -Action start`
- Stop environments: `.\scripts\manage-environment.ps1 -Environment dev|prod -Action stop`
- Generate sample data: `.\scripts\manage-dev-data.ps1 -Action generate`
- View logs: `.\scripts\manage-environment.ps1 -Environment dev|prod -Action logs [-Service frontend|emulators]`

### Testing Commands (PLANNED - See testing-before-restructuring-guide.md)
- Run test suite: `npm test` (to be implemented)
- Run integration tests with Firebase emulators: `npm run test:integration` (planned)
- Run performance tests: `npm run test:performance` (planned)
- Test business logic coverage: `npm run test:coverage` (required pre-restructuring)

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
- **Import Restrictions**: Features can only import from shared/ and core/, never from other features
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
│   ├── collaboration/        # Notes, Sessions, Real-time features
│   └── user-management/      # Auth, Groups, Profiles
├── shared/                   # Cross-domain shared components, hooks, contexts
├── core/                     # Infrastructure: Firebase services, UI primitives, theme
├── pages/                    # Route definitions (thin orchestrators)
└── app/                      # App setup and root providers
```

### Dependency Rules (POST-RESTRUCTURING)
- `app/` → `features/`, `shared/`, `core/`
- `pages/` → `features/` (via public APIs), `shared/`, `core/`
- `features/` → `shared/`, `core/` (NOT other features)
- `shared/` → `core/`
- `core/` → (no internal dependencies)

### Migration Status
- **Phase**: Pre-restructuring (testing implementation required first)
- **Timeline**: 8-12 weeks estimated for complete migration
- **Risk Level**: Low-Medium (incremental approach with comprehensive testing)
- **Dependencies**: Complete business logic test coverage required before starting

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
- **Testing Infrastructure**: Basic Jest + React Testing Library setup
- **Coverage**: Minimal - needs comprehensive expansion before restructuring
- **Firebase Testing**: Emulator integration available but underutilized

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