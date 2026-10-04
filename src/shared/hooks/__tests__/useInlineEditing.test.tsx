// src/shared/hooks/__tests__/useInlineEditing.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useInlineEditing } from "../useInlineEditing";

/** A page with a name that is either shown with a Rename button or edited. */
const Page: React.FC<{ hasValue?: boolean }> = ({ hasValue = true }) => {
  const { editing, setEditing, closeEditor, triggerRef } = useInlineEditing<"name" | "line">();
  const [value, setValue] = React.useState(hasValue ? "Erebor" : "");
  return (
    <>
      {editing === "name" ? (
        <>
          <input aria-label="Name" autoFocus />
          <button
            onClick={() => {
              setValue("Erebor");
              closeEditor();
            }}
          >
            Save
          </button>
          <button onClick={closeEditor}>Cancel</button>
        </>
      ) : value ? (
        <button ref={triggerRef("name")} onClick={() => setEditing("name")}>
          Rename
        </button>
      ) : (
        <button ref={triggerRef("name")} onClick={() => setEditing("name")}>
          Name this place
        </button>
      )}
      <button ref={triggerRef("line")} onClick={() => setEditing("line")}>
        Edit line
      </button>
    </>
  );
};

describe("useInlineEditing", () => {
  it("opens one editor at a time", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("returns focus to the trigger when the editor is cancelled", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Rename" })).toHaveFocus();
  });

  it("returns focus to the control that replaced the trigger after a save", () => {
    render(<Page hasValue={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Name this place" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Rename" })).toHaveFocus();
  });

  it("does not move focus when nothing was open", () => {
    render(<Page />);
    screen.getByRole("button", { name: "Edit line" }).focus();
    expect(screen.getByRole("button", { name: "Edit line" })).toHaveFocus();
  });
});
