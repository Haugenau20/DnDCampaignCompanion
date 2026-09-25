// src/shared/components/contact/ScreenshotField.tsx
import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ImagePlus, Trash2 } from "lucide-react";
import Button from "core/components/Button";
import Typography from "core/components/Typography";
import { images } from "core/services/firebase";
import { prepareImage, ImagePreparationError } from "core/utils/prepare-image";

/** A screenshot already uploaded, waiting for the form to be sent. */
export interface AttachedScreenshot {
  /** Where it was uploaded; sent to `sendContactEmail` as `screenshotPath`. */
  path: string;
  /**
   * A local `blob:` URL of the prepared image, for the preview. The rules let
   * nobody read `support/`, so there is no download URL to show instead.
   */
  previewUrl: string;
}

export interface ScreenshotFieldProps {
  /** The attached screenshot, or null. Held by the form, which sends it. */
  value: AttachedScreenshot | null;
  onChange: (value: AttachedScreenshot | null) => void;
  /** Told when an upload starts and ends, so the form can hold its submit. */
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}

type Phase =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "uploading"; fraction: number };

const UPLOAD_FAILED = "Couldn't upload the screenshot. Please try again.";

/**
 * Delete an uploaded screenshot nobody will send. A failure only leaves a file
 * the daily sweep removes after a day, so it is logged rather than shown.
 *
 * @param path - The screenshot's path
 */
const discard = (path: string) => {
  images.remove(path).catch((error) =>
    console.warn(`Could not delete screenshot ${path}; the sweep will.`, error)
  );
};

/**
 * The first image file in a drop or a paste, if there is one.
 *
 * @param files - The event's files
 * @returns The image, or null
 */
const firstImage = (files: FileList | null | undefined): File | null =>
  Array.from(files ?? []).find((file) => file.type.startsWith("image/")) ?? null;

/**
 * Attach one screenshot to a contact message (T020).
 *
 * The file is prepared and uploaded as soon as it is picked, dropped or
 * pasted, so the wait happens while the sender is still writing, not after
 * they press Send. `sendContactEmail` attaches it to the email and deletes
 * it; a screenshot the sender takes back off is deleted here, and one nobody
 * sends is swept after a day.
 *
 * Paste is listened for on the whole page: a screenshot usually arrives on
 * the clipboard, and pasting an image into the message box does nothing
 * anyway. Pasted text is never touched.
 */
const ScreenshotField: React.FC<ScreenshotFieldProps> = ({
  value,
  onChange,
  onBusyChange,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const busy = phase.kind !== "idle";
  const blocked = busy || disabled;

  // The latest props, for the paste listener, which is added once.
  const latest = useRef({ value, onChange, onBusyChange, blocked });
  latest.current = { value, onChange, onBusyChange, blocked };

  // Each preview URL holds its image in memory until revoked.
  const previewUrl = value?.previewUrl;
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  /**
   * Prepare and upload a file, then replace whatever was attached.
   *
   * @param file - The picked, dropped or pasted file
   */
  const attach = async (file: File) => {
    const { value: previous, onChange: change, onBusyChange: tell } = latest.current;
    setError(null);
    setPhase({ kind: "preparing" });
    tell?.(true);
    try {
      const prepared = await prepareImage(file);
      setPhase({ kind: "uploading", fraction: 0 });
      const path = await images.uploadScreenshot(prepared, (fraction) =>
        setPhase({ kind: "uploading", fraction })
      );
      change({ path, previewUrl: URL.createObjectURL(prepared.blob) });
      if (previous) discard(previous.path);
    } catch (err) {
      console.error("Error attaching screenshot:", err);
      setError(err instanceof ImagePreparationError ? err.message : UPLOAD_FAILED);
    } finally {
      setPhase({ kind: "idle" });
      tell?.(false);
    }
  };

  const attachRef = useRef(attach);
  attachRef.current = attach;

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (latest.current.blocked) return;
      const file = firstImage(event.clipboardData?.files);
      if (!file) return;
      event.preventDefault();
      void attachRef.current(file);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared at once, so picking the same file again still fires `change`.
    event.target.value = "";
    if (file) void attach(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (blocked) return;
    const file = firstImage(event.dataTransfer.files);
    if (file) {
      void attach(file);
    } else {
      setError("That isn't an image. Please drop a screenshot.");
    }
  };

  const handleRemove = () => {
    if (!value) return;
    discard(value.path);
    onChange(null);
    setError(null);
  };

  const pick = () => inputRef.current?.click();

  return (
    <div className="space-y-2">
      <Typography variant="body-sm" className="form-label">
        Screenshot{" "}
        <Typography as="span" variant="body-sm" color="secondary">
          (optional)
        </Typography>
      </Typography>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePick}
        aria-label="Choose a screenshot"
        data-testid="screenshot-input"
      />

      {value ? (
        <div className="flex flex-wrap items-end gap-3">
          <img
            src={value.previewUrl}
            alt="The screenshot you attached"
            className="max-h-40 max-w-full rounded-md border card-border object-contain"
          />
          {/* Wraps whole buttons rather than their labels: at 320px the
              pair is wider than the card. */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              startIcon={<ImagePlus size={16} aria-hidden="true" />}
              onClick={pick}
              disabled={blocked}
            >
              Replace screenshot
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="whitespace-nowrap"
              startIcon={<Trash2 size={16} aria-hidden="true" />}
              onClick={handleRemove}
              disabled={blocked}
            >
              Remove screenshot
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={blocked}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          data-testid="screenshot-drop-zone"
          className={clsx(
            "flex items-center gap-2 w-full text-left px-3 py-4 rounded-md",
            "border border-dashed card-border selectable-item typography-secondary",
            dragging && "selected-item"
          )}
        >
          <ImagePlus size={16} aria-hidden="true" className="shrink-0" />
          <span className="text-sm">
            Attach a screenshot — click, drop one here, or paste it
          </span>
        </button>
      )}

      {busy && (
        <Typography variant="body-sm" color="muted" role="status">
          {phase.kind === "uploading"
            ? `Uploading… ${Math.round(phase.fraction * 100)}%`
            : "Preparing…"}
        </Typography>
      )}

      {error && (
        <Typography variant="body-sm" color="error" role="alert">
          {error}
        </Typography>
      )}

      <Typography variant="body-sm" color="secondary">
        It's shrunk and stripped of hidden details first, sent to us with your
        message, and then deleted.
      </Typography>
    </div>
  );
};

export default ScreenshotField;
