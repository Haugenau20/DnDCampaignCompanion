// src/pages/notes/__tests__/NotesPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotesPage from "../NotesPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ pathname: "/notes", search: "", hash: "" }),
}));

// ---------------------------------------------------------------------------
// Page-suite gate mock (shared across Tasks 8-13 -- see page-suite-mock.md).
// `notes` requires only a group, so `mockActiveCampaignId = null` must still
// reach `ready`, not `pick-campaign` -- that is what the group-only tests
// below exist to prove.
// ---------------------------------------------------------------------------
let mockUser: { uid: string } | null = { uid: "user-1" };
let mockIsResolving = false;
let mockActiveGroupId: string | null = "group-1";
let mockActiveCampaignId: string | null = "campaign-1";
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
    activeCampaign: mockActiveCampaignId
      ? { id: mockActiveCampaignId, name: "Phandelver" }
      : null,
    setActiveCampaign: mockSetActiveCampaign,
  }),
  SignInForm: () => <div data-testid="sign-in-form" />,
  JoinGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-group-dialog" /> : null,
}));

// useSelectableCampaigns fetches through this in the pick-campaign state.
jest.mock("core/services/firebase", () => ({
  __esModule: true,
  default: {
    campaign: { getCampaigns: jest.fn().mockResolvedValue([]) },
  },
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
// NotesList, useNotes and useCreateNote all come from the collaboration
// domain barrel now, so they are mocked together in a single factory.
jest.mock("features/collaboration", () => ({
  NotesList: () => <div data-testid="notes-list" />,
  useNotes: jest.fn(),
  useCreateNote: jest.fn(),
}));

const { useNotes, useCreateNote } = require("features/collaboration");

const mockCreateAndOpen = jest.fn();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(
    <MemoryRouter>
      <NotesPage />
    </MemoryRouter>
  );
}

function setupMocks({
  isLoading = false,
}: {
  isLoading?: boolean;
} = {}) {
  (useNotes as jest.Mock).mockReturnValue({ isLoading });
  (useCreateNote as jest.Mock).mockReturnValue({ createAndOpen: mockCreateAndOpen });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NotesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Gated states (the four standard tests every page suite adds -- Task 8
  // Step 1)
  // -------------------------------------------------------------------------
  describe("gated states", () => {
    it("renders the page title while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Notes" })
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

    it("hides the create action while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.queryByRole("button", { name: /new note/i })
      ).not.toBeInTheDocument();
    });

    it("shows a skeleton and no message while context is still resolving", () => {
      mockIsResolving = true;
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
      expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    });

    // Notes are group-scoped; demanding a campaign here would gate a page
    // that can render perfectly well without one.
    it("shows notes for a member with a group but no campaign chosen", () => {
      mockActiveCampaignId = null;
      renderPage();
      expect(screen.getByTestId("notes-list")).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: /which campaign/i })
      ).not.toBeInTheDocument();
    });

    it("no longer warns about a missing campaign in the header", () => {
      mockActiveCampaignId = null;
      renderPage();
      expect(screen.queryByText(/no campaign selected/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Ready-state rendering
  // -------------------------------------------------------------------------
  describe("ready state", () => {
    test("should render the page heading", () => {
      renderPage();
      expect(screen.getByRole("heading", { level: 1, name: "Notes" })).toBeInTheDocument();
    });

    test("should name the campaign in the subtitle and say the notes are private", () => {
      renderPage();
      expect(
        screen.getByText("Your private notes for Phandelver. Only you can read them.")
      ).toBeInTheDocument();
    });

    test("should create a note from the header button", () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /new note/i }));
      expect(mockCreateAndOpen).toHaveBeenCalled();
    });

    // The subtitle falls back to the campaign-less sentence when a member has
    // a group but no campaign chosen -- the same state exercised above.
    test("should use the generic subtitle when no campaign is active", () => {
      mockActiveCampaignId = null;
      renderPage();
      expect(
        screen.getByText("Your private notes. Only you can read them.")
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Your private notes for/)
      ).not.toBeInTheDocument();
    });

    test("should hide the create button without an active campaign", () => {
      mockActiveCampaignId = null;
      renderPage();
      expect(screen.queryByRole("button", { name: /new note/i })).not.toBeInTheDocument();
    });

    test("should render the notes list", () => {
      renderPage();
      expect(screen.getByTestId("notes-list")).toBeInTheDocument();
    });
  });
});
