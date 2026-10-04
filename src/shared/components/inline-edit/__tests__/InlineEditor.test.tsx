// src/shared/components/inline-edit/__tests__/InlineEditor.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InlineEditor from "../InlineEditor";

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
      expect(onSubmit).toHaveBeenCalledWith("");
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
      expect(onSubmit).toHaveBeenCalledWith("Innkeeper");
    });
  });
});
