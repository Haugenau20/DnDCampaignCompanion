import React from "react";
import { render, waitFor } from "@testing-library/react";

/**
 * One fetch per collection, per provider.
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
const mockCreateDocument = jest.fn();
const mockUpdateDocumentWithAttribution = jest.fn();
const mockDeleteDocument = jest.fn();
const mockGetDocument = jest.fn();

jest.mock("@/features/user-management", () => ({
  AUTH_STATE_CHANGED_EVENT: "auth-state-changed",
  useFirestore: () => ({
    getCollection: mockGetCollection,
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

describe("provider fetch counts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCollection.mockResolvedValue([]);
  });

  test.each([
    ["npcs", NPCProvider],
    ["quests", QuestProvider],
    ["locations", LocationProvider],
    ["rumors", RumorProvider],
  ])("%s is fetched once when its provider mounts", async (collection, Provider) => {
    render(
      <Provider>
        <div>child</div>
      </Provider>
    );

    await waitFor(() => {
      expect(fetchCountFor(collection)).toBeGreaterThan(0);
    });

    expect(fetchCountFor(collection)).toBe(1);
  });

  test("StoryProvider fetches chapters once, and story-progress once", async () => {
    render(
      <StoryProvider>
        <div>child</div>
      </StoryProvider>
    );

    await waitFor(() => {
      expect(fetchCountFor("chapters")).toBeGreaterThan(0);
    });

    expect(fetchCountFor("chapters")).toBe(1);
    // The story-progress instance is NOT write-only -- it reads its own `data`
    // as `progressData`. It must keep fetching. This assertion is the reason
    // the opt-out is per-call-site rather than a change of default.
    expect(fetchCountFor("story-progress")).toBe(1);
  });
});
