import React from "react";
import { render, waitFor } from "@testing-library/react";

/**
 * One listener per collection, per provider, and no fetch at all.
 *
 * Since T032 the read hooks listen (`onSnapshot`) instead of fetching, so the
 * budget is stricter than it was: mounting a provider opens exactly one
 * listener on its campaign's collection and performs no collection read.
 *
 * Each entity context mounts two `useFirebaseData` instances: one for reads,
 * one for writes (the write instance's `error` is bound separately as
 * `writeError`, which is deliberate -- bug #1401 -- and must stay). For a long
 * time the write instance also fetched the whole collection, so every provider
 * issued two identical reads of data only one of them rendered.
 *
 * This suite is the regression pin for that. It deliberately does NOT mock
 * `useFirebaseData` -- the suites that do cannot see a fetch at all -- so it
 * counts what actually reaches Firestore.
 */

const mockGetCollection = jest.fn();
const mockSubscribeToCollection = jest.fn();
const mockCreateDocument = jest.fn();
const mockUpdateDocumentWithAttribution = jest.fn();
const mockDeleteDocument = jest.fn();
const mockGetDocument = jest.fn();

jest.mock("@/features/user-management", () => ({
  AUTH_STATE_CHANGED_EVENT: "auth-state-changed",
  useFirestore: () => ({
    getCollection: mockGetCollection,
    subscribeToCollection: mockSubscribeToCollection,
    createDocument: mockCreateDocument,
    updateDocumentWithAttribution: mockUpdateDocumentWithAttribution,
    deleteDocument: mockDeleteDocument,
    getDocument: mockGetDocument,
  }),
  useAuth: () => ({ user: { uid: "user-1" } }),
  useUser: () => ({
    userProfile: { uid: "user-1" },
    activeGroupUserProfile: { username: "tester" },
  }),
  useGroups: () => ({ activeGroupId: "group-1" }),
  useCampaigns: () => ({ activeCampaignId: "campaign-1" }),
}));

jest.mock("@/shared/hooks/useCampaignContextStatus", () => ({
  useCampaignContextStatus: () => ({
    isResolving: false,
    hasRequiredContext: true,
    missingContext: null,
  }),
}));

import { NPCProvider } from "@/features/campaign-entities/npcs/context/NPCContext";
import { QuestProvider } from "@/features/campaign-entities/quests/context/QuestContext";
import { LocationProvider } from "@/features/campaign-entities/locations/context/LocationContext";
import { RumorProvider } from "@/features/campaign-entities/rumors/context/RumorContext";
import { StoryProvider } from "@/features/storytelling/chapters/context/StoryContext";

/** How many times the given collection was fetched. */
const fetchCountFor = (collection: string) =>
  mockGetCollection.mock.calls.filter(call => call[0] === collection).length;

/** The paths of every listener opened. */
const listenedPaths = () => mockSubscribeToCollection.mock.calls.map(call => call[0]);

describe("provider fetch counts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCollection.mockResolvedValue([]);
    mockGetDocument.mockResolvedValue(null);
    // An empty collection, delivered as Firestore does: asynchronously.
    mockSubscribeToCollection.mockImplementation((_path, onNext) => {
      Promise.resolve().then(() => onNext([]));
      return jest.fn();
    });
  });

  test.each([
    ["npcs", NPCProvider],
    ["quests", QuestProvider],
    ["locations", LocationProvider],
    ["rumors", RumorProvider],
  ])("%s gets one listener and no fetch when its provider mounts", async (collection, Provider) => {
    render(
      <Provider>
        <div>child</div>
      </Provider>
    );

    await waitFor(() => {
      expect(listenedPaths()).toEqual([`groups/group-1/campaigns/campaign-1/${collection}`]);
    });

    expect(fetchCountFor(collection)).toBe(0);
  });

  test("StoryProvider listens to chapters once, and reads the reader's progress once", async () => {
    render(
      <StoryProvider>
        <div>child</div>
      </StoryProvider>
    );

    await waitFor(() => {
      expect(listenedPaths()).toEqual(["groups/group-1/campaigns/campaign-1/chapters"]);
    });

    expect(fetchCountFor("chapters")).toBe(0);
    // Reading progress is the reader's own document (T073), read by id rather
    // than through a collection instance -- and still read exactly once.
    await waitFor(() => expect(mockGetDocument).toHaveBeenCalled());
    expect(mockGetDocument.mock.calls).toEqual([
      ["groups/group-1/users/user-1/story-progress", "campaign-1"],
    ]);
    expect(fetchCountFor("story-progress")).toBe(0);
  });
});
