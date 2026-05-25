// src/components/core/__tests__/Dialog.test.tsx
// Behavioral tests for Dialog component.
//
// KNOWN LIMITATION: Dialog renders via createPortal into a <div> that is
// created inside a useEffect. Because the portal container is created
// asynchronously (after mount) and `open` is checked AFTER the container
// exists, many tests must open the dialog by toggling state rather than
// passing `open=true` on first render. The afterEach block does NOT manually
// clean portals — the component's own useEffect cleanup handles removal on
// unmount, which React Testing Library triggers via cleanup().
//
// Bug #100 documents the root cause: the portal ref pattern means content is
// invisible on first render even when open=true.

import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dialog from "../Dialog";

// ---------------------------------------------------------------------------
// Helper wrapper — allows toggling open state to trigger portal creation
// ---------------------------------------------------------------------------
function DialogHarness({
  onClose = jest.fn(),
  title,
  children = <p>Dialog body</p>,
  maxWidth,
  isNested,
}: {
  onClose?: jest.Mock;
  title?: string;
  children?: React.ReactNode;
  maxWidth?: string;
  isNested?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const handleClose = () => {
    onClose();
    setOpen(false);
  };
  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="open-trigger">
        Open
      </button>
      <Dialog
        open={open}
        onClose={handleClose}
        title={title}
        maxWidth={maxWidth}
        isNested={isNested}
      >
        {children}
      </Dialog>
    </>
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("open-trigger"));
}

describe("Dialog", () => {
  // -------------------------------------------------------------------------
  // Closed state
  // -------------------------------------------------------------------------
  describe("closed state", () => {
    test("should NOT render dialog content when dialog has never been opened", () => {
      render(<DialogHarness title="My Dialog" />);
      expect(screen.queryByText("My Dialog")).not.toBeInTheDocument();
    });

    test("should NOT render a close button when closed", () => {
      render(<DialogHarness />);
      expect(
        screen.queryByRole("button", { name: /close dialog/i })
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Open state — via state toggle so portal is created first
  // -------------------------------------------------------------------------
  describe("open state", () => {
    test("should render dialog content after being opened", async () => {
      const user = userEvent.setup();
      render(<DialogHarness title="Hello Dialog" />);

      await openDialog(user);

      await waitFor(() => {
        expect(screen.getByText("Hello Dialog")).toBeInTheDocument();
      });
    });

    test("should render children content when open", async () => {
      const user = userEvent.setup();
      render(
        <DialogHarness>
          <p data-testid="dialog-child">Child content</p>
        </DialogHarness>
      );

      await openDialog(user);

      await waitFor(() => {
        expect(screen.getByTestId("dialog-child")).toBeInTheDocument();
      });
    });

    test("should NOT render title element when title prop is omitted", async () => {
      const user = userEvent.setup();
      render(
        <DialogHarness>
          <p>Content only</p>
        </DialogHarness>
      );

      await openDialog(user);

      await waitFor(() => {
        // "Content only" should be visible
        expect(screen.getByText("Content only")).toBeInTheDocument();
      });
      // No heading element
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Close button
  // -------------------------------------------------------------------------
  describe("close button", () => {
    test("should render a close button with aria-label=Close dialog when open", async () => {
      const user = userEvent.setup();
      render(<DialogHarness title="Closeable" />);

      await openDialog(user);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /close dialog/i })
        ).toBeInTheDocument();
      });
    });

    test("should call onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<DialogHarness onClose={onClose} title="Test" />);

      await openDialog(user);
      await waitFor(() =>
        screen.getByRole("button", { name: /close dialog/i })
      );

      await user.click(screen.getByRole("button", { name: /close dialog/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Backdrop click
  // -------------------------------------------------------------------------
  describe("backdrop click", () => {
    test("should call onClose when clicking the overlay (outside dialog panel)", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(
        <DialogHarness onClose={onClose} title="Backdrop Test">
          <p>Content</p>
        </DialogHarness>
      );

      await openDialog(user);

      await waitFor(() => {
        const overlay = document.body.querySelector(
          "[data-testid^='dialog-overlay-']"
        );
        expect(overlay).toBeTruthy();
      });

      const overlay = document.body.querySelector(
        "[data-testid^='dialog-overlay-']"
      ) as HTMLElement;
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("should NOT call onClose when clicking inside the dialog content area", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(
        <DialogHarness onClose={onClose} title="Inner Click">
          <p data-testid="inner">Inner</p>
        </DialogHarness>
      );

      await openDialog(user);

      await waitFor(() => screen.getByTestId("inner"));

      fireEvent.click(screen.getByTestId("inner"));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Escape key
  // -------------------------------------------------------------------------
  describe("escape key", () => {
    test("should call onClose when Escape key is pressed while open", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<DialogHarness onClose={onClose} title="Escape Test" />);

      await openDialog(user);

      await waitFor(() =>
        screen.getByRole("button", { name: /close dialog/i })
      );

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Portal creation
  // -------------------------------------------------------------------------
  describe("portal creation", () => {
    test("should append a portal root div to document.body on mount", () => {
      render(<DialogHarness />);
      const portals = document.body.querySelectorAll(
        ".root-dialog-root, .nested-dialog-root"
      );
      expect(portals.length).toBeGreaterThanOrEqual(1);
    });

    test("should mark portal as root-dialog-root by default", () => {
      render(<DialogHarness />);
      expect(
        document.body.querySelector(".root-dialog-root")
      ).toBeInTheDocument();
    });

    test("should mark portal as nested-dialog-root when isNested=true", () => {
      render(<DialogHarness isNested />);
      expect(
        document.body.querySelector(".nested-dialog-root")
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // maxWidth prop
  // -------------------------------------------------------------------------
  describe("maxWidth prop", () => {
    test("should apply custom maxWidth class to the dialog panel when open", async () => {
      const user = userEvent.setup();
      render(
        <DialogHarness title="Wide" maxWidth="max-w-2xl">
          <p>Content</p>
        </DialogHarness>
      );

      await openDialog(user);

      await waitFor(() => {
        const panel = document.body.querySelector(".max-w-2xl");
        expect(panel).toBeInTheDocument();
      });
    });

    test("should apply default max-w-md class when maxWidth is not specified", async () => {
      const user = userEvent.setup();
      render(
        <DialogHarness title="Default width">
          <p>Content</p>
        </DialogHarness>
      );

      await openDialog(user);

      await waitFor(() => {
        const panel = document.body.querySelector(".max-w-md");
        expect(panel).toBeInTheDocument();
      });
    });
  });
});
