// src/features/user-management/profiles/components/__tests__/CharacterRow.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterRow from "../CharacterRow";

const character = { id: "char-1", name: "Gandalf" };

/**
 * Renders `CharacterRow` with sensible defaults, overridable per test.
 */
function renderRow(overrides: Partial<React.ComponentProps<typeof CharacterRow>> = {}) {
  const props: React.ComponentProps<typeof CharacterRow> = {
    character,
    isActive: false,
    isRenaming: false,
    renameDisabled: false,
    saving: false,
    onSetActive: jest.fn(),
    onStartRename: jest.fn(),
    onConfirmRename: jest.fn(),
    onCancelRename: jest.fn(),
    onRemove: jest.fn(),
    ...overrides,
  };
  render(<CharacterRow {...props} />);
  return props;
}

describe("CharacterRow", () => {
  test("renders Post as this, Rename and Remove as labelled controls", () => {
    renderRow();
    expect(screen.getByRole("button", { name: "Post as this" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  test("omits 'Post as this' on the row that is already posting", () => {
    renderRow({ isActive: true });
    expect(screen.queryByRole("button", { name: "Post as this" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  test("marks the posting row with a star and a 'posting as' marker", () => {
    const { container } = render(
      <CharacterRow
        character={character}
        isActive
        isRenaming={false}
        renameDisabled={false}
        saving={false}
        onSetActive={jest.fn()}
        onStartRename={jest.fn()}
        onConfirmRename={jest.fn()}
        onCancelRename={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    expect(screen.getByText(/posting as/i)).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  test("carries no accent ring on the active row", () => {
    render(
      <CharacterRow
        character={character}
        isActive
        isRenaming={false}
        renameDisabled={false}
        saving={false}
        onSetActive={jest.fn()}
        onStartRename={jest.fn()}
        onConfirmRename={jest.fn()}
        onCancelRename={jest.fn()}
        onRemove={jest.fn()}
      />
    );
    const row = screen.getByTestId("character-row-char-1");
    expect(row.querySelector(".selected-item")).toBeNull();
  });

  test("Remove asks for confirmation before removing", async () => {
    const onRemove = jest.fn();
    renderRow({ onRemove });
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByText(/remove gandalf\?/i)).toBeInTheDocument();
  });

  test("Cancel on the confirmation leaves the character in place", async () => {
    const onRemove = jest.fn();
    renderRow({ onRemove });
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByText(/remove gandalf\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  test("renames in the row, without touching the add field", async () => {
    const onConfirmRename = jest.fn();
    renderRow({ isRenaming: true, onConfirmRename });

    const input = screen.getByLabelText(/rename gandalf/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Saruman");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onConfirmRename).toHaveBeenCalledWith("Saruman");
    // Renaming is entirely self-contained on the row -- there is no add
    // field anywhere near it to hijack.
    expect(screen.queryByPlaceholderText(/add a character/i)).not.toBeInTheDocument();
  });

  test("renders its own failure message under the row that failed", () => {
    renderRow({ error: "Save failed" });
    expect(screen.getByText("Save failed")).toBeInTheDocument();
  });
});
