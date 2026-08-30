// src/pages/notes/__tests__/NotesPage.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotesPage from "../NotesPage";

// ---------------------------------------------------------------------------
// react-router-dom mocks
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: () => ({ pathname: "/notes", search: "", hash: "" }),
}));

// ---------------------------------------------------------------------------
// Context mocks
// ---------------------------------------------------------------------------
interface CampaignsMock {
  activeCampaignId: string | null;
  activeCampaign: { id: string; name: string } | null;
}

let mockCampaigns: CampaignsMock = {
  activeCampaignId: "campaign-1",
  activeCampaign: { id: "campaign-1", name: "The Fellowship" },
};

jest.mock("@/features/user-management", () => ({
  useCampaigns: () => mockCampaigns,
}));

const mockCreateNote = jest.fn().mockResolvedValue("new-note-id");
const mockCreateAndOpen = jest.fn();

const mockNavigateToPage = jest.fn();

jest.mock("shared/hooks/useNavigation", () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    state: {},
  }),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
// NotesList, useNotes and useCreateNote all come from the collaboration
// domain barrel now, so they are mocked together in a single factory.
jest.mock('@/features/collaboration', () => ({
  ...jest.requireActual('@/features/collaboration'),
  NotesList: () => <div data-testid="notes-list" />,
  useNotes: jest.fn(),
  useCreateNote: jest.fn(),
}));

const { useNotes, useCreateNote } = require("@/features/collaboration");

jest.mock("lucide-react", () => ({
  Plus: () => <span data-testid="plus-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(<NotesPage />);
}

function setupMocks({
  activeCampaignId = "campaign-1" as string | null,
  // No default value here: whether a campaign object accompanies the id is
  // derived below, so an explicit `activeCampaignId: null` also clears
  // `activeCampaign` by default instead of leaving a stale campaign object
  // behind. Pass `activeCampaign` explicitly to exercise a state where the
  // two disagree (there shouldn't be a real one, but a regression could
  // produce it).
  activeCampaign,
  isLoading = false,
}: {
  activeCampaignId?: string | null;
  activeCampaign?: { id: string; name: string } | null;
  isLoading?: boolean;
} = {}) {
  const resolvedCampaign =
    activeCampaign !== undefined
      ? activeCampaign
      : activeCampaignId === null
      ? null
      : { id: "campaign-1", name: "The Fellowship" };

  mockCampaigns = { activeCampaignId, activeCampaign: resolvedCampaign };
  (useNotes as jest.Mock).mockReturnValue({ isLoading });
  (useCreateNote as jest.Mock).mockReturnValue({ createAndOpen: mockCreateAndOpen });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('NotesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNote.mockResolvedValue("new-note-id");
  });

  test('should render the page heading', () => {
    setupMocks();
    render(<NotesPage />);
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
  });

  test('should name the campaign in the subtitle and say the notes are private', () => {
    setupMocks({ activeCampaign: { id: 'campaign-1', name: 'Phandelver' } });
    render(<NotesPage />);
    expect(
      screen.getByText('Your private notes for Phandelver. Only you can read them.')
    ).toBeInTheDocument();
  });

  test('should create a note from the header button', () => {
    setupMocks();
    render(<NotesPage />);

    fireEvent.click(screen.getByRole('button', { name: /new note/i }));

    expect(mockCreateAndOpen).toHaveBeenCalled();
  });

  test('should NOT show the subtitle when the campaign context has cleared', () => {
    setupMocks({ activeCampaignId: null });
    render(<NotesPage />);
    expect(screen.queryByText(/Your private notes for/)).not.toBeInTheDocument();
  });

  test('should hide the create button without an active campaign', () => {
    setupMocks({ activeCampaignId: null });
    render(<NotesPage />);
    expect(screen.queryByRole('button', { name: /new note/i })).not.toBeInTheDocument();
  });

  test('should warn when no campaign is selected and loading has settled', () => {
    setupMocks({ activeCampaignId: null, isLoading: false });
    render(<NotesPage />);
    expect(screen.getByText(/no campaign selected/i)).toBeInTheDocument();
  });

  test('should NOT warn while still loading (bug #1413)', () => {
    setupMocks({ activeCampaignId: null, isLoading: true });
    render(<NotesPage />);
    expect(screen.queryByText(/no campaign selected/i)).not.toBeInTheDocument();
  });

  test('should render the notes list', () => {
    setupMocks();
    render(<NotesPage />);
    expect(screen.getByTestId('notes-list')).toBeInTheDocument();
  });
});
