import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * One collection read per write (PERF-06).
 *
 * The page suites mock the providers, so they can only say that a page did not
 * call a mocked `refresh`. This one mounts the real providers over a counted
 * Firestore and asserts what reaches it: one stance change or one quest edit
 * is one write and one re-read of the collection, not two.
 *
 * It does not mock `useFirebaseData`, for the reason
 * `shared/hooks/__tests__/provider-fetch-counts.test.tsx` gives.
 */

const mockGetCollection = jest.fn();
const mockCreateDocument = jest.fn();
const mockUpdateDocumentWithAttribution = jest.fn();
const mockDeleteDocument = jest.fn();
const mockGetDocument = jest.fn();

// The hooks return the SAME objects on every render, as the real ones do:
// several effects depend on `user` and `userProfile`, and a fresh literal per
// call would re-run them forever.
const mockFirestore = {
  getCollection: mockGetCollection,
  createDocument: mockCreateDocument,
  updateDocumentWithAttribution: mockUpdateDocumentWithAttribution,
  deleteDocument: mockDeleteDocument,
  getDocument: mockGetDocument,
};
const mockAuth = { user: { uid: "user-1" }, loading: false };
const mockUserState = {
  userProfile: { uid: "user-1" },
  activeGroupUserProfile: { username: "tester" },
};
const mockGroupsState = {
  activeGroupId: "group-1",
  groups: [{ id: "group-1", name: "The Company" }],
  setActiveGroup: jest.fn(),
};
const mockCampaignsState = {
  activeCampaignId: "campaign-1",
  activeCampaign: { id: "campaign-1", name: "Wilderland" },
  setActiveCampaign: jest.fn(),
};

jest.mock("@/features/user-management", () => ({
  AUTH_STATE_CHANGED_EVENT: "auth-state-changed",
  useFirestore: () => mockFirestore,
  useAuth: () => mockAuth,
  useUser: () => mockUserState,
  useGroups: () => mockGroupsState,
  useCampaigns: () => mockCampaignsState,
  signInPathFor: () => "/signin",
}));

jest.mock("@/shared/hooks/useCampaignContextStatus", () => ({
  useCampaignContextStatus: () => ({
    isResolving: false,
    hasRequiredContext: true,
    missingContext: null,
  }),
}));

jest.mock("core/services/firebase", () => ({
  __esModule: true,
  default: { campaign: { getCampaigns: jest.fn().mockResolvedValue([]) } },
}));

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({
    navigateToPage: jest.fn(),
    createPath: (path: string) => path,
    getCurrentQueryParams: () => ({}),
  }),
}));

jest.mock("shared/context/QuickAddContext", () => ({
  useQuickAdd: () => ({ openQuickAdd: jest.fn(), closeQuickAdd: jest.fn(), openEntity: null }),
}));

jest.mock("features/collaboration", () => ({
  useNotes: () => ({ notes: [] }),
}));

jest.mock("shared/components/AttributionInfo", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("shared/utils/attribution-utils", () => ({
  determineAttributionActor: jest.fn(() => ""),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));

let mockQuestId = "reclaim-erebor";
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ questId: mockQuestId }),
}));

import { NPCProvider } from "@/features/campaign-entities/npcs/context/NPCContext";
import { QuestProvider } from "@/features/campaign-entities/quests/context/QuestContext";
import { LocationProvider } from "@/features/campaign-entities/locations/context/LocationContext";
import { RumorProvider } from "@/features/campaign-entities/rumors/context/RumorContext";
import NPCsPage from "../npcs/NPCsPage";
import QuestDetailPage from "../quests/QuestDetailPage";

const NPC_DOC = {
  id: "aldric",
  name: "Aldric",
  status: "alive",
  relationship: "neutral",
  notes: [],
};

const QUEST_DOC = {
  id: "reclaim-erebor",
  title: "Reclaim Erebor",
  description: "Find the secret door.",
  status: "active",
  objectives: [],
  leads: ["The door opens on Durin’s Day"],
  dateAdded: "2025-05-31T19:27:30.387Z",
};

/** How many times the given collection was fetched. */
const fetchCountFor = (collection: string) =>
  mockGetCollection.mock.calls.filter((call) => call[0] === collection).length;

/** Let the write and the refresh that follows it settle. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <LocationProvider>
      <RumorProvider>
        <NPCProvider>
          <QuestProvider>{children}</QuestProvider>
        </NPCProvider>
      </RumorProvider>
    </LocationProvider>
  </MemoryRouter>
);

describe("one collection read per write", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCollection.mockImplementation(async (collection: string) => {
      if (collection === "npcs") return [NPC_DOC];
      if (collection === "quests") return [QUEST_DOC];
      return [];
    });
    mockGetDocument.mockResolvedValue(null);
    mockUpdateDocumentWithAttribution.mockResolvedValue(undefined);
  });

  test("a stance change on /npcs re-reads the NPCs once", async () => {
    render(
      <Providers>
        <NPCsPage />
      </Providers>
    );
    fireEvent.click(await screen.findByRole("button", { name: /Expand Aldric/ }));
    const ladder = await screen.findByRole("group", { name: "Stance of Aldric" });
    await settle();
    const before = fetchCountFor("npcs");

    fireEvent.click(within(ladder).getByRole("button", { name: "Hostile" }));
    await waitFor(() => expect(mockUpdateDocumentWithAttribution).toHaveBeenCalled());
    await settle();

    expect(mockUpdateDocumentWithAttribution).toHaveBeenCalledTimes(1);
    expect(fetchCountFor("npcs") - before).toBe(1);
  });

  test("saving a quest field re-reads the quests once", async () => {
    render(
      <Providers>
        <QuestDetailPage />
      </Providers>
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /Add another lead/ })
    );
    fireEvent.change(screen.getByLabelText("Leads"), { target: { value: "Ask Balin" } });
    await settle();
    const before = fetchCountFor("quests");

    fireEvent.click(screen.getByRole("button", { name: "Add to leads" }));
    await waitFor(() => expect(mockUpdateDocumentWithAttribution).toHaveBeenCalled());
    await settle();

    expect(mockUpdateDocumentWithAttribution).toHaveBeenCalledTimes(1);
    expect(fetchCountFor("quests") - before).toBe(1);
  });
});
