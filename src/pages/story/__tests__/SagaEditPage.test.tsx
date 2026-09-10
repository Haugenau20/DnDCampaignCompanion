// src/pages/story/__tests__/SagaEditPage.test.tsx
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SagaEditPage from "../SagaEditPage";
import { unnamedControlsIn } from "../../../test-utils/accessible-names";

// ---------------------------------------------------------------------------
// Page-suite gate mock (shared across Tasks 8-13 -- see page-suite-mock.md)
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
    campaign: {
      getCampaigns: jest
        .fn()
        .mockResolvedValue([{ id: "campaign-2", name: "Icespire Peak" }]),
    },
  },
}));

// ---------------------------------------------------------------------------
// Context / hook mocks
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock("shared/context/NavigationContext", () => ({
  useNavigation: () => ({ navigateToPage: mockNavigateToPage }),
}));

const mockSaveSaga = jest.fn();

interface SagaDataMock {
  saga: { title: string; content: string; lastUpdated?: string } | null;
  loading: boolean;
  error: string | null;
  saveSaga: jest.Mock;
}

let mockSagaData: SagaDataMock = {
  saga: null,
  loading: false,
  error: null,
  saveSaga: mockSaveSaga,
};

let mockChapters: any[] = [
  { id: "ch-1", title: "Chapter 1", order: 1, content: "Content 1" },
];

jest.mock("features/storytelling", () => ({
  useSagaData: () => mockSagaData,
  useStory: () => ({ chapters: mockChapters }),
}));

// ---------------------------------------------------------------------------
// Utility mock
// ---------------------------------------------------------------------------
const mockExportChaptersAsText = jest.fn();
jest.mock("shared/utils/export-utils", () => ({
  exportChaptersAsText: (chapters: any[]) => mockExportChaptersAsText(chapters),
}));

// ---------------------------------------------------------------------------
// Child component mocks
// ---------------------------------------------------------------------------
// Typography is mapped to its real semantic tag (h1/h2/h3/h4, else `p`) so
// that `getByRole("heading", ...)` works against both this page's own title
// (via PageShell) and the shared gated panel's headings (via GatedPageState),
// while still exposing the same `data-testid` scheme the existing assertions
// below rely on.
jest.mock("../../../core/components/Typography", () => {
  const TAGS: Record<string, string> = { h1: "h1", h2: "h2", h3: "h3", h4: "h4" };
  return {
    __esModule: true,
    default: ({ children, color, variant, className }: any) => {
      const Tag = (TAGS[variant] || "p") as any;
      return (
        <Tag
          data-testid={
            color
              ? `typography-${color}`
              : variant
              ? `typography-${variant}`
              : "typography-default"
          }
          className={className}
        >
          {children}
        </Tag>
      );
    },
  };
});

jest.mock("shared/components/Breadcrumb", () => ({
  __esModule: true,
  default: (props: any) => (
    <nav data-testid="breadcrumb">
      {props.items.map((item: any, i: number) => (
        <span key={i} data-testid={`breadcrumb-item-${i}`}>
          {item.label}
        </span>
      ))}
    </nav>
  ),
}));

jest.mock("../../../core/components/Button", () => ({
  __esModule: true,
  default: ({ children, onClick, type, isLoading }: any) => (
    <button
      data-testid={`button-${String(children).trim().replace(/\s+/g, "-").toLowerCase()}`}
      onClick={onClick}
      type={type || "button"}
      disabled={!!isLoading}
      data-loading={String(!!isLoading)}
    >
      {children}
    </button>
  ),
}));

jest.mock("../../../core/components/Card", () => {
  const Card = ({ children }: any) => (
    <div data-testid="card">{children}</div>
  );
  Card.Content = ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  );
  Card.Footer = ({ children, className }: any) => (
    <div data-testid="card-footer" className={className}>
      {children}
    </div>
  );
  return { __esModule: true, default: Card };
});

// Input mock: renders a real <input> or <textarea> so we can change values
// The real Input associates its label with its control via htmlFor/id. This stub
// did not, so every control it rendered was unnamed -- which the accessible-name
// gate below correctly caught, in the mock rather than in the page. A stub that
// is laxer than the thing it stands in for turns a real gate into a green light.
jest.mock("../../../core/components/Input", () => ({
  __esModule: true,
  default: ({ label, value, onChange, isTextArea, required, fullWidth }: any) => {
    const controlId = `mock-input-${String(label).replace(/\s+/g, "-").toLowerCase()}`;
    if (isTextArea) {
      return (
        <div data-testid={`input-wrapper-${label?.replace(/\s+/g, "-").toLowerCase()}`}>
          <label htmlFor={controlId}>{label}</label>
          <textarea
            id={controlId}
            data-testid={`textarea-${label?.replace(/\s+/g, "-").toLowerCase()}`}
            value={value}
            onChange={onChange}
            required={required}
          />
        </div>
      );
    }
    return (
      <div data-testid={`input-wrapper-${label?.replace(/\s+/g, "-").toLowerCase()}`}>
        <label htmlFor={controlId}>{label}</label>
        <input
          id={controlId}
          data-testid={`input-${label?.replace(/\s+/g, "-").toLowerCase()}`}
          value={value}
          onChange={onChange}
          required={required}
        />
      </div>
    );
  },
}));

// Mock Dialog to render children inline (ref: bug #150)
jest.mock("../../../core/components/Dialog", () => ({
  __esModule: true,
  default: ({ open, onClose, title, children }: any) =>
    open ? (
      <div data-testid="dialog" role="dialog">
        <h2 data-testid="dialog-title">{title}</h2>
        {children}
        <button data-testid="dialog-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

jest.mock("lucide-react", () => ({
  Save: () => <span data-testid="save-icon" />,
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
  FileDown: () => <span data-testid="file-down-icon" />,
  HelpCircle: () => <span data-testid="help-circle-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(
    <MemoryRouter>
      <SagaEditPage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SagaEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: "user-1" };
    mockIsResolving = false;
    mockActiveGroupId = "group-1";
    mockActiveCampaignId = "campaign-1";
    mockGroups = [{ id: "group-1", name: "The Fellowship" }];
    mockChapters = [
      { id: "ch-1", title: "Chapter 1", order: 1, content: "Content 1" },
    ];
    mockSagaData = {
      saga: null,
      loading: false,
      error: null,
      saveSaga: mockSaveSaga,
    };
    mockSaveSaga.mockResolvedValue(true);
  });

  // -------------------------------------------------------------------------
  // Gated states
  // -------------------------------------------------------------------------
  describe("gated states", () => {
    it("renders the page title while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Campaign Saga" })
      ).toBeInTheDocument();
    });

    // Write route: the heading names writing a chapter, the shared copy for
    // this page key, and never suggests picking a group.
    it("asks a signed-out visitor to sign in to write a chapter, and never to select a group", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.getByRole("heading", { name: /sign in to write a chapter/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/select a group/i)).not.toBeInTheDocument();
    });

    it("hides the export action while signed out", () => {
      mockUser = null;
      renderPage();
      expect(
        screen.queryByTestId("button-export-chapter-content")
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("input-saga-title")).not.toBeInTheDocument();
    });

    it("shows a skeleton and no message while context is still resolving", () => {
      mockIsResolving = true;
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
      expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    });

    // Rewritten: the pre-gate suite asserted this page's own
    // "Please select a group and campaign to edit the saga" copy, driven by
    // `hasRequiredContext` (dropped from this page's guard -- see the file
    // header). `usePageGate` now derives the state and `GatedContent` renders
    // the shared pick-campaign panel.
    it("shows the shared pick-campaign panel, not the old copy, when context is missing", async () => {
      mockActiveCampaignId = null;
      renderPage();
      expect(
        screen.queryByText(/please select a group and campaign/i)
      ).not.toBeInTheDocument();
      expect(
        await screen.findByRole("heading", { name: /which campaign/i })
      ).toBeInTheDocument();
      expect(screen.queryByTestId("input-saga-title")).not.toBeInTheDocument();
    });

    // Rewritten: the pre-gate suite redirected a signed-out visitor straight
    // back to /story/saga via a `!user` effect, so they never saw why. The
    // write-mode panel now shows in place instead.
    it("does NOT redirect a signed-out visitor away from the page", () => {
      mockUser = null;
      renderPage();
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe("loading state", () => {
    // Rewritten: `loading` now folds into the shared "resolving" state via
    // `usePageGate`; the page's own bare "Loading..." text is gone.
    it("shows a skeleton, not the page's own loading text, while loading", () => {
      mockSagaData = { ...mockSagaData, loading: true };
      renderPage();
      expect(screen.getByTestId("gated-skeleton")).toBeInTheDocument();
    });

    it("does NOT render form while loading", () => {
      mockSagaData = { ...mockSagaData, loading: true };
      renderPage();
      expect(screen.queryByTestId("input-saga-title")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe("error state", () => {
    it("shows error message when error is set", () => {
      mockSagaData = { ...mockSagaData, error: "Database error" };
      renderPage();
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Database error"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Main rendering
  // -------------------------------------------------------------------------
  describe("main rendering", () => {
    it("renders without crashing", () => {
      const { container } = renderPage();
      expect(container).toBeInTheDocument();
    });

    it("renders page heading 'Edit Campaign Saga' as the h1", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "Edit Campaign Saga" })
      ).toBeInTheDocument();
    });

    it("renders breadcrumb with correct items", () => {
      renderPage();
      expect(screen.getByTestId("breadcrumb-item-0")).toHaveTextContent("Home");
      expect(screen.getByTestId("breadcrumb-item-1")).toHaveTextContent("Story");
      expect(screen.getByTestId("breadcrumb-item-2")).toHaveTextContent(
        "Campaign Saga"
      );
      expect(screen.getByTestId("breadcrumb-item-3")).toHaveTextContent(
        "Edit Saga"
      );
    });

    it("renders title input field", () => {
      renderPage();
      expect(screen.getByTestId("input-saga-title")).toBeInTheDocument();
    });

    it("renders content textarea", () => {
      renderPage();
      expect(
        screen.getByTestId("textarea-saga-content")
      ).toBeInTheDocument();
    });

    it("title input is pre-filled with 'The Campaign Saga' by default", () => {
      renderPage();
      expect(screen.getByTestId("input-saga-title")).toHaveValue(
        "The Campaign Saga"
      );
    });

    it("content textarea is pre-filled with default opening text when no saga", () => {
      renderPage();
      expect(
        screen.getByTestId("textarea-saga-content")
      ).toHaveValue(
        "In a realm where magic weaves through the fabric of reality and ancient powers stir from long slumber, a group of unlikely heroes finds their fates intertwined by destiny's unseen hand."
      );
    });

    it("renders 'Save Saga' submit button", () => {
      renderPage();
      expect(screen.getByTestId("button-save-saga")).toBeInTheDocument();
    });

    it("renders 'Cancel' button", () => {
      renderPage();
      expect(screen.getByTestId("button-cancel")).toBeInTheDocument();
    });

    it("renders 'Export Chapter Content' button", () => {
      renderPage();
      expect(
        screen.getByTestId("button-export-chapter-content")
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Form state — pre-fill from existing saga
  // -------------------------------------------------------------------------
  describe("form pre-fill from existing saga", () => {
    it("pre-fills title from existing saga", () => {
      mockSagaData = {
        ...mockSagaData,
        saga: {
          title: "Legend of Faerun",
          content: "The adventurers arose...",
        },
      };
      renderPage();
      expect(screen.getByTestId("input-saga-title")).toHaveValue(
        "Legend of Faerun"
      );
    });

    it("pre-fills content from existing saga", () => {
      mockSagaData = {
        ...mockSagaData,
        saga: {
          title: "Legend of Faerun",
          content: "The adventurers arose...",
        },
      };
      renderPage();
      expect(screen.getByTestId("textarea-saga-content")).toHaveValue(
        "The adventurers arose..."
      );
    });
  });

  // -------------------------------------------------------------------------
  // Form interactions
  // -------------------------------------------------------------------------
  describe("form interactions", () => {
    it("updates title when user types in title input", () => {
      renderPage();
      fireEvent.change(screen.getByTestId("input-saga-title"), {
        target: { value: "My New Title" },
      });
      expect(screen.getByTestId("input-saga-title")).toHaveValue(
        "My New Title"
      );
    });

    it("updates content when user types in content textarea", () => {
      renderPage();
      fireEvent.change(screen.getByTestId("textarea-saga-content"), {
        target: { value: "My new saga content here." },
      });
      expect(screen.getByTestId("textarea-saga-content")).toHaveValue(
        "My new saga content here."
      );
    });
  });

  // -------------------------------------------------------------------------
  // Form submission — success
  // -------------------------------------------------------------------------
  describe("form submission — success", () => {
    it("calls saveSaga with correct data on form submit", async () => {
      renderPage();
      fireEvent.change(screen.getByTestId("input-saga-title"), {
        target: { value: "Updated Saga" },
      });
      fireEvent.change(screen.getByTestId("textarea-saga-content"), {
        target: { value: "Updated content here." },
      });
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(mockSaveSaga).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Saga",
          content: "Updated content here.",
          version: "1.0",
        })
      );
    });

    // Regression test for bug #1203: the page must never own write attribution.
    // useSagaData computes createdBy/createdByUsername/dateAdded from the acting
    // user and group profile; SagaEditPage must not construct or pass them.
    it("does NOT include attribution fields in the saveSaga payload", async () => {
      renderPage();
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      const [payload] = mockSaveSaga.mock.calls[0];
      expect(payload).not.toHaveProperty("createdBy");
      expect(payload).not.toHaveProperty("createdByUsername");
      expect(payload).not.toHaveProperty("createdByCharacterId");
      expect(payload).not.toHaveProperty("createdByCharacterName");
      expect(payload).not.toHaveProperty("dateAdded");
    });

    it("shows success message after successful save", async () => {
      renderPage();
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(screen.getByTestId("typography-success")).toHaveTextContent(
        "Saga updated successfully"
      );
    });

    it("navigates to /story/saga after successful save (after delay)", async () => {
      jest.useFakeTimers();
      renderPage();
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/saga");
      jest.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Form submission — validation
  // -------------------------------------------------------------------------
  describe("form submission — validation", () => {
    it("shows validation error when title is empty", async () => {
      renderPage();
      // Clear the title
      fireEvent.change(screen.getByTestId("input-saga-title"), {
        target: { value: "   " },
      });
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Title is required"
      );
    });

    it("shows validation error when content is empty", async () => {
      renderPage();
      // Clear the content
      fireEvent.change(screen.getByTestId("textarea-saga-content"), {
        target: { value: "   " },
      });
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Content is required"
      );
    });

    it("does NOT call saveSaga when title is empty", async () => {
      renderPage();
      fireEvent.change(screen.getByTestId("input-saga-title"), {
        target: { value: "" },
      });
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(mockSaveSaga).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Form submission — saveSaga failure
  // -------------------------------------------------------------------------
  describe("form submission — saveSaga failure", () => {
    it("shows error message when saveSaga returns false", async () => {
      mockSaveSaga.mockResolvedValue(false);
      renderPage();
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "Failed to save saga"
      );
    });

    it("does NOT navigate when saveSaga fails", async () => {
      mockSaveSaga.mockResolvedValue(false);
      renderPage();
      await act(async () => {
        fireEvent.submit(screen.getByTestId("card").querySelector("form")!);
      });
      expect(mockNavigateToPage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Cancel navigation
  // -------------------------------------------------------------------------
  describe("cancel navigation", () => {
    it("navigates to /story/saga when Cancel is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-cancel"));
      expect(mockNavigateToPage).toHaveBeenCalledWith("/story/saga");
    });
  });

  // -------------------------------------------------------------------------
  // Export chapter content
  // -------------------------------------------------------------------------
  describe("export chapter content", () => {
    it("calls exportChaptersAsText when Export button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("button-export-chapter-content"));
      expect(mockExportChaptersAsText).toHaveBeenCalledWith(mockChapters);
    });

    it("shows error when no chapters available to export", () => {
      mockChapters = [];
      renderPage();
      fireEvent.click(screen.getByTestId("button-export-chapter-content"));
      expect(screen.getByTestId("typography-error")).toHaveTextContent(
        "No chapters available to export"
      );
    });

    it("does NOT call exportChaptersAsText when no chapters available", () => {
      mockChapters = [];
      renderPage();
      fireEvent.click(screen.getByTestId("button-export-chapter-content"));
      expect(mockExportChaptersAsText).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Export info dialog
  // -------------------------------------------------------------------------
  describe("export info dialog", () => {
    it("opens export info dialog when help icon is clicked", () => {
      renderPage();
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId("help-circle-icon").closest("button")!);
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("shows dialog title 'About Chapter Export'", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("help-circle-icon").closest("button")!);
      expect(screen.getByTestId("dialog-title")).toHaveTextContent(
        "About Chapter Export"
      );
    });

    it("closes dialog when dialog close button is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByTestId("help-circle-icon").closest("button")!);
      fireEvent.click(screen.getByTestId("dialog-close"));
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Accessible names (PR 8.1)
  //
  // The point of the phase: every control announces itself. A grep proved the
  // old unassociated `<label>` markup was gone; only walking the DOM proves the
  // new markup is right, because a primitive whose `label` prop got dropped in
  // the move looks just as clean in the source.
  // -------------------------------------------------------------------------
  describe("accessible names", () => {
    test("every control in the form has an accessible name", () => {
      const { container } = renderPage();
      expect(unnamedControlsIn(container)).toEqual([]);
    });
  });

});
