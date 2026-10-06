// src/shared/components/inline-edit/__tests__/InlineEditor.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InlineEditor from "../InlineEditor";
import { EditConflictError } from "shared/utils/edit-conflict";

const renderEditor = (props: Partial<React.ComponentProps<typeof InlineEditor>> = {}) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const onSaved = jest.fn();
  render(
    <InlineEditor
      label="Title"
      submitLabel="Save title"
      onSubmit={onSubmit}
      onSaved={onSaved}
      onCancel={() => undefined}
      {...props}
    />
  );
  return { onSubmit, onSaved, field: screen.getByLabelText("Title") };
};

describe("InlineEditor", () => {
  describe("a required field", () => {
    it("refuses an empty value", () => {
      const { onSubmit, field } = renderEditor({ initialValue: "The Grey" });

      fireEvent.change(field, { target: { value: "   " } });

      const save = screen.getByRole("button", { name: "Save title" });
      expect(save).toBeDisabled();
      fireEvent.click(save);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("an optional field", () => {
    it("saves an emptied value as an empty string, so the fact can be retracted", async () => {
      const { onSubmit, onSaved, field } = renderEditor({
        initialValue: "Ferryman",
        optional: true,
      });

      fireEvent.change(field, { target: { value: "  " } });
      const save = screen.getByRole("button", { name: "Save title" });
      expect(save).toBeEnabled();
      fireEvent.click(save);

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      // The second argument is the text the edit started from (T083).
      expect(onSubmit).toHaveBeenCalledWith("", "Ferryman");
    });

    it("has nothing to save when it was empty and still is", () => {
      const { onSubmit } = renderEditor({ initialValue: "", optional: true });

      const save = screen.getByRole("button", { name: "Save title" });
      expect(save).toBeDisabled();
      fireEvent.click(save);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("still trims a value that is not empty", async () => {
      const { onSubmit, onSaved, field } = renderEditor({ optional: true });

      fireEvent.change(field, { target: { value: "  Innkeeper  " } });
      fireEvent.click(screen.getByRole("button", { name: "Save title" }));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(onSubmit).toHaveBeenCalledWith("Innkeeper", "");
    });
  });

  // T083: two people editing the same text from the same version.
  describe("when someone else changed the text since it opened", () => {
    const conflictOnce = () =>
      jest
        .fn()
        .mockRejectedValueOnce(new EditConflictError("The Grey Pilgrim"))
        .mockResolvedValue(undefined);

    const saveMine = async (onSubmit: jest.Mock) => {
      const { onSaved, field } = renderEditor({ initialValue: "The Grey", onSubmit });
      fireEvent.change(field, { target: { value: "Mithrandir" } });
      fireEvent.click(screen.getByRole("button", { name: "Save title" }));
      await screen.findByRole("alert");
      return { onSaved, field };
    };

    it("saves nothing, says so and shows their version beside mine", async () => {
      const onSubmit = conflictOnce();
      const { onSaved, field } = await saveMine(onSubmit);

      expect(onSubmit).toHaveBeenCalledWith("Mithrandir", "The Grey");
      expect(onSaved).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(/someone else changed this/i);
      expect(screen.getByRole("alert")).toHaveTextContent("The Grey Pilgrim");
      expect(field).toHaveValue("Mithrandir");
      // Not the generic failure: the user has a choice to make, not an error.
      expect(screen.queryByText("Not saved")).not.toBeInTheDocument();
    });

    it("holds the ordinary save until the user has chosen", async () => {
      await saveMine(conflictOnce());
      expect(screen.getByRole("button", { name: "Save title" })).toBeDisabled();
    });

    it("keep mine writes my text over theirs, knowingly", async () => {
      const onSubmit = conflictOnce();
      const { onSaved } = await saveMine(onSubmit);

      fireEvent.click(screen.getByRole("button", { name: "Keep mine" }));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      // Built on their text this time, so the check passes against it.
      expect(onSubmit).toHaveBeenLastCalledWith("Mithrandir", "The Grey Pilgrim");
    });

    it("keep theirs backs out without writing", async () => {
      const onSubmit = conflictOnce();
      const onCancel = jest.fn();
      const { field } = renderEditor({ initialValue: "The Grey", onSubmit, onCancel });
      fireEvent.change(field, { target: { value: "Mithrandir" } });
      fireEvent.click(screen.getByRole("button", { name: "Save title" }));
      await screen.findByRole("alert");

      fireEvent.click(screen.getByRole("button", { name: "Keep theirs" }));

      expect(onCancel).toHaveBeenCalled();
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("edit from theirs puts their text in the field and builds the next save on it", async () => {
      const onSubmit = conflictOnce();
      const { onSaved, field } = await saveMine(onSubmit);

      fireEvent.click(screen.getByRole("button", { name: "Edit from theirs" }));

      expect(field).toHaveValue("The Grey Pilgrim");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      fireEvent.change(field, { target: { value: "The Grey Pilgrim, Mithrandir" } });
      fireEvent.click(screen.getByRole("button", { name: "Save title" }));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(onSubmit).toHaveBeenLastCalledWith(
        "The Grey Pilgrim, Mithrandir",
        "The Grey Pilgrim"
      );
    });

    it("names an emptied field as empty rather than showing nothing", async () => {
      const onSubmit = jest.fn().mockRejectedValueOnce(new EditConflictError(""));
      await saveMine(onSubmit);
      expect(screen.getByRole("alert")).toHaveTextContent("Empty");
    });
  });
});
