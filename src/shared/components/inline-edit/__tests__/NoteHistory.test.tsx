// src/shared/components/inline-edit/__tests__/NoteHistory.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import NoteHistory from "../NoteHistory";

// The real Dialog portals and traps focus; what is under test here is what
// the note list asks it to say and do.
jest.mock("core/components/Dialog", () => ({
  __esModule: true,
  default: ({ open, title, children }: any) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

const notes = [
  { date: "2025-04-02", text: "An older note, no author recorded." },
  { date: "2025-05-31", text: "Rode to Isengard.", author: "Zendikarr" },
];

const renderHistory = (props: Partial<React.ComponentProps<typeof NoteHistory>> = {}) => {
  const onEdit = jest.fn().mockResolvedValue(undefined);
  const onDelete = jest.fn().mockResolvedValue(undefined);
  const onSaved = jest.fn();
  render(
    <NoteHistory
      notes={notes}
      canEdit
      onEdit={onEdit}
      onDelete={onDelete}
      onSaved={onSaved}
      {...props}
    />
  );
  return { onEdit, onDelete, onSaved };
};

describe("NoteHistory", () => {
  it("shows each note's text and author, leaving an old note uncredited", () => {
    renderHistory();
    expect(screen.getByText("Rode to Isengard.")).toBeInTheDocument();
    expect(screen.getByText("Zendikarr")).toBeInTheDocument();
    expect(screen.getByText("An older note, no author recorded.")).toBeInTheDocument();
  });

  it("offers no way to change a note to someone who cannot edit the page", () => {
    renderHistory({ canEdit: false });
    expect(screen.queryByRole("button", { name: /edit the note/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete the note/i })).not.toBeInTheDocument();
  });

  it("names each row's actions by the note's date", () => {
    renderHistory();
    expect(screen.getAllByRole("button", { name: /^Edit the note from / })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^Delete the note from / })).toHaveLength(2);
  });

  describe("editing", () => {
    it("opens an editor holding the note's current text", () => {
      renderHistory();
      fireEvent.click(screen.getAllByRole("button", { name: /^Edit the note from / })[1]);
      expect(screen.getByRole("textbox")).toHaveValue("Rode to Isengard.");
    });

    it("hands the page the note it came from and the new text", async () => {
      const { onEdit, onSaved } = renderHistory();
      fireEvent.click(screen.getAllByRole("button", { name: /^Edit the note from / })[1]);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rode to Orthanc." } });
      fireEvent.click(screen.getByRole("button", { name: "Save note" }));

      await waitFor(() => expect(onEdit).toHaveBeenCalledWith(notes[1], "Rode to Orthanc."));
      await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
      expect(onSaved).toHaveBeenCalled();
    });

    it("returns focus to the row's Edit button when the editor closes", async () => {
      renderHistory();
      fireEvent.click(screen.getAllByRole("button", { name: /^Edit the note from / })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: /^Edit the note from / })[0]).toHaveFocus()
      );
    });

    it("writes nothing when cancelled", () => {
      const { onEdit } = renderHistory();
      fireEvent.click(screen.getAllByRole("button", { name: /^Edit the note from / })[0]);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "Discarded." } });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onEdit).not.toHaveBeenCalled();
      expect(screen.getByText("An older note, no author recorded.")).toBeInTheDocument();
    });

    it("keeps the typed text and says why when the write is refused", async () => {
      const onEdit = jest.fn().mockRejectedValue(new Error("This note was changed by someone else."));
      renderHistory({ onEdit });
      fireEvent.click(screen.getAllByRole("button", { name: /^Edit the note from / })[0]);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "My fix." } });
      fireEvent.click(screen.getByRole("button", { name: "Save note" }));

      expect(await screen.findByText("This note was changed by someone else.")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("My fix.");
    });
  });

  describe("deleting", () => {
    it("asks first, naming the note by its date", () => {
      const { onDelete } = renderHistory();
      fireEvent.click(screen.getAllByRole("button", { name: /^Delete the note from / })[1]);
      const dialog = screen.getByRole("dialog", { name: "Delete note?" });
      expect(within(dialog).getByText(/is removed for everyone\. This cannot be undone\./)).toBeInTheDocument();
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("hands the page the note once confirmed, then closes", async () => {
      const { onDelete } = renderHistory();
      fireEvent.click(screen.getAllByRole("button", { name: /^Delete the note from / })[1]);
      fireEvent.click(screen.getByRole("button", { name: "Delete note" }));
      await waitFor(() => expect(onDelete).toHaveBeenCalledWith(notes[1]));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("writes nothing when cancelled", () => {
      const { onDelete } = renderHistory();
      fireEvent.click(screen.getAllByRole("button", { name: /^Delete the note from / })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onDelete).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("can delete a second note after the first, without a stuck spinner", async () => {
      const { onDelete } = renderHistory();
      fireEvent.click(screen.getAllByRole("button", { name: /^Delete the note from / })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Delete note" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      fireEvent.click(screen.getAllByRole("button", { name: /^Delete the note from / })[1]);
      const confirm = screen.getByRole("button", { name: "Delete note" });
      expect(confirm).not.toBeDisabled();
      fireEvent.click(confirm);
      await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(2));
    });

    it("says why when the delete is refused, and keeps the dialog open", async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error("Permission denied"));
      renderHistory({ onDelete });
      fireEvent.click(screen.getAllByRole("button", { name: /^Delete the note from / })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Delete note" }));
      expect(await screen.findByText("Permission denied")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
