// src/shared/components/quick-add/__tests__/QuickAddForm.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import QuickAddForm from "../QuickAddForm";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// ---------------------------------------------------------------------------
// The three write paths, plus note conversion's
// ---------------------------------------------------------------------------
const mockAddNPC = jest.fn();
const mockAddQuest = jest.fn();
const mockCreateLocation = jest.fn();
const mockMarkEntityAsConverted = jest.fn();

jest.mock("features/campaign-entities", () => ({
  useNPCs: () => ({ addNPC: mockAddNPC }),
  useQuests: () => ({ addQuest: mockAddQuest }),
  useLocations: () => ({ createLocation: mockCreateLocation }),
}));

jest.mock("features/collaboration", () => ({
  useNotes: () => ({ markEntityAsConverted: mockMarkEntityAsConverted }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderForm(props: Partial<React.ComponentProps<typeof QuickAddForm>> = {}) {
  return render(
    <MemoryRouter>
      <QuickAddForm entity="npc" {...props} />
    </MemoryRouter>
  );
}

const nameField = () => screen.getByLabelText("Name");
const lineField = () => screen.getByLabelText("Who they are, in a line");
const createAndOpen = () => screen.getByRole("button", { name: /create & open/i });
const createAndAddAnother = () =>
  screen.getByRole("button", { name: /create & add another/i });

beforeEach(() => {
  jest.clearAllMocks();
  mockAddNPC.mockResolvedValue("npc-1");
  mockAddQuest.mockResolvedValue("quest-1");
  mockCreateLocation.mockResolvedValue("location-1");
  mockMarkEntityAsConverted.mockResolvedValue(undefined);
});

describe("QuickAddForm", () => {
  // -------------------------------------------------------------------------
  // Two fields, and only two
  // -------------------------------------------------------------------------
  describe("the surface", () => {
    it("asks for exactly two fields", () => {
      renderForm();
      const controls = screen.getAllByRole("textbox");
      expect(controls).toHaveLength(2);
    });

    it("labels them for the entity it is adding", () => {
      renderForm({ entity: "quest" });
      expect(screen.getByLabelText("Title")).toBeInTheDocument();
      expect(
        screen.getByLabelText("What the party was asked to do")
      ).toBeInTheDocument();
    });

    it("offers no status control -- a new record's status is decided for it", () => {
      renderForm();
      expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/relationship/i)).not.toBeInTheDocument();
    });

    it("takes focus on the first field so typing starts immediately", () => {
      renderForm();
      expect(nameField()).toHaveFocus();
    });

    it("does not steal focus on the page mount, which has its own reading order", () => {
      renderForm({ autoFocus: false });
      expect(nameField()).not.toHaveFocus();
    });
  });

  // -------------------------------------------------------------------------
  // Validation -- exactly today's, and reported per field
  // -------------------------------------------------------------------------
  describe("validation", () => {
    it("refuses to write when both fields are empty", async () => {
      renderForm();
      await userEvent.click(createAndOpen());

      expect(mockAddNPC).not.toHaveBeenCalled();
      expect(screen.getByText("Give them a name.")).toBeInTheDocument();
      expect(screen.getByText("Say who they are, in a line.")).toBeInTheDocument();
    });

    it("puts the error under the field it belongs to, not on the form", async () => {
      renderForm();
      await userEvent.type(nameField(), "Thorin");
      await userEvent.click(createAndOpen());

      expect(screen.queryByText("Give them a name.")).not.toBeInTheDocument();
      expect(screen.getByText("Say who they are, in a line.")).toBeInTheDocument();
      expect(lineField()).toHaveAttribute("aria-invalid", "true");
      expect(nameField()).toHaveAttribute("aria-invalid", "false");
    });

    it("treats whitespace as empty", async () => {
      renderForm();
      await userEvent.type(nameField(), "   ");
      await userEvent.type(lineField(), "   ");
      await userEvent.click(createAndOpen());
      expect(mockAddNPC).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Create & open
  // -------------------------------------------------------------------------
  describe("Create & open", () => {
    it("writes the record and navigates to it", async () => {
      renderForm();
      await userEvent.type(nameField(), "Thorin");
      await userEvent.type(lineField(), "Exiled king");
      await userEvent.click(createAndOpen());

      await waitFor(() => expect(mockAddNPC).toHaveBeenCalledTimes(1));
      expect(mockAddNPC.mock.calls[0][0]).toMatchObject({
        name: "Thorin",
        description: "Exiled king",
        status: "alive",
        relationship: "unknown",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/npcs/npc-1", {
        state: { quickAddFocus: "appearance" },
      });
    });

    it("sends a new quest to its directory row, since its page lands in 15-5", async () => {
      renderForm({ entity: "quest" });
      await userEvent.type(screen.getByLabelText("Title"), "Reclaim Erebor");
      await userEvent.type(
        screen.getByLabelText("What the party was asked to do"),
        "Take the mountain"
      );
      await userEvent.click(createAndOpen());

      await waitFor(() => expect(mockAddQuest).toHaveBeenCalledTimes(1));
      expect(mockNavigate).toHaveBeenCalledWith("/quests?highlight=quest-1", {
        state: { quickAddFocus: "objectives" },
      });
    });

    it("tells the launcher it is done, so a dialog closes itself", async () => {
      const onCreated = jest.fn();
      renderForm({ onCreated });
      await userEvent.type(nameField(), "Thorin");
      await userEvent.type(lineField(), "Exiled king");
      await userEvent.click(createAndOpen());

      await waitFor(() => expect(onCreated).toHaveBeenCalledWith("npc-1"));
    });

    it("pre-sets a location's parent when launched from Add a place inside", async () => {
      renderForm({ entity: "location", parentId: "hobbiton" });
      await userEvent.type(screen.getByLabelText("Name"), "Bag End");
      await userEvent.type(
        screen.getByLabelText("What this place is, in a line"),
        "A hobbit hole"
      );
      await userEvent.click(createAndOpen());

      await waitFor(() => expect(mockCreateLocation).toHaveBeenCalledTimes(1));
      expect(mockCreateLocation.mock.calls[0][0]).toMatchObject({
        parentId: "hobbiton",
      });
    });
  });

  // -------------------------------------------------------------------------
  // Create & add another -- the bulk-prep case
  // -------------------------------------------------------------------------
  describe("Create & add another", () => {
    it("keeps the surface open, clears both fields and refocuses the first", async () => {
      renderForm();
      await userEvent.type(nameField(), "Thorin");
      await userEvent.type(lineField(), "Exiled king");
      await userEvent.click(createAndAddAnother());

      await waitFor(() => expect(mockAddNPC).toHaveBeenCalledTimes(1));
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(nameField()).toHaveValue("");
      expect(lineField()).toHaveValue("");
      await waitFor(() => expect(nameField()).toHaveFocus());
    });

    it("five times produces five records and never a stale field", async () => {
      const names = ["Thorin", "Balin", "Dwalin", "Fili", "Kili"];
      renderForm();

      for (let i = 0; i < names.length; i += 1) {
        mockAddNPC.mockResolvedValueOnce(`npc-${i + 1}`);
        await userEvent.type(nameField(), names[i]);
        await userEvent.type(lineField(), `Dwarf ${i + 1}`);
        await userEvent.click(createAndAddAnother());
        await waitFor(() => expect(mockAddNPC).toHaveBeenCalledTimes(i + 1));
      }

      expect(mockAddNPC).toHaveBeenCalledTimes(5);
      names.forEach((name, i) => {
        expect(mockAddNPC.mock.calls[i][0]).toMatchObject({
          name,
          description: `Dwarf ${i + 1}`,
        });
      });
      expect(nameField()).toHaveValue("");
      expect(lineField()).toHaveValue("");
    });

    it("counts what this run has added, quietly", async () => {
      renderForm();
      expect(screen.queryByText(/added/i)).not.toBeInTheDocument();

      await userEvent.type(nameField(), "Thorin");
      await userEvent.type(lineField(), "Exiled king");
      await userEvent.click(createAndAddAnother());
      expect(await screen.findByText("1 NPC added")).toBeInTheDocument();

      await userEvent.type(nameField(), "Balin");
      await userEvent.type(lineField(), "An old dwarf");
      await userEvent.click(createAndAddAnother());
      expect(await screen.findByText("2 NPCs added")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // The save contract (§7) -- creates obey it exactly as edits do
  // -------------------------------------------------------------------------
  describe("a rejected write", () => {
    it("keeps every character typed", async () => {
      mockAddNPC.mockRejectedValue(new Error("Permission denied"));
      renderForm();
      await userEvent.type(nameField(), "Thorin");
      await userEvent.type(lineField(), "Exiled king");
      await userEvent.click(createAndOpen());

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent("Permission denied")
      );
      expect(nameField()).toHaveValue("Thorin");
      expect(lineField()).toHaveValue("Exiled king");
    });

    it("navigates nowhere and claims no success", async () => {
      mockAddNPC.mockRejectedValue(new Error("Permission denied"));
      const onCreated = jest.fn();
      renderForm({ onCreated });
      await userEvent.type(nameField(), "Thorin");
      await userEvent.type(lineField(), "Exiled king");
      await userEvent.click(createAndOpen());

      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(onCreated).not.toHaveBeenCalled();
    });

    it("leaves the count alone when Create & add another fails", async () => {
      mockAddNPC.mockRejectedValue(new Error("Permission denied"));
      renderForm();
      await userEvent.type(nameField(), "Thorin");
      await userEvent.type(lineField(), "Exiled king");
      await userEvent.click(createAndAddAnother());

      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      expect(screen.queryByText(/added/i)).not.toBeInTheDocument();
      expect(nameField()).toHaveValue("Thorin");
    });
  });

  // -------------------------------------------------------------------------
  // Note conversion
  // -------------------------------------------------------------------------
  describe("note conversion", () => {
    it("marks the source entity converted, with the new record's id", async () => {
      renderForm({ noteId: "note-7", entityId: "entity-3" });
      await userEvent.type(nameField(), "Thorin");
      await userEvent.type(lineField(), "Exiled king");
      await userEvent.click(createAndOpen());

      await waitFor(() =>
        expect(mockMarkEntityAsConverted).toHaveBeenCalledWith(
          "note-7",
          "entity-3",
          "npc-1"
        )
      );
    });

    it("does not mark anything when the surface was not opened from a note", async () => {
      renderForm();
      await userEvent.type(nameField(), "Thorin");
      await userEvent.type(lineField(), "Exiled king");
      await userEvent.click(createAndOpen());

      await waitFor(() => expect(mockAddNPC).toHaveBeenCalled());
      expect(mockMarkEntityAsConverted).not.toHaveBeenCalled();
    });

    it("writes the carried fields the surface never showed", async () => {
      renderForm({ carry: { race: "Dwarf", occupation: "King" } });
      await userEvent.type(nameField(), "Thorin");
      await userEvent.type(lineField(), "Exiled king");
      await userEvent.click(createAndOpen());

      await waitFor(() => expect(mockAddNPC).toHaveBeenCalled());
      expect(mockAddNPC.mock.calls[0][0]).toMatchObject({
        race: "Dwarf",
        occupation: "King",
      });
    });

    it("starts from the values note conversion extracted", () => {
      renderForm({ initialName: "Elrond", initialLine: "Elf lord" });
      expect(nameField()).toHaveValue("Elrond");
      expect(lineField()).toHaveValue("Elf lord");
    });
  });
});
