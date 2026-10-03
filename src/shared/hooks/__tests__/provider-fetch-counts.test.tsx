import React from "react";
import { render, waitFor, act } from "@testing-library/react";

/**
 * One listener per collection, per provider, only while something reads it,
 * and no fetch at all.
 *
 * Since T032 the read hooks listen (`onSnapshot`) instead of fetching, so the
 * budget is stricter than it was: a provider whose list is read opens exactly
 * one listener on its campaign's collection and performs no collection read.
 * And since `PERF-03`, a provider whose list nobody reads opens nothing --
 * the providers sit above the router, so "mounted" means "every route".
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
import { useNPCs } from "@/features/campaign-entities/npcs/context/NPCContext";
import { useQuests } from "@/features/campaign-entities/quests/context/QuestContext";
import { useLocations } from "@/features/campaign-entities/locations/context/LocationContext";
import { useRumors } from "@/features/campaign-entities/rumors/context/RumorContext";
import { StoryProvider, useStory } from "@/features/storytelling/chapters/context/StoryContext";
import { LISTENER_LINGER_MS } from "@/shared/hooks/useListenerDemand";

/** Components that read each provider's list, as a page does. */
const readers = {
  npcs: () => { useNPCs(); return null; },
  quests: () => { useQuests(); return null; },
  locations: () => { useLocations(); return null; },
  rumors: () => { useRumors(); return null; },
} as const;

/** A component that only writes: it holds nothing open. */
const RumorWriter = () => { useRumors({ subscribe: false }); return null; };

/** Reads the story, as a story page does. */
const StoryReader = () => { useStory(); return null; };

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
  ] as const)("%s gets one listener and no fetch when its list is read, by two readers at once", async (collection, Provider) => {
    const Reader = readers[collection];
    render(
      <Provider>
        <Reader />
        <Reader />
      </Provider>
    );

    await waitFor(() => {
      expect(listenedPaths()).toEqual([`groups/group-1/campaigns/campaign-1/${collection}`]);
    });

    expect(fetchCountFor(collection)).toBe(0);
  });

  test.each([
    ["npcs", NPCProvider],
    ["quests", QuestProvider],
    ["locations", LocationProvider],
    ["rumors", RumorProvider],
  ] as const)("%s opens nothing while nothing reads its list (PERF-03)", async (_collection, Provider) => {
    render(
      <Provider>
        <div>child</div>
      </Provider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(listenedPaths()).toEqual([]);
  });

  test("a caller that only writes holds nothing open", async () => {
    render(
      <RumorProvider>
        <RumorWriter />
      </RumorProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(listenedPaths()).toEqual([]);
  });

  test("the listener outlives its last reader for the linger, then closes", async () => {
    jest.useFakeTimers();
    try {
      const unsubscribe = jest.fn();
      mockSubscribeToCollection.mockImplementation(() => unsubscribe);
      const Reader = readers.npcs;
      const { rerender } = render(
        <NPCProvider>
          <Reader />
        </NPCProvider>
      );
      expect(listenedPaths()).toHaveLength(1);

      // The reader leaves -- a page change.
      rerender(<NPCProvider><div /></NPCProvider>);
      act(() => {
        jest.advanceTimersByTime(LISTENER_LINGER_MS - 1);
      });
      expect(unsubscribe).not.toHaveBeenCalled();

      // Back within the linger: the same listener, not a second read.
      rerender(<NPCProvider><Reader /></NPCProvider>);
      rerender(<NPCProvider><div /></NPCProvider>);
      act(() => {
        jest.advanceTimersByTime(LISTENER_LINGER_MS);
      });
      expect(listenedPaths()).toHaveLength(1);
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test("StoryProvider reads nothing while nothing reads the story (PERF-03)", async () => {
    render(
      <StoryProvider>
        <div>child</div>
      </StoryProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(listenedPaths()).toEqual([]);
    expect(mockGetDocument).not.toHaveBeenCalled();
  });

  test("StoryProvider listens to chapters once, and reads the reader's progress once", async () => {
    render(
      <StoryProvider>
        <StoryReader />
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
