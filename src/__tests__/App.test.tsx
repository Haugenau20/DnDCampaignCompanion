// src/__tests__/App.test.tsx
// Behavioral tests for App.tsx — verifies provider composition and route table.
// All real providers and page components are stubbed so this test focuses solely
// on the wiring in App.tsx itself.

import React from "react";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock react-router-dom
// We capture every <Route path="…"> declaration so we can assert the route table.
// ---------------------------------------------------------------------------
const capturedRoutes: string[] = [];

jest.mock("react-router-dom", () => {
  const Routes = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="routes">{children}</div>
  );
  const Route = ({ path, element }: { path: string; element: React.ReactNode }) => {
    // Capture path at definition time (module-scope array, reset per test)
    capturedRoutes.push(path);
    return <div data-testid={`route-${path.replace(/\//g, "_").replace(/^_/, "").replace(/:/g, "")}`}>{element}</div>;
  };
  return { Routes, Route };
});

// ---------------------------------------------------------------------------
// Mock all context providers
// Each stub renders children and exposes a data-testid so we can assert
// the provider is present in the tree.
// ---------------------------------------------------------------------------
jest.mock("../context/NavigationContext", () => ({
  NavigationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="navigation-provider">{children}</div>
  ),
  useNavigation: () => ({}),
}));

jest.mock("../context/SearchContext", () => ({
  SearchProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="search-provider">{children}</div>
  ),
  useSearch: () => ({}),
}));

jest.mock("../context/NPCContext", () => ({
  NPCProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="npc-provider">{children}</div>
  ),
  useNPCs: () => ({}),
}));

jest.mock("features/storytelling", () => ({
  StoryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="story-provider">{children}</div>
  ),
  useStory: () => ({}),
}));

jest.mock("../context/LocationContext", () => ({
  LocationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="location-provider">{children}</div>
  ),
  useLocations: () => ({}),
}));

jest.mock("@/features/user-management/auth/context/FirebaseContext", () => ({
  FirebaseProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="firebase-provider">{children}</div>
  ),
  useFirebase: () => ({}),
  AUTH_STATE_CHANGED_EVENT: "auth-state-changed",
}));

jest.mock("../context/RumorContext", () => ({
  RumorProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="rumor-provider">{children}</div>
  ),
  useRumors: () => ({}),
}));

jest.mock("../context/QuestContext", () => ({
  QuestProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="quest-provider">{children}</div>
  ),
  useQuests: () => ({}),
}));

jest.mock("../context/NoteContext", () => ({
  NoteProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="note-provider">{children}</div>
  ),
  useNotes: () => ({}),
}));

jest.mock("../context/UsageContext", () => ({
  UsageProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="usage-provider">{children}</div>
  ),
  useUsage: () => ({}),
}));

// ---------------------------------------------------------------------------
// Mock non-provider components used inside App
// ---------------------------------------------------------------------------
jest.mock("../components/shared/ErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

jest.mock("../components/layout/Layout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

jest.mock("@/features/user-management/auth/components/SessionTimeoutWarning", () => ({
  __esModule: true,
  default: () => <div data-testid="session-timeout-warning" />,
}));

jest.mock("@/features/user-management/auth/components/SessionManager", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-manager">{children}</div>
  ),
}));

jest.mock("@/features/user-management/auth/components/PrivacyNotice", () => ({
  __esModule: true,
  default: () => <div data-testid="privacy-notice" />,
}));

// ---------------------------------------------------------------------------
// Mock all page components (barrel exports + direct imports)
// ---------------------------------------------------------------------------
jest.mock("../pages/HomePage", () => ({
  __esModule: true,
  default: () => <div data-testid="page-home" />,
}));

jest.mock("../pages/story", () => ({
  StorySelectionPage: () => <div data-testid="page-story-selection" />,
  StoryPage: () => <div data-testid="page-story" />,
  SagaPage: () => <div data-testid="page-saga" />,
  SagaEditPage: () => <div data-testid="page-saga-edit" />,
  ChaptersPage: () => <div data-testid="page-chapters" />,
  ChapterCreatePage: () => <div data-testid="page-chapter-create" />,
  ChapterEditPage: () => <div data-testid="page-chapter-edit" />,
}));

jest.mock("../pages/quests", () => ({
  QuestsPage: () => <div data-testid="page-quests" />,
  QuestCreatePage: () => <div data-testid="page-quest-create" />,
  QuestEditPage: () => <div data-testid="page-quest-edit" />,
}));

jest.mock("../pages/npcs", () => ({
  NPCsPage: () => <div data-testid="page-npcs" />,
  NPCsCreatePage: () => <div data-testid="page-npcs-create" />,
  NPCsEditPage: () => <div data-testid="page-npcs-edit" />,
}));

jest.mock("../pages/locations", () => ({
  LocationsPage: () => <div data-testid="page-locations" />,
  LocationCreatePage: () => <div data-testid="page-location-create" />,
  LocationEditPage: () => <div data-testid="page-location-edit" />,
}));

jest.mock("../pages/rumors", () => ({
  RumorsPage: () => <div data-testid="page-rumors" />,
  RumorCreatePage: () => <div data-testid="page-rumor-create" />,
  RumorEditPage: () => <div data-testid="page-rumor-edit" />,
}));

jest.mock("../pages/notes", () => ({
  NotesPage: () => <div data-testid="page-notes" />,
  NotePage: () => <div data-testid="page-note" />,
}));

jest.mock("../pages/PrivacyPolicyPage", () => ({
  __esModule: true,
  default: () => <div data-testid="page-privacy-policy" />,
}));

jest.mock("../pages/ContactPage", () => ({
  __esModule: true,
  default: () => <div data-testid="page-contact" />,
}));

// ---------------------------------------------------------------------------
// Import App after all mocks are registered
// ---------------------------------------------------------------------------
import App from "../App";

// ---------------------------------------------------------------------------
// Expected route paths declared in App.tsx
// ---------------------------------------------------------------------------
const EXPECTED_ROUTES = [
  "/",
  "/story",
  "/story/chapters",
  "/story/chapters/:chapterId",
  "/story/saga",
  "/story/saga/edit",
  "/story/chapters/create",
  "/story/chapters/edit/:chapterId",
  "/quests",
  "/quests/create",
  "/quests/edit/:questId",
  "/npcs",
  "/npcs/create",
  "/npcs/edit/:npcId",
  "/locations",
  "/locations/create",
  "/locations/edit/:locationId",
  "/rumors",
  "/rumors/create",
  "/rumors/edit/:rumorId",
  "/notes",
  "/notes/:noteId",
  "/privacy",
  "/contact",
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("App", () => {
  beforeEach(() => {
    // Reset captured routes before each test so individual test assertions
    // see only the routes from their own render.
    capturedRoutes.length = 0;
  });

  // -------------------------------------------------------------------------
  // Basic rendering
  // -------------------------------------------------------------------------
  describe("renders without crashing", () => {
    test("mounts without throwing", () => {
      const { container } = render(<App />);
      expect(container).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Provider composition — each provider must be present in the tree
  // -------------------------------------------------------------------------
  describe("provider composition", () => {
    test("renders ErrorBoundary as the outermost wrapper", () => {
      render(<App />);
      expect(screen.getByTestId("error-boundary")).toBeInTheDocument();
    });

    test("renders FirebaseProvider inside ErrorBoundary", () => {
      render(<App />);
      const errorBoundary = screen.getByTestId("error-boundary");
      const firebaseProvider = screen.getByTestId("firebase-provider");
      expect(errorBoundary).toContainElement(firebaseProvider);
    });

    test("renders SessionManager inside FirebaseProvider", () => {
      render(<App />);
      const firebaseProvider = screen.getByTestId("firebase-provider");
      const sessionManager = screen.getByTestId("session-manager");
      expect(firebaseProvider).toContainElement(sessionManager);
    });

    test("renders NavigationProvider inside SessionManager", () => {
      render(<App />);
      const sessionManager = screen.getByTestId("session-manager");
      const navigationProvider = screen.getByTestId("navigation-provider");
      expect(sessionManager).toContainElement(navigationProvider);
    });

    test("renders NPCProvider", () => {
      render(<App />);
      expect(screen.getByTestId("npc-provider")).toBeInTheDocument();
    });

    test("renders LocationProvider", () => {
      render(<App />);
      expect(screen.getByTestId("location-provider")).toBeInTheDocument();
    });

    test("renders StoryProvider", () => {
      render(<App />);
      expect(screen.getByTestId("story-provider")).toBeInTheDocument();
    });

    test("renders RumorProvider", () => {
      render(<App />);
      expect(screen.getByTestId("rumor-provider")).toBeInTheDocument();
    });

    test("renders QuestProvider", () => {
      render(<App />);
      expect(screen.getByTestId("quest-provider")).toBeInTheDocument();
    });

    test("renders NoteProvider", () => {
      render(<App />);
      expect(screen.getByTestId("note-provider")).toBeInTheDocument();
    });

    test("renders UsageProvider", () => {
      render(<App />);
      expect(screen.getByTestId("usage-provider")).toBeInTheDocument();
    });

    test("renders SearchProvider", () => {
      render(<App />);
      expect(screen.getByTestId("search-provider")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Provider nesting order
  // The outer providers must contain the inner ones (partial order checks).
  // -------------------------------------------------------------------------
  describe("provider nesting order", () => {
    test("NPCProvider is inside NavigationProvider", () => {
      render(<App />);
      expect(screen.getByTestId("navigation-provider")).toContainElement(
        screen.getByTestId("npc-provider")
      );
    });

    test("LocationProvider is inside NPCProvider", () => {
      render(<App />);
      expect(screen.getByTestId("npc-provider")).toContainElement(
        screen.getByTestId("location-provider")
      );
    });

    test("StoryProvider is inside LocationProvider", () => {
      render(<App />);
      expect(screen.getByTestId("location-provider")).toContainElement(
        screen.getByTestId("story-provider")
      );
    });

    test("RumorProvider is inside StoryProvider", () => {
      render(<App />);
      expect(screen.getByTestId("story-provider")).toContainElement(
        screen.getByTestId("rumor-provider")
      );
    });

    test("QuestProvider is inside RumorProvider", () => {
      render(<App />);
      expect(screen.getByTestId("rumor-provider")).toContainElement(
        screen.getByTestId("quest-provider")
      );
    });

    test("NoteProvider is inside QuestProvider", () => {
      render(<App />);
      expect(screen.getByTestId("quest-provider")).toContainElement(
        screen.getByTestId("note-provider")
      );
    });

    test("UsageProvider is inside NoteProvider", () => {
      render(<App />);
      expect(screen.getByTestId("note-provider")).toContainElement(
        screen.getByTestId("usage-provider")
      );
    });

    test("SearchProvider is inside UsageProvider", () => {
      render(<App />);
      expect(screen.getByTestId("usage-provider")).toContainElement(
        screen.getByTestId("search-provider")
      );
    });
  });

  // -------------------------------------------------------------------------
  // Layout and static UI
  // -------------------------------------------------------------------------
  describe("layout and static UI", () => {
    test("renders the Layout component", () => {
      render(<App />);
      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });

    test("renders SessionTimeoutWarning inside Layout", () => {
      render(<App />);
      expect(screen.getByTestId("session-timeout-warning")).toBeInTheDocument();
      expect(screen.getByTestId("layout")).toContainElement(
        screen.getByTestId("session-timeout-warning")
      );
    });

    test("renders PrivacyNotice inside Layout", () => {
      render(<App />);
      expect(screen.getByTestId("privacy-notice")).toBeInTheDocument();
      expect(screen.getByTestId("layout")).toContainElement(
        screen.getByTestId("privacy-notice")
      );
    });
  });

  // -------------------------------------------------------------------------
  // Route table — every expected path must be declared
  // -------------------------------------------------------------------------
  describe("route table", () => {
    test("renders a <Routes> container", () => {
      render(<App />);
      expect(screen.getByTestId("routes")).toBeInTheDocument();
    });

    test.each(EXPECTED_ROUTES)(
      "declares a route for path '%s'",
      (expectedPath) => {
        capturedRoutes.length = 0;
        render(<App />);
        expect(capturedRoutes).toContain(expectedPath);
      }
    );

    test(`declares exactly ${EXPECTED_ROUTES.length} routes`, () => {
      render(<App />);
      expect(capturedRoutes).toHaveLength(EXPECTED_ROUTES.length);
    });
  });
});
