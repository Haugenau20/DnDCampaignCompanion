// src/shared/components/context-switcher/__tests__/UndoToast.test.tsx

import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UndoToast from "../UndoToast";

describe("UndoToast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("names what was switched to", () => {
    render(
      <UndoToast label="The Hobbit" onUndo={jest.fn()} onDismiss={jest.fn()} />
    );

    expect(screen.getByText(/Switched to/)).toBeInTheDocument();
    expect(screen.getByText("The Hobbit")).toBeInTheDocument();
  });

  test("offers a single Undo action", async () => {
    const onUndo = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <UndoToast label="The Hobbit" onUndo={onUndo} onDismiss={jest.fn()} />
    );

    await user.click(screen.getByRole("button", { name: /undo/i }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  test("dismisses itself after the duration", () => {
    const onDismiss = jest.fn();

    render(
      <UndoToast
        label="The Hobbit"
        onUndo={jest.fn()}
        onDismiss={onDismiss}
        duration={6000}
      />
    );

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("does not dismiss after unmounting", () => {
    const onDismiss = jest.fn();

    const { unmount } = render(
      <UndoToast
        label="The Hobbit"
        onUndo={jest.fn()}
        onDismiss={onDismiss}
        duration={6000}
      />
    );

    unmount();

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("reports a failed undo instead of the confirmation", () => {
    render(
      <UndoToast
        label="The Hobbit"
        error="Could not switch back."
        onUndo={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText("Could not switch back.")).toBeInTheDocument();
    expect(screen.queryByText(/Switched to/)).not.toBeInTheDocument();
  });

  test("announces itself politely to assistive technology", () => {
    render(
      <UndoToast label="The Hobbit" onUndo={jest.fn()} onDismiss={jest.fn()} />
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
