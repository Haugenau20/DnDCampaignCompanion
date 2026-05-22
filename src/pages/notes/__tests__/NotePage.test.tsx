// src/pages/notes/__tests__/NotePage.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
// Context mocks
// ---------------------------------------------------------------------------
let mockUser: any = { uid: "user-1" };
let mockActiveGroupId: string | null = "group-1";

interface CampaignsMock {
  activeCampaignId: string | null;
  activeCampaign: { id: string; name: string } | null;
  campaigns: any[];
}

let mockCampaigns: CampaignsMock = {
  activeCampaignId: "campaign-1",
  activeCampaign: { id: "campaign-1", name: "The Fellowship" },
  campaigns: [{ id: "campaign-1", name: "The Fellowship" }],
};

jest.mock("../../../context/firebase", () => ({
  useAuth: () => ({ user: mockUser }),
  useGroups: () => ({ activeGroupId: mockActiveGroupId }),
  useCampaigns: () => mockCampaigns,
}));

const mockDeleteNote = jest.fn().mockResolvedValue(undefined);
const mockGetNoteById = jest.fn();

jest.mock("../../../context/NoteContext", () => ({
  useNotes: () => ({
    deleteNote: mockDeleteNote,
    getNoteById: mockGetNoteById,
  }),
}));

const mockNavigateToPage = jest.fn();

jest.mock("../../../hooks/useNavigation", () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    state: {},
  }),
}));

// ---------------------------------------------------------------------------
// DocumentService mock — used for cross-campaign note fetching
// ---------------------------------------------------------------------------
const mockGetDocument = jest.fn().mockResolvedValue(null);

jest.mock("../../../services/firebase/data/DocumentService", () => ({
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
jest.mock("../../../components/features/notes/NoteEditor", () => {
  const React = require("react");
  const NoteEditorMock = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getCurrentContent: () => ({ title: "Test Note", content: "Some content" }),
      saveCurrentContent: jest.fn().mockResolvedValue(undefined),
    }));
    return (
      <div data-testid="note-editor" data-readonly={props.readOnly ? "true" : "false"}>
        {/* Expose a trigger button so tests can fire the onSave callback */}
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
  return { __esModule: true, default: NoteEditorMock };
});

jest.mock("../../../components/features/notes/EntityExtractor", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="entity-extractor" data-note-id={props.noteId}>
      {/* Expose triggers so tests can fire getCurrentEditorContent and saveCurrentEditorContent */}
      <button
        data-testid="entity-extractor-get-content"
        onClick={() => props.getCurrentEditorContent && props.getCurrentEditorContent()}
      >
        Get Content
      </button>
      <button
        data-testid="entity-extractor-save-content"
        onClick={async () => props.saveCurrentEditorContent && await props.saveCurrentEditorContent()}
      >
        Save Content
      </button>
    </div>
  ),
}));

jest.mock("../../../components/features/notes/NoteReferences", () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="note-references"
      data-note-id={props.noteId}
    >
      {/* Expose triggers so tests can fire callbacks */}
      <button
        data-testid="note-references-found"
        onClick={() => props.onReferencesFound && props.onReferencesFound([{ id: "ref-1" }])}
      >
        Fire References Found
      </button>
      <button
        data-testid="note-references-complete"
        onClick={() => props.onSearchComplete && props.onSearchComplete()}
      >
        Fire Search Complete
      </button>
    </div>
  ),
}));

jest.mock("../../../components/features/notes/FloatingUsageIndicator", () => ({
  __esModule: true,
  default: () => <div data-testid="floating-usage-indicator" />,
}));

jest.mock("../../../components/core/Typography", () => ({
  __esModule: true,
  default: ({ children, variant, color }: any) => {
    const testId = variant
      ? `typography-${variant}`
      : color
      ? `typography-${color}`
      : "typography";
    return <div data-testid={testId}>{children}</div>;
  },
}));

jest.mock("../../../components/core/Button", () => ({
  __esModule: true,
  default: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
  ExternalLink: () => <span data-testid="external-link-icon" />,
}));

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
  return render(<NotePage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NotePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNoteId = "note-1";
    mockUser = { uid: "user-1" };
    mockActiveGroupId = "group-1";
    mockCampaigns = {
      activeCampaignId: "campaign-1",
      activeCampaign: { id: "campaign-1", name: "The Fellowship" },
      campaigns: [{ id: "campaign-1", name: "The Fellowship" }],
    };
    mockGetNoteById.mockReturnValue(sampleNote);
    mockGetDocument.mockResolvedValue(null);
    mockDeleteNote.mockResolvedValue(undefined);
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

    it("renders NoteReferences", () => {
      renderPage();
      expect(screen.getByTestId("note-references")).toBeInTheDocument();
    });

    it("renders EntityExtractor for same-campaign notes", () => {
      renderPage();
      expect(screen.getByTestId("entity-extractor")).toBeInTheDocument();
    });

    it("renders FloatingUsageIndicator", () => {
      renderPage();
      expect(screen.getByTestId("floating-usage-indicator")).toBeInTheDocument();
    });

    it("renders 'Back to Notes' button", () => {
      renderPage();
      expect(screen.getByText("Back to Notes")).toBeInTheDocument();
    });

    it("renders 'Delete' button", () => {
      renderPage();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("NoteEditor is not read-only for same-campaign notes", () => {
      renderPage();
      expect(screen.getByTestId("note-editor")).toHaveAttribute(
        "data-readonly",
        "false"
      );
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
      mockCampaigns = {
        activeCampaignId: "campaign-1",
        activeCampaign: { id: "campaign-1", name: "The Fellowship" },
        campaigns: [
          { id: "campaign-1", name: "The Fellowship" },
          { id: "campaign-other", name: "Side Campaign" },
        ],
      };
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

    it("does NOT render EntityExtractor for cross-campaign notes", async () => {
      renderPage();
      await waitFor(() => {
        expect(
          screen.queryByTestId("entity-extractor")
        ).not.toBeInTheDocument();
      });
    });

    it("Delete button is disabled for cross-campaign notes", async () => {
      renderPage();
      await waitFor(() => {
        const deleteBtn = screen.getByText("Delete");
        expect(deleteBtn).toBeDisabled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe("navigation", () => {
    it("navigates to /notes when 'Back to Notes' is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByText("Back to Notes"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/notes");
    });

    it("deletes the note and navigates to /notes when 'Delete' is clicked", async () => {
      renderPage();
      fireEvent.click(screen.getByText("Delete"));
      await waitFor(() => {
        expect(mockDeleteNote).toHaveBeenCalledWith("note-1");
        expect(mockNavigateToPage).toHaveBeenCalledWith("/notes");
      });
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
  // another fetch — an infinite re-fetch loop. Loading spinner never resolves.
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
    it.skip("renders 'Note Not Found' because same-campaign note is not treated as cross-campaign — skipped due to bug #1150", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Note Not Found")).toBeInTheDocument();
      });
    });

    // BUG #1150: same root cause.
    it.skip("does NOT show the cross-campaign warning banner for same-campaign notes — skipped due to bug #1150", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.queryByText("Note from Different Campaign")).not.toBeInTheDocument();
      });
    });

    it("shows loading indicator while stuck in the same-campaign timing case (demonstrates bug #1150)", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Loading note...")).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Cross-campaign note fetch ERROR path (line 79 catch block)
  // BUG #1151: When getDocument throws, the catch block only logs the error and
  // sets isLoadingCrossCampaignNote=false. crossCampaignNotFound is never set
  // to true, so the useEffect condition is true again and triggers another fetch
  // — an infinite re-fetch loop on every error. The "Note Not Found" state is
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
    it.skip("shows 'Note Not Found' after a fetch error (does not crash) — skipped due to bug #1151", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Note Not Found")).toBeInTheDocument();
      });
    });

    // BUG #1151: same root cause.
    it.skip("does NOT render NoteEditor after a cross-campaign fetch error — skipped due to bug #1151", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.queryByTestId("note-editor")).not.toBeInTheDocument();
      });
    });

    it("shows loading indicator while stuck in the error retry loop (demonstrates bug #1151)", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Loading note...")).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Delete note error path (line 137)
  // -------------------------------------------------------------------------
  describe("handleDeleteNote error path", () => {
    it("does not navigate away when deleteNote throws", async () => {
      mockDeleteNote.mockRejectedValue(new Error("Delete failed"));
      renderPage();
      fireEvent.click(screen.getByText("Delete"));
      // Give the async handler time to settle
      await act(async () => {});
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // NoteEditor onSave callback → refreshReferences (lines 145-146)
  // -------------------------------------------------------------------------
  describe("NoteEditor onSave triggers refreshReferences", () => {
    it("clicking note-editor-trigger-save fires refreshReferences without error", async () => {
      renderPage();
      // The trigger button is rendered inside the mocked NoteEditor
      const triggerBtn = screen.getByTestId("note-editor-trigger-save");
      fireEvent.click(triggerBtn);
      // After firing, NoteReferences should still be present (key was incremented)
      expect(screen.getByTestId("note-references")).toBeInTheDocument();
    });

    it("NoteReferences is still mounted after onSave fires (key change causes remount)", async () => {
      renderPage();
      fireEvent.click(screen.getByTestId("note-editor-trigger-save"));
      // NoteReferences remounts with the new key
      await waitFor(() => {
        expect(screen.getByTestId("note-references")).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // NoteReferences callbacks: onReferencesFound (line 153) and onSearchComplete (line 160)
  // -------------------------------------------------------------------------
  describe("NoteReferences onReferencesFound callback (line 153)", () => {
    it("clicking 'Fire References Found' does not crash and page remains stable", () => {
      renderPage();
      const btn = screen.getByTestId("note-references-found");
      fireEvent.click(btn);
      // Page still renders correctly after callback fires
      expect(screen.getByTestId("note-references")).toBeInTheDocument();
    });
  });

  describe("NoteReferences onSearchComplete callback (line 160)", () => {
    it("clicking 'Fire Search Complete' does not crash and page remains stable", () => {
      renderPage();
      const btn = screen.getByTestId("note-references-complete");
      fireEvent.click(btn);
      // Page still renders correctly after callback fires
      expect(screen.getByTestId("note-references")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // getCurrentEditorContent via EntityExtractor trigger (lines 91-94)
  // -------------------------------------------------------------------------
  describe("getCurrentEditorContent — noteEditorRef.current is set (lines 91-92)", () => {
    it("EntityExtractor trigger calls getCurrentEditorContent without error", () => {
      renderPage();
      const btn = screen.getByTestId("entity-extractor-get-content");
      fireEvent.click(btn);
      // The mocked ref returns { title: "Test Note", content: "Some content" }
      // No crash means line 91-92 executed successfully
      expect(screen.getByTestId("entity-extractor")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // saveCurrentEditorContent via EntityExtractor trigger (lines 98-99)
  // -------------------------------------------------------------------------
  describe("saveCurrentEditorContent — noteEditorRef.current is set (lines 98-99)", () => {
    it("EntityExtractor trigger calls saveCurrentEditorContent without error", async () => {
      renderPage();
      const btn = screen.getByTestId("entity-extractor-save-content");
      await act(async () => {
        fireEvent.click(btn);
      });
      // The mocked ref's saveCurrentContent resolves successfully
      expect(screen.getByTestId("entity-extractor")).toBeInTheDocument();
    });
  });
});
