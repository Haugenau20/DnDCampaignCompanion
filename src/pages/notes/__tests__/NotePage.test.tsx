// src/pages/notes/__tests__/NotePage.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotePage from "../NotePage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
let mockNoteId: string | undefined = "note-1";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ noteId: mockNoteId }),
}));

// ---------------------------------------------------------------------------
// Page-suite gate mock (shared across Tasks 8-13 -- see page-suite-mock.md),
// extended with `activeCampaign`/`campaigns` as separately settable fixtures:
// NotePage's cross-campaign lookup needs the full `campaigns` list (not just
// the active one), which the base block doesn't carry.
// ---------------------------------------------------------------------------
let mockUser: { uid: string } | null = { uid: "user-1" };
let mockIsResolving = false;
let mockActiveGroupId: string | null = "group-1";
let mockActiveCampaignId: string | null = "campaign-1";
let mockActiveCampaign: { id: string; name: string } | null = {
  id: "campaign-1",
  name: "The Fellowship",
};
let mockCampaignsList: Array<{ id: string; name: string }> = [
  { id: "campaign-1", name: "The Fellowship" },
];
let mockGroups: Array<{ id: string; name: string }> = [
  { id: "group-1", name: "The Fellowship" },
];

const mockSetActiveGroup = jest.fn().mockResolvedValue(undefined);
const mockSetActiveCampaign = jest.fn().mockResolvedValue(undefined);

jest.mock("features/user-management", () => ({
  useAuth: () => ({ user: mockUser, loading: mockIsResolving }),
  useGroups: () => ({
    activeGroupId: mockActiveGroupId,
    groups: mockGroups,
    setActiveGroup: mockSetActiveGroup,
  }),
  useCampaigns: () => ({
    activeCampaignId: mockActiveCampaignId,
    activeCampaign: mockActiveCampaign,
    campaigns: mockCampaignsList,
    setActiveCampaign: mockSetActiveCampaign,
  }),
  // `SignInForm` and `JoinGroupDialog` were stubbed here until 14.5 deleted
  // the dialogs. `GatedContent` now links to the routes instead, and needs
  // only the path builder.
  signInPathFor: () => "/signin",
}));

// useSelectableCampaigns fetches through this in the pick-campaign state.
jest.mock("core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: { getCampaigns: jest.fn().mockResolvedValue([]) },
  },
}));

const mockDeleteNote = jest.fn().mockResolvedValue(undefined);
const mockArchiveNote = jest.fn().mockResolvedValue(undefined);
const mockGetNoteById = jest.fn();
/** `useNotes().isLoading`: the active campaign's list is still on its way. */
let mockNotesLoading = false;
/** How many times an editor has mounted, to tell a fresh one from a reused one. */
let mockEditorMounts = 0;

const mockNavigateToPage = jest.fn();

jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    state: {},
  }),
}));

// ---------------------------------------------------------------------------
// DocumentService mock -- used for cross-campaign note fetching
// ---------------------------------------------------------------------------
const mockGetDocument = jest.fn().mockResolvedValue(null);

jest.mock("core/services/firebase/data/DocumentService", () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getDocument: mockGetDocument,
    }),
  },
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
// NoteEditor, CampaignLinksPanel, UsageMeter and useNotes all come from the
// collaboration domain barrel, so they are mocked together in a single factory.
jest.mock("features/collaboration", () => {
  const React = require("react");
  const NoteEditorMock = React.forwardRef((props: any, _ref: any) => {
    React.useEffect(() => { mockEditorMounts += 1; }, []);
    return (
    <div
      data-testid="note-editor"
      data-readonly={props.readOnly ? "true" : "false"}
      data-note-content={props.note?.content ?? ""}
    >
      {/* Exercises the wiring NotePage owns: back/archive/delete now live in
          the editor's own top bar (Tasks 11-12), and onSave still fires. */}
      <button onClick={props.onBack}>All notes</button>
      <button onClick={props.onArchive}>Archive</button>
      <button onClick={props.onDelete}>Delete</button>
      <button
        data-testid="note-editor-trigger-save"
        onClick={() => props.onSave && props.onSave()}
      >
        Trigger Save
      </button>
    </div>
    );
  });
  NoteEditorMock.displayName = "NoteEditor";

  const CampaignLinksPanelMock = (props: any) => (
    <div data-testid="campaign-links-panel" data-note-id={props.noteId}>
      {/* Expose triggers so tests can fire getCurrentEditorContent and saveCurrentEditorContent */}
      <button
        data-testid="campaign-links-get-content"
        onClick={() => props.getCurrentEditorContent && props.getCurrentEditorContent()}
      >
        Get Content
      </button>
      <button
        data-testid="campaign-links-save-content"
        onClick={async () => props.saveCurrentEditorContent && await props.saveCurrentEditorContent()}
      >
        Save Content
      </button>
    </div>
  );

  const UsageMeterMock = () => <div data-testid="usage-meter" />;

  return {
    __esModule: true,
    NoteEditor: NoteEditorMock,
    CampaignLinksPanel: CampaignLinksPanelMock,
    UsageMeter: UsageMeterMock,
    useNotes: () => ({
      deleteNote: mockDeleteNote,
      archiveNote: mockArchiveNote,
      getNoteById: mockGetNoteById,
      isLoading: mockNotesLoading,
    }),
  };
});

// ---------------------------------------------------------------------------
// Sample notes
// ---------------------------------------------------------------------------
const sampleNote = {
  id: "note-1",
  title: "Meeting with Gandalf",
  content: "He spoke of the One Ring",
  campaignId: "campaign-1",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-02",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(
    <MemoryRouter>
      <NotePage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NotePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNoteId = "note-1";
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockActiveCampaign = { id: "campaign-1", name: "The Fellowship" };
    mockCampaignsList = [{ id: "campaign-1", name: "The Fellowship" }];
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
    mockGetNoteById.mockReturnValue(sampleNote);
    mockGetDocument.mockResolvedValue(null);
    mockNotesLoading = false;
    mockEditorMounts = 0;
    mockDeleteNote.mockResolvedValue(undefined);
    mockArchiveNote.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Gated states (the standard tests every page suite adds -- Task 8 Step 1,
  // adapted: NotePage has no header action to hide, so the third standard
  // test is replaced with proof that the editor itself doesn't render).
  // -------------------------------------------------------------------------
  describe("gated states", () => {
    it("renders the note's own title as the page heading", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Meeting with Gandalf" })
      ).toBeInTheDocument();
    });

    it("asks a signed-out visitor to sign in, and never to select a group", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { name: /sign in to read your notes/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/select a group/i)).not.toBeInTheDocument();
    });

    it("does not render the note editor while signed out", () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByTestId("note-editor")).not.toBeInTheDocument();
    });

    it("shows a skeleton and no message while context is still resolving", () => {
      mockIsResolving = true;
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
      expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // No noteId
  // -------------------------------------------------------------------------
  describe("when noteId is undefined", () => {
    beforeEach(() => {
      mockNoteId = undefined;
    });

    it("renders 'Invalid note ID' error", () => {
      renderPage();
      expect(screen.getByText("Invalid note ID")).toBeInTheDocument();
    });

    it("does NOT render NoteEditor", () => {
      renderPage();
      expect(screen.queryByTestId("note-editor")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Note not found
  // -------------------------------------------------------------------------
  describe("when note is not found in current campaign context", () => {
    beforeEach(() => {
      mockGetNoteById.mockReturnValue(undefined);
      // DocumentService returns null (no cross-campaign note either)
      mockGetDocument.mockResolvedValue(null);
    });

    // Bug #800: NotePage infinite re-fetch loop when note is not found.
    // When getDocument resolves to null, no state update sets crossCampaignNote
    // to a sentinel "not found" value, so the useEffect dependency on
    // isLoadingCrossCampaignNote causes a re-fetch loop that prevents
    // the "Note Not Found" UI from ever rendering.
    it("renders 'Note Not Found' heading after loading completes", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Note Not Found")).toBeInTheDocument();
      });
    });

    // Bug #800: same root cause as above.
    it("renders 'Back to Notes' button in the not-found state", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Back to Notes")).toBeInTheDocument();
      });
    });

    it("does NOT render NoteEditor in the not-found state", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.queryByTestId("note-editor")).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Note found in current campaign
  // -------------------------------------------------------------------------
  describe("when note is found in the current campaign", () => {
    it("renders without crashing", async () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders NoteEditor for the correct note", async () => {
      renderPage();
      expect(screen.getByTestId("note-editor")).toBeInTheDocument();
    });

    it("renders the campaign links panel for same-campaign notes", () => {
      renderPage();
      expect(screen.getByTestId("campaign-links-panel")).toBeInTheDocument();
    });

    it("NoteEditor is not read-only for same-campaign notes", () => {
      renderPage();
      expect(screen.getByTestId("note-editor")).toHaveAttribute(
        "data-readonly",
        "false"
      );
    });

    it("leaves the editor to look its own note up, so writes go through the active campaign", () => {
      renderPage();
      expect(screen.getByTestId("note-editor")).toHaveAttribute("data-note-content", "");
    });

    it("getNoteById is called with the correct noteId", () => {
      renderPage();
      expect(mockGetNoteById).toHaveBeenCalledWith("note-1");
    });
  });

  // -------------------------------------------------------------------------
  // Cross-campaign note (different campaign)
  // -------------------------------------------------------------------------
  describe("when note belongs to a different campaign", () => {
    const crossCampaignNote = {
      id: "note-1",
      title: "Old Quest Note",
      content: "From another campaign",
      campaignId: "campaign-other",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
    };

    beforeEach(() => {
      mockGetNoteById.mockReturnValue(undefined);
      mockGetDocument.mockResolvedValue(crossCampaignNote);
      mockActiveCampaignId = "campaign-1";
      mockActiveCampaign = { id: "campaign-1", name: "The Fellowship" };
      mockCampaignsList = [
        { id: "campaign-1", name: "The Fellowship" },
        { id: "campaign-other", name: "Side Campaign" },
      ];
    });

    it("shows cross-campaign warning banner", async () => {
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText("Note from Different Campaign")
        ).toBeInTheDocument();
      });
    });

    it("makes NoteEditor read-only for cross-campaign notes", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId("note-editor")).toHaveAttribute(
          "data-readonly",
          "true"
        );
      });
    });

    it("hands the fetched note to the read-only editor, which cannot look it up (FUNC-001)", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId("note-editor")).toHaveAttribute(
          "data-note-content",
          "From another campaign"
        );
      });
    });

    it("does NOT render the campaign links panel for cross-campaign notes", async () => {
      renderPage();
      await waitFor(() => {
        expect(
          screen.queryByTestId("campaign-links-panel")
        ).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // T085 (RECOVERY-002): the direct read answers one question -- this user,
  // this note, under this campaign -- and its answer is used for no other.
  // -------------------------------------------------------------------------
  describe("a campaign switch on the same note", () => {
    const noteFrom = (campaignId: string) => ({
      ...sampleNote,
      title: `Note of ${campaignId}`,
      content: `Written in ${campaignId}`,
      campaignId,
    });
    const switchTo = (campaignId: string) => {
      mockActiveCampaignId = campaignId;
      mockActiveCampaign = { id: campaignId, name: campaignId };
    };
    const rerenderPage = (rerender: (ui: React.ReactElement) => void) =>
      rerender(
        <MemoryRouter>
          <NotePage />
        </MemoryRouter>
      );

    beforeEach(() => {
      mockCampaignsList = [
        { id: "campaign-1", name: "campaign-1" },
        { id: "campaign-2", name: "campaign-2" },
        { id: "campaign-3", name: "campaign-3" },
      ];
    });

    it("does not let a 'not found' from one campaign stick in another", async () => {
      mockGetNoteById.mockReturnValue(undefined);
      mockGetDocument.mockResolvedValue(null);
      const { rerender } = renderPage();
      expect(await screen.findByText("Note Not Found")).toBeInTheDocument();

      // Under campaign 3 the same id is a note from campaign 2.
      mockGetDocument.mockResolvedValue(noteFrom("campaign-2"));
      switchTo("campaign-3");
      rerenderPage(rerender);

      await waitFor(() =>
        expect(screen.getByTestId("note-editor")).toHaveAttribute("data-note-content", "Written in campaign-2")
      );
      expect(screen.queryByText("Note Not Found")).not.toBeInTheDocument();
    });

    it("reads the note again under the new campaign rather than keeping the old copy", async () => {
      mockGetNoteById.mockReturnValue(undefined);
      mockGetDocument.mockResolvedValue(noteFrom("campaign-2"));
      const { rerender } = renderPage();
      await screen.findByText("Note from Different Campaign");
      expect(mockGetDocument).toHaveBeenCalledTimes(1);

      switchTo("campaign-3");
      rerenderPage(rerender);

      await waitFor(() => expect(mockGetDocument).toHaveBeenCalledTimes(2));
    });

    it("drops an answer that arrives after the campaign changed", async () => {
      mockGetNoteById.mockReturnValue(undefined);
      let answerFirst: (note: unknown) => void = () => undefined;
      mockGetDocument.mockImplementationOnce(() => new Promise((resolve) => { answerFirst = resolve; }));
      const { rerender } = renderPage();

      // Switch before the first read answers; the second read finds nothing.
      mockGetDocument.mockResolvedValueOnce(null);
      switchTo("campaign-3");
      rerenderPage(rerender);
      expect(await screen.findByText("Note Not Found")).toBeInTheDocument();

      await act(async () => { answerFirst(noteFrom("campaign-2")); });
      expect(screen.queryByTestId("note-editor")).not.toBeInTheDocument();
      expect(screen.getByText("Note Not Found")).toBeInTheDocument();
    });

    it("does not look the note up while the campaign's own list is still loading", () => {
      mockGetNoteById.mockReturnValue(undefined);
      mockNotesLoading = true;
      renderPage();
      expect(mockGetDocument).not.toHaveBeenCalled();
    });

    it("gives a note that turns read-only a fresh editor, so the editable one leaves and saves", async () => {
      // Under campaign 2, the note is campaign 1's: read once, shown read-only.
      switchTo("campaign-2");
      mockGetNoteById.mockReturnValue(undefined);
      mockGetDocument.mockResolvedValue(sampleNote);
      const { rerender } = renderPage();
      await waitFor(() =>
        expect(screen.getByTestId("note-editor")).toHaveAttribute("data-readonly", "true")
      );

      // Back in campaign 1 it is the user's own note again, editable.
      switchTo("campaign-1");
      mockGetNoteById.mockReturnValue(sampleNote);
      rerenderPage(rerender);
      expect(screen.getByTestId("note-editor")).toHaveAttribute("data-readonly", "false");
      const mountsWhileEditable = mockEditorMounts;

      // And campaign 2 again: its answer is already known, so no loading
      // state comes between -- the editor itself must be replaced.
      switchTo("campaign-2");
      mockGetNoteById.mockReturnValue(undefined);
      rerenderPage(rerender);
      expect(screen.getByTestId("note-editor")).toHaveAttribute("data-readonly", "true");
      expect(mockEditorMounts).toBe(mountsWhileEditable + 1);
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("navigates to /notes when the editor's back action is triggered", () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /all notes/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/notes");
    });
  });

  // -------------------------------------------------------------------------
  // Delete confirmation
  // Bug fix: handleDeleteNote used to delete and navigate away on a single
  // click, while leaving a group and deleting an account both confirm first.
  // -------------------------------------------------------------------------
  describe("delete confirmation", () => {
    test("should not delete on the first click", () => {
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      expect(mockDeleteNote).not.toHaveBeenCalled();
      expect(mockNavigateToPage).not.toHaveBeenCalledWith("/notes");
    });

    test("should ask before deleting", () => {
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      expect(screen.getByText(/delete this note/i)).toBeInTheDocument();
    });

    test("should delete once confirmed", async () => {
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
      fireEvent.click(screen.getByRole("button", { name: /delete note/i }));

      await waitFor(() => expect(mockDeleteNote).toHaveBeenCalledWith("note-1"));
    });

    test("should leave the note alone when the dialog is cancelled", () => {
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(mockDeleteNote).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------
  describe("layout", () => {
    test("should render the merged campaign links panel", () => {
      renderPage();
      expect(screen.getByTestId("campaign-links-panel")).toBeInTheDocument();
    });

    test("should render the labelled usage meter", () => {
      renderPage();
      expect(screen.getByTestId("usage-meter")).toBeInTheDocument();
    });

    test("should archive from the editor top bar", async () => {
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /archive/i }));

      await waitFor(() => expect(mockArchiveNote).toHaveBeenCalledWith("note-1"));
    });
  });

  // -------------------------------------------------------------------------
  // Loading state for cross-campaign fetch
  // -------------------------------------------------------------------------
  describe("loading state for cross-campaign note fetch", () => {
    beforeEach(() => {
      mockGetNoteById.mockReturnValue(undefined);
      // Simulate a slow fetch that never resolves during the test
      mockGetDocument.mockReturnValue(new Promise(() => {}));
    });

    it("shows loading indicator while fetching cross-campaign note", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Loading note...")).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Cross-campaign note: same-campaign timing case (line 71)
  // BUG #1150: When getDocument returns a note with the same campaignId as the
  // active campaign (line 71), setCrossCampaignNote(null) is a no-op because
  // crossCampaignNote is already null. crossCampaignNotFound is never set to
  // true, so the useEffect condition evaluates to true again and triggers
  // another fetch -- an infinite re-fetch loop. Loading spinner never resolves.
  // Fix: set crossCampaignNotFound(true) in the same-campaign branch (line 71)
  // so the effect does not re-trigger.
  // -------------------------------------------------------------------------
  describe("when note is fetched cross-campaign but belongs to active campaign (timing case)", () => {
    const sameCampaignNote = {
      id: "note-1",
      title: "Timing Note",
      content: "Should have been in context",
      campaignId: "campaign-1", // same as active campaign
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
    };

    beforeEach(() => {
      mockGetNoteById.mockReturnValue(undefined);
      // DocumentService returns a note that belongs to the SAME campaign
      mockGetDocument.mockResolvedValue(sameCampaignNote);
    });

    // BUG #1150: same-campaign timing branch causes infinite re-fetch.
    it("renders 'Note Not Found' because same-campaign note is not treated as cross-campaign — skipped due to bug #1150", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Note Not Found")).toBeInTheDocument();
      });
    });

    // BUG #1150: same root cause.
    it("does NOT show the cross-campaign warning banner for same-campaign notes — skipped due to bug #1150", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.queryByText("Note from Different Campaign")).not.toBeInTheDocument();
      });
    });

  });

  // -------------------------------------------------------------------------
  // Cross-campaign note fetch ERROR path (line 79 catch block)
  // BUG #1151: When getDocument throws, the catch block only logs the error and
  // sets isLoadingCrossCampaignNote=false. crossCampaignNotFound is never set
  // to true, so the useEffect condition is true again and triggers another fetch
  // -- an infinite re-fetch loop on every error. The "Note Not Found" state is
  // never reached; the loading spinner never resolves.
  // Fix: set crossCampaignNotFound(true) in the catch block so the effect
  // does not re-trigger after a fetch error.
  // -------------------------------------------------------------------------
  describe("cross-campaign note fetch error path", () => {
    beforeEach(() => {
      mockGetNoteById.mockReturnValue(undefined);
      // DocumentService throws
      mockGetDocument.mockRejectedValue(new Error("Firestore unavailable"));
    });

    // BUG #1151: catch block does not set crossCampaignNotFound causing infinite re-fetch.
    it("shows 'Note Not Found' after a fetch error (does not crash) — skipped due to bug #1151", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Note Not Found")).toBeInTheDocument();
      });
    });

    // BUG #1151: same root cause.
    it("does NOT render NoteEditor after a cross-campaign fetch error — skipped due to bug #1151", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.queryByTestId("note-editor")).not.toBeInTheDocument();
      });
    });

  });

  // -------------------------------------------------------------------------
  // Delete error path
  // -------------------------------------------------------------------------
  describe("handleConfirmDelete error path", () => {
    it("does not navigate away when deleteNote throws", async () => {
      mockDeleteNote.mockRejectedValue(new Error("Delete failed"));
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
      fireEvent.click(screen.getByRole("button", { name: /delete note/i }));

      // Give the async handler time to settle
      await act(async () => {});
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });

    // Rewritten against the requirement (WRITES-001, approved 2026-10-04):
    // this test used to assert that a failed delete closed the dialog, which
    // is the defect -- the reader could not tell the note survived, or why.
    it("keeps the dialog open with the reason after a failed delete, and a retry works", async () => {
      mockDeleteNote.mockRejectedValueOnce(new Error("Delete failed"));
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
      fireEvent.click(screen.getByRole("button", { name: /delete note/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/delete failed/i);
      expect(screen.getByRole("heading", { name: /delete this note/i })).toBeInTheDocument();
      expect(screen.getByTestId("note-editor")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete note/i })).toBeEnabled();

      mockDeleteNote.mockResolvedValueOnce(undefined);
      fireEvent.click(screen.getByRole("button", { name: /delete note/i }));

      await waitFor(() => {
        expect(mockNavigateToPage).toHaveBeenCalledWith("/notes");
      });
      expect(mockDeleteNote).toHaveBeenCalledTimes(2);
    });

    it("opens again without the last attempt's error", async () => {
      mockDeleteNote.mockRejectedValueOnce(new Error("Delete failed"));
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
      fireEvent.click(screen.getByRole("button", { name: /delete note/i }));
      await screen.findByRole("alert");

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Archive error path
  // -------------------------------------------------------------------------
  describe("handleArchiveNote error path", () => {
    it("does not navigate away when archiveNote throws", async () => {
      mockArchiveNote.mockRejectedValue(new Error("Archive failed"));
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /archive/i }));

      await act(async () => {});
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });

    // WRITES-001: a failed archive used to be logged and nothing else.
    it("says the archive failed, and clears that once a retry succeeds", async () => {
      mockArchiveNote.mockRejectedValueOnce(new Error("Archive failed"));
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: /archive/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t archive/i);
      expect(screen.getByRole("alert")).toHaveTextContent(/archive failed/i);
      expect(screen.getByTestId("note-editor")).toBeInTheDocument();

      mockArchiveNote.mockResolvedValueOnce(undefined);
      fireEvent.click(screen.getByRole("button", { name: /archive/i }));

      await waitFor(() => {
        expect(mockNavigateToPage).toHaveBeenCalledWith("/notes");
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // NoteEditor onSave callback (lines 145-146)
  // -------------------------------------------------------------------------
  describe("NoteEditor onSave", () => {
    it("clicking note-editor-trigger-save fires onSave without error", async () => {
      renderPage();
      const triggerBtn = screen.getByTestId("note-editor-trigger-save");
      fireEvent.click(triggerBtn);
      // No onSave handler is wired up (references are found reactively by
      // CampaignLinksPanel), so this just guards against a crash.
      expect(screen.getByTestId("note-editor")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // getCurrentEditorContent via CampaignLinksPanel trigger (lines 85-89)
  // -------------------------------------------------------------------------
  describe("getCurrentEditorContent — noteEditorRef.current is set", () => {
    it("CampaignLinksPanel trigger calls getCurrentEditorContent without error", () => {
      renderPage();
      const btn = screen.getByTestId("campaign-links-get-content");
      fireEvent.click(btn);
      expect(screen.getByTestId("campaign-links-panel")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // saveCurrentEditorContent via CampaignLinksPanel trigger (lines 92-96)
  // -------------------------------------------------------------------------
  describe("saveCurrentEditorContent — noteEditorRef.current is set", () => {
    it("CampaignLinksPanel trigger calls saveCurrentEditorContent without error", async () => {
      renderPage();
      const btn = screen.getByTestId("campaign-links-save-content");
      await act(async () => {
        fireEvent.click(btn);
      });
      expect(screen.getByTestId("campaign-links-panel")).toBeInTheDocument();
    });
  });
});
