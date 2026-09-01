// src/features/user-management/profiles/components/__tests__/CharacterRow.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterRow from "../CharacterRow";

const character = { id: "char-1", name: "Gandalf" };

describe("CharacterRow", () => {
  test("renders the character's name", () => {
    render(
      <CharacterRow
        character={character}
        isActive={false}
        isEditingOther={false}
        saving={false}
        onSetActive={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Gandalf")).toBeInTheDocument();
  });

  test("shows a Set Active button when not the active character", async () => {
    const onSetActive = jest.fn();
    render(
      <CharacterRow
        character={character}
        isActive={false}
        isEditingOther={false}
        saving={false}
        onSetActive={onSetActive}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /set active/i }));
    expect(onSetActive).toHaveBeenCalledTimes(1);
  });

  test("hides Set Active when this row is already the active character", () => {
    render(
      <CharacterRow
        character={character}
        isActive
        isEditingOther={false}
        saving={false}
        onSetActive={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /set active/i })).not.toBeInTheDocument();
  });

  test("calls onEdit and onDelete for their respective buttons", async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <CharacterRow
        character={character}
        isActive={false}
        isEditingOther={false}
        saving={false}
        onSetActive={jest.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
    const buttons = screen.getAllByRole("button");
    // Edit is the icon button before Delete (last button in the row).
    await userEvent.click(buttons[buttons.length - 2]);
    expect(onEdit).toHaveBeenCalledTimes(1);
    await userEvent.click(buttons[buttons.length - 1]);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test("disables its edit button while another row is being edited", () => {
    render(
      <CharacterRow
        character={character}
        isActive={false}
        isEditingOther
        saving={false}
        onSetActive={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[buttons.length - 2]).toBeDisabled();
  });
});
