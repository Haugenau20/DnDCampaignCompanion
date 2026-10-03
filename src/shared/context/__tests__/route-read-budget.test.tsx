// src/shared/context/__tests__/route-read-budget.test.tsx
import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * What a route that reads no campaign data costs (T032, `PERF-03`).
 *
 * Every data provider sits above the router (`app/App.tsx`), because quick add
 * and the header search need their write methods and lists from any route. So
 * mounting them used to mean reading every collection, the reader's story
 * progress and the usage callable on every signed-in page -- the privacy page
 * included. The budget from the plan: such a page reads no campaign
 * collection and calls no usage function. Opening the search is what reads
 * them, because searching needs them.
 *
 * The providers below are the real ones, nested as in `App.tsx`; only the
 * Firestore layer and the usage service are counted fakes.
 */

const mockSubscribeToCollection = jest.fn();
const mockGetDocument = jest.fn();
const mockGetCollection = jest.fn();
const mockFetchUsageStatus = jest.fn();

/** Every listener opened, notes' included, by path. */
const listened = () => [
  ...mockSubscribeToCollection.mock.calls.map((call) => call[0] as string),
];

jest.mock("@/features/user-management", () => ({
  AUTH_STATE_CHANGED_EVENT: "auth-state-changed",
  useFirestore: () => mockFirestore,
  useAuth: () => mockAuth,
  useUser: () => mockUserState,
  useGroups: () => mockGroupsState,
  useCampaigns: () => mockCampaignsState,
}));

// The hooks return the SAME objects on every render, as the real ones do.
const mockFirestore = {
  getCollection: mockGetCollection,
  subscribeToCollection: mockSubscribeToCollection,
  createDocument: jest.fn(),
  updateDocumentWithAttribution: jest.fn(),
  deleteDocument: jest.fn(),
  getDocument: mockGetDocument,
};
const mockAuth = { user: { uid: "user-1" }, loading: false };
const mockUserState = { userProfile: { uid: "user-1" }, activeGroupUserProfile: { username: "tester" } };
const mockGroupsState = { activeGroupId: "group-1" };
const mockCampaignsState = { activeCampaignId: "campaign-1" };

jest.mock("@/shared/hooks/useCampaignContextStatus", () => ({
  useCampaignContextStatus: () => ({ isResolving: false, hasRequiredContext: true, missingContext: null }),
}));

// NoteProvider listens through DocumentService directly. One instance, as
// the real singleton is: the provider lists it as an effect dependency.
const mockDocumentService = {
  subscribeToCollection: (...args: unknown[]) => mockSubscribeToCollection(...args),
};
jest.mock("core/services/firebase/data/DocumentService", () => ({
  __esModule: true,
  default: { getInstance: () => mockDocumentService },
}));

jest.mock("features/collaboration/entity-extraction/services/EntityExtractionService", () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      fetchUsageStatus: mockFetchUsageStatus,
      clearUsageCache: jest.fn(),
    }),
  },
}));

import { NPCProvider } from "@/features/campaign-entities/npcs/context/NPCContext";
import { LocationProvider } from "@/features/campaign-entities/locations/context/LocationContext";
import { StoryProvider } from "@/features/storytelling/chapters/context/StoryContext";
import { RumorProvider } from "@/features/campaign-entities/rumors/context/RumorContext";
import { QuestProvider } from "@/features/campaign-entities/quests/context/QuestContext";
import { NoteProvider } from "@/features/collaboration/notes/context/NoteContext";
import { UsageProvider } from "@/features/collaboration/entity-extraction/context/UsageContext";
import { SearchProvider } from "@/shared/context/SearchContext";
import { useSearch } from "@/shared/hooks/useSearch";

/** The data providers, nested as `App.tsx` nests them. */
const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <NPCProvider>
      <LocationProvider>
        <StoryProvider>
          <RumorProvider>
            <QuestProvider>
              <NoteProvider>
                <UsageProvider>
                  <SearchProvider>{children}</SearchProvider>
                </UsageProvider>
              </NoteProvider>
            </QuestProvider>
          </RumorProvider>
        </StoryProvider>
      </LocationProvider>
    </NPCProvider>
  </MemoryRouter>
);

/** The header's search, closed or open. Always mounted, as the palette is. */
const HeaderSearch: React.FC<{ open: boolean }> = ({ open }) => {
  useSearch({ active: open });
  return null;
};

/** Let mount effects and first snapshots settle. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscribeToCollection.mockImplementation((_path: string, onNext: (d: unknown[]) => void) => {
    Promise.resolve().then(() => onNext([]));
    return jest.fn();
  });
  mockGetDocument.mockResolvedValue(null);
  mockGetCollection.mockResolvedValue([]);
  mockFetchUsageStatus.mockResolvedValue(null);
});

test("a page that reads no campaign data opens no listener and calls no usage function", async () => {
  render(
    <Providers>
      <HeaderSearch open={false} />
      <main>Privacy</main>
    </Providers>
  );
  await settle();

  expect(listened()).toEqual([]);
  expect(mockGetCollection).not.toHaveBeenCalled();
  expect(mockGetDocument).not.toHaveBeenCalled();
  expect(mockFetchUsageStatus).not.toHaveBeenCalled();
});

test("opening the search opens one listener per collection it searches", async () => {
  const { rerender } = render(
    <Providers>
      <HeaderSearch open={false} />
    </Providers>
  );
  await settle();

  rerender(
    <Providers>
      <HeaderSearch open />
    </Providers>
  );

  await waitFor(() =>
    expect([...listened()].sort()).toEqual([
      "groups/group-1/campaigns/campaign-1/chapters",
      "groups/group-1/campaigns/campaign-1/locations",
      "groups/group-1/campaigns/campaign-1/npcs",
      "groups/group-1/campaigns/campaign-1/quests",
      "groups/group-1/campaigns/campaign-1/rumors",
      "groups/group-1/users/user-1/notes",
    ])
  );
  expect(mockGetCollection).not.toHaveBeenCalled();
  expect(mockFetchUsageStatus).not.toHaveBeenCalled();
});
