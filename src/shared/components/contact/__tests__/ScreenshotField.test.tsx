// src/shared/components/contact/__tests__/ScreenshotField.test.tsx
import React, { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScreenshotField, { AttachedScreenshot } from "../ScreenshotField";
import { ImagePreparationError } from "core/utils/prepare-image";

const mockUploadScreenshot = jest.fn();
const mockRemove = jest.fn();
const mockPrepareImage = jest.fn();

jest.mock("core/services/firebase", () => ({
  images: {
    uploadScreenshot: (...args: unknown[]) => mockUploadScreenshot(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

jest.mock("core/utils/prepare-image", () => {
  const actual = jest.requireActual("core/utils/prepare-image");
  return { ...actual, prepareImage: (...args: unknown[]) => mockPrepareImage(...args) };
});

const PREPARED = {
  blob: new Blob(["x"], { type: "image/webp" }),
  width: 1600,
  height: 900,
  contentType: "image/webp",
  extension: "webp",
};

const png = (name = "shot.png") => new File(["png"], name, { type: "image/png" });

let objectUrls = 0;
const mockRevoke = jest.fn();

/** The field under a parent that holds its value, as the form does. */
function Harness(props: {
  initial?: AttachedScreenshot | null;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onChange?: (value: AttachedScreenshot | null) => void;
}) {
  const [value, setValue] = useState<AttachedScreenshot | null>(props.initial ?? null);
  return (
    <ScreenshotField
      value={value}
      onChange={(next) => {
        props.onChange?.(next);
        setValue(next);
      }}
      onBusyChange={props.onBusyChange}
      disabled={props.disabled}
    />
  );
}

/**
 * Paste `files` on the page, as a sender pressing Ctrl+V would.
 *
 * @param files - What the clipboard holds
 */
function paste(files: File[]) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { files } });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  objectUrls = 0;
  URL.createObjectURL = jest.fn(() => `blob:preview-${++objectUrls}`);
  URL.revokeObjectURL = mockRevoke;
  mockPrepareImage.mockResolvedValue(PREPARED);
  mockUploadScreenshot.mockResolvedValue("support/u1/new.webp");
  mockRemove.mockResolvedValue(undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("ScreenshotField", () => {
  it("offers a drop zone, and says what happens to the file", () => {
    render(<Harness />);

    expect(screen.getByRole("button", { name: /Attach a screenshot/ })).toBeInTheDocument();
    expect(screen.getByText(/then deleted/)).toBeInTheDocument();
  });

  it("prepares and uploads a picked file, then shows a local preview", async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.upload(screen.getByTestId("screenshot-input"), png());

    const preview = await screen.findByAltText("The screenshot you attached");
    expect(preview).toHaveAttribute("src", "blob:preview-1");
    expect(mockPrepareImage).toHaveBeenCalledWith(expect.any(File));
    expect(mockUploadScreenshot).toHaveBeenCalledWith(PREPARED, expect.any(Function));
    expect(onChange).toHaveBeenCalledWith({
      path: "support/u1/new.webp",
      previewUrl: "blob:preview-1",
    });
  });

  it("tells the form while it is busy, and when it is done", async () => {
    const onBusyChange = jest.fn();
    render(<Harness onBusyChange={onBusyChange} />);

    await userEvent.upload(screen.getByTestId("screenshot-input"), png());
    await screen.findByAltText("The screenshot you attached");

    expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
  });

  it("shows upload progress", async () => {
    let report: (fraction: number) => void = () => undefined;
    let finish: (path: string) => void = () => undefined;
    mockUploadScreenshot.mockImplementation((_image, onProgress) => {
      report = onProgress;
      return new Promise((resolve) => (finish = resolve));
    });
    render(<Harness />);

    await userEvent.upload(screen.getByTestId("screenshot-input"), png());
    await waitFor(() => expect(mockUploadScreenshot).toHaveBeenCalled());
    act(() => report(0.4));

    expect(screen.getByRole("status")).toHaveTextContent("Uploading… 40%");

    await act(async () => finish("support/u1/new.webp"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows prepareImage's own words when a file can't be used", async () => {
    mockPrepareImage.mockRejectedValue(new ImagePreparationError("svg"));
    render(<Harness />);

    await userEvent.upload(screen.getByTestId("screenshot-input"), png());

    expect(await screen.findByRole("alert")).toHaveTextContent(/SVG images aren't supported/);
    expect(mockUploadScreenshot).not.toHaveBeenCalled();
  });

  it("says so when the upload fails, and attaches nothing", async () => {
    mockUploadScreenshot.mockRejectedValue(new Error("storage/unauthorized"));
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.upload(screen.getByTestId("screenshot-input"), png());

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't upload the screenshot");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("takes an image dropped on the zone", async () => {
    render(<Harness />);

    fireEvent.drop(screen.getByTestId("screenshot-drop-zone"), {
      dataTransfer: { files: [png()] },
    });

    expect(await screen.findByAltText("The screenshot you attached")).toBeInTheDocument();
  });

  it("refuses a dropped file that isn't an image", async () => {
    render(<Harness />);

    fireEvent.drop(screen.getByTestId("screenshot-drop-zone"), {
      dataTransfer: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("That isn't an image");
    expect(mockPrepareImage).not.toHaveBeenCalled();
  });

  it("takes an image pasted anywhere on the page", async () => {
    render(<Harness />);

    const event = paste([png()]);

    expect(await screen.findByAltText("The screenshot you attached")).toBeInTheDocument();
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves a paste with no image alone -- text still pastes into the message", () => {
    render(<Harness />);

    const event = paste([]);

    expect(event.defaultPrevented).toBe(false);
    expect(mockPrepareImage).not.toHaveBeenCalled();
  });

  it("ignores a pasted image while the form is sending", () => {
    render(<Harness disabled />);

    paste([png()]);

    expect(mockPrepareImage).not.toHaveBeenCalled();
  });

  it("stops listening for paste once it is gone", () => {
    const { unmount } = render(<Harness />);
    unmount();

    paste([png()]);

    expect(mockPrepareImage).not.toHaveBeenCalled();
  });

  describe("with a screenshot attached", () => {
    const attached = { path: "support/u1/old.webp", previewUrl: "blob:old" };

    it("removes it: the file is deleted and the drop zone is back", async () => {
      const onChange = jest.fn();
      render(<Harness initial={attached} onChange={onChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Remove screenshot" }));

      expect(mockRemove).toHaveBeenCalledWith("support/u1/old.webp");
      expect(onChange).toHaveBeenCalledWith(null);
      expect(screen.getByRole("button", { name: /Attach a screenshot/ })).toBeInTheDocument();
    });

    it("still removes it from the form when the delete fails -- the sweep takes the file", async () => {
      mockRemove.mockRejectedValue(new Error("offline"));
      render(<Harness initial={attached} />);

      await userEvent.click(screen.getByRole("button", { name: "Remove screenshot" }));

      expect(screen.queryByAltText("The screenshot you attached")).not.toBeInTheDocument();
    });

    it("frees the preview's memory once it is removed", async () => {
      render(<Harness initial={attached} />);

      await userEvent.click(screen.getByRole("button", { name: "Remove screenshot" }));

      expect(mockRevoke).toHaveBeenCalledWith("blob:old");
    });

    it("replaces it: the new one is attached, then the old file deleted", async () => {
      const onChange = jest.fn();
      render(<Harness initial={attached} onChange={onChange} />);

      await userEvent.upload(screen.getByTestId("screenshot-input"), png());

      await waitFor(() => expect(mockRemove).toHaveBeenCalledWith("support/u1/old.webp"));
      expect(onChange).toHaveBeenCalledWith({
        path: "support/u1/new.webp",
        previewUrl: "blob:preview-1",
      });
    });

    it("keeps the old one when a replacement fails", async () => {
      mockUploadScreenshot.mockRejectedValue(new Error("boom"));
      render(<Harness initial={attached} />);

      await userEvent.upload(screen.getByTestId("screenshot-input"), png());

      await screen.findByRole("alert");
      expect(mockRemove).not.toHaveBeenCalled();
      expect(screen.getByAltText("The screenshot you attached")).toHaveAttribute("src", "blob:old");
    });

    it("can't be removed while the form is sending", () => {
      render(<Harness initial={attached} disabled />);

      expect(screen.getByRole("button", { name: "Remove screenshot" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Replace screenshot" })).toBeDisabled();
    });
  });
});
