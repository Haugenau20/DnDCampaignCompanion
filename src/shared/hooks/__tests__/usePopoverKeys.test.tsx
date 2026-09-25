// src/shared/hooks/__tests__/usePopoverKeys.test.tsx

import React, { useRef, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { usePopoverKeys } from "../usePopoverKeys";

/** A minimal popover that uses the hook exactly as ContextSwitcher does. */
const Harness: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setIsOpen(false);
    onClose?.();
  };

  usePopoverKeys({ isOpen, panelRef, triggerRef, onClose: close });

  return (
    <div>
      <button ref={triggerRef}>Trigger</button>
      {isOpen && (
        <div ref={panelRef} role="menu">
          <button role="menuitem">First</button>
          <button role="menuitem">Second</button>
          <button role="menuitem">Third</button>
        </div>
      )}
    </div>
  );
};

/**
 * A popover whose rows mix the three menu item roles, the way the account
 * menu mixes plain rows with its theme switch's radio items.
 */
const MixedRowsHarness: React.FC = () => {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  usePopoverKeys({ isOpen: true, panelRef, triggerRef, onClose: () => {} });

  return (
    <div>
      <button ref={triggerRef}>Trigger</button>
      <div ref={panelRef} role="menu">
        <button role="menuitem">Plain</button>
        <div role="group" aria-label="Theme">
          <button role="menuitemradio" aria-checked="true">Light</button>
          <button role="menuitemradio" aria-checked="false">Dark</button>
        </div>
        <button role="menuitemcheckbox" aria-checked="false">Toggle</button>
        <button>Not a row</button>
      </div>
    </div>
  );
};

describe("usePopoverKeys", () => {
  test("walks radio and checkbox items as rows, and skips non-rows", () => {
    render(<MixedRowsHarness />);
    expect(screen.getByText("Plain")).toHaveFocus();

    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("Light")).toHaveFocus();
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("Dark")).toHaveFocus();
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("Toggle")).toHaveFocus();
    // Wraps past the plain button, which is not a menu row.
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("Plain")).toHaveFocus();
  });


  test("moves focus into the popover when it opens", () => {
    render(<Harness />);
    expect(screen.getByText("First")).toHaveFocus();
  });

  test("ArrowDown moves to the next row", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("Second")).toHaveFocus();
  });

  test("ArrowDown wraps from the last row to the first", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "End" });
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("First")).toHaveFocus();
  });

  test("ArrowUp moves to the previous row", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "ArrowUp" });
    expect(screen.getByText("First")).toHaveFocus();
  });

  test("ArrowUp wraps from the first row to the last", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "ArrowUp" });
    expect(screen.getByText("Third")).toHaveFocus();
  });

  test("Home and End jump to the ends", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "End" });
    expect(screen.getByText("Third")).toHaveFocus();
    fireEvent.keyDown(document, { key: "Home" });
    expect(screen.getByText("First")).toHaveFocus();
  });

  test("Tab stays inside the popover", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "End" });
    fireEvent.keyDown(document, { key: "Tab" });
    // The page behind is still visible; tabbing out of a popover that covers
    // it would strand the keyboard user outside a panel they cannot see.
    expect(screen.getByText("First")).toHaveFocus();
  });

  test("Escape closes and returns focus to the trigger", () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Trigger")).toHaveFocus();
  });

  test("does nothing while closed", () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    onClose.mockClear();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});
