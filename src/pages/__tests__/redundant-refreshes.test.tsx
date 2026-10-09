import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * No collection read after a write (PERF-06, T032).
 *
 * The page suites mock the providers, so they can only say that a page did not
 * call a mocked `refresh`. This one mounts the real providers over a counted
 * Firestore and asserts what reaches it: one stance change or one quest edit
 * is one write, and the change reaches the page through the listener that is
 * already open -- no re-read of the collection and no second listener.
 *
 * The fake listeners below re-emit a collection whenever a write touches it,
 * which is what the SDK's latency compensation does before the write's promise
 * resolves.
 *
 * It does not mock `useFirebaseData`, for the reason
 * `shared/hooks/__tests__/provider-fetch-counts.test.tsx` gives.
 */

const mockGetCollection = jest.fn();
const mockSubscribeToCollection = jest.fn();
const mockCreateDocument = jest.fn();
const mockUpdateDocumentWithAttribution = jest.fn();
const mockUpdateDocumentAfterReading = jest.fn();
const mockDeleteDocument = jest.fn();
const mockGetDocument = jest.fn();

// The hooks return the SAME objects on every render, as the real ones do:
// several effects depend on `user` and `userProfile`, and a fresh literal per
// call would re-run them forever.
const mockFirestore = {
  getCollection: mockGetCollection,
  subscribeToCollection: mockSubscribeToCollection,
  createDocument: mockCreateDocument,
  updateDocumentWithAttribution: mockUpdateDocumentWithAttribution,
  updateDocumentAfterReading: mockUpdateDocumentAfterReading,
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

// Notes are documents of their own (T133); see the mock.
jest.mock('features/campaign-entities/shared/recordNotes', () => require('@/test-utils/record-notes-mock').recordNotesMock());

jest.mock("@/features/user-management", () => ({
  AUTH_STATE_CHANGED_EVENT: "auth-state-changed",
  useFirestore: () => mockFirestore,
  useAuth: () => mockAuth,
  useUser: () => mockUserState,
  useGroups: () => mockGroupsState,
  useCampaigns: () => mockCampaignsState,
  // The NPC row names its author through `useCreatorName` (T124).
  useFirebase: () => mockGroupsState,
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

import { NPCProvider, useNPCs } from "@/features/campaign-entities/npcs/context/NPCContext";
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

/** How many listeners were opened on the given collection. */
const listenerCountFor = (collection: string) =>
  mockSubscribeToCollection.mock.calls.filter((call) => call[0].endsWith(`/${collection}`)).length;

/** The fake database: collection name to its documents. */
let store: Record<string, Array<Record<string, any>>>;
/** Open listeners, by collection name. */
let listeners: Record<string, Array<(documents: unknown[]) => void>>;

/**
 * The collection a path names: its last segment. Writes pass the full path
 * (`groups/g/campaigns/c/npcs`, T082) as the listeners already do.
 */
const nameOf = (path: string) => path.split("/").pop() as string;

/** Delivers a collection's current documents to everyone listening to it. */
const emit = (collection: string) => {
  (listeners[collection] ?? []).forEach((onNext) => onNext([...(store[collection] ?? [])]));
};

/** Let the write and the refresh that follows it settle. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

/** Lists the provider's NPCs, and deletes one -- the provider, not a page. */
const NPCRoster: React.FC = () => {
  const { npcs, deleteNPC } = useNPCs();
  return (
    <div>
      <ul aria-label="NPCs">
        {npcs.map((npc) => (
          <li key={npc.id}>{npc.name}</li>
        ))}
      </ul>
      <button onClick={() => void deleteNPC("aldric")}>Delete Aldric</button>
    </div>
  );
};

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

describe("no collection read after a write", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store = { npcs: [NPC_DOC], quests: [QUEST_DOC] };
    listeners = {};
    mockGetCollection.mockImplementation(async (collection: string) => store[collection] ?? []);
    mockSubscribeToCollection.mockImplementation((path: string, onNext: (d: unknown[]) => void) => {
      const collection = path.split("/").pop() as string;
      (listeners[collection] ??= []).push(onNext);
      Promise.resolve().then(() => onNext([...(store[collection] ?? [])]));
      return () => {
        listeners[collection] = listeners[collection].filter((l) => l !== onNext);
      };
    });
    mockGetDocument.mockResolvedValue(null);
    mockUpdateDocumentWithAttribution.mockImplementation(
      async (path: string, id: string, data: Record<string, any>) => {
        const collection = nameOf(path);
        store[collection] = (store[collection] ?? []).map((d) => (d.id === id ? { ...d, ...data } : d));
        emit(collection);
      }
    );
    // A transaction reads the one document it changes -- by id, never the
    // collection -- then writes like the update above (T083).
    mockUpdateDocumentAfterReading.mockImplementation(
      async (path: string, id: string, decide: (read: (otherId: string) => Promise<any>) => Promise<any>) => {
        const collection = nameOf(path);
        const read = async (otherId: string) => (store[collection] ?? []).find((d) => d.id === otherId);
        const data = await decide(read);
        store[collection] = (store[collection] ?? []).map((d) => (d.id === id ? { ...d, ...data } : d));
        emit(collection);
      }
    );
  });

  test("a stance change on /npcs re-reads nothing and still shows", async () => {
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
    expect(fetchCountFor("npcs") - before).toBe(0);
    expect(listenerCountFor("npcs")).toBe(1);
    expect(
      within(screen.getByRole("group", { name: "Stance of Aldric" }))
        .getByRole("button", { name: "Hostile" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("saving a quest field re-reads nothing and still shows", async () => {
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
    // A lead is added to the list the server holds, so the one write is a
    // transaction that reads that one quest (T083) -- still no collection read.
    await waitFor(() => expect(mockUpdateDocumentAfterReading).toHaveBeenCalled());
    await settle();

    expect(mockUpdateDocumentAfterReading).toHaveBeenCalledTimes(1);
    expect(mockUpdateDocumentWithAttribution).not.toHaveBeenCalled();
    expect(fetchCountFor("quests") - before).toBe(0);
    expect(listenerCountFor("quests")).toBe(1);
    expect(await screen.findByText("Ask Balin")).toBeInTheDocument();
  });

  test("deleting the only NPC empties the list, with no re-read", async () => {
    // The list used to ignore an empty snapshot and rely on a re-read to clear
    // it; with the re-reads gone, the last record would have stayed on screen.
    mockDeleteDocument.mockImplementation(async (path: string, id: string) => {
      const collection = nameOf(path);
      store[collection] = (store[collection] ?? []).filter((d) => d.id !== id);
      emit(collection);
    });
    render(
      <Providers>
        <NPCRoster />
      </Providers>
    );
    expect(await screen.findByText("Aldric")).toBeInTheDocument();
    await settle();
    const before = fetchCountFor("npcs");

    fireEvent.click(screen.getByRole("button", { name: "Delete Aldric" }));
    await waitFor(() => expect(mockDeleteDocument).toHaveBeenCalledWith("groups/group-1/campaigns/campaign-1/npcs", "aldric"));
    await settle();

    expect(screen.queryByText("Aldric")).not.toBeInTheDocument();
    expect(fetchCountFor("npcs") - before).toBe(0);
  });

  test("another player's edit reaches the page without a read", async () => {
    render(
      <Providers>
        <NPCRoster />
      </Providers>
    );
    expect(await screen.findByText("Aldric")).toBeInTheDocument();
    await settle();
    const before = fetchCountFor("npcs");

    // Written elsewhere: only the listener hears about it.
    store.npcs = [{ ...NPC_DOC, name: "Aldric the Grey" }];
    act(() => emit("npcs"));

    expect(await screen.findByText("Aldric the Grey")).toBeInTheDocument();
    expect(fetchCountFor("npcs") - before).toBe(0);
  });
});
