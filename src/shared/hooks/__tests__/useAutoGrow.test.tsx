// src/shared/hooks/__tests__/useAutoGrow.test.tsx

import React, { useRef, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useAutoGrow } from "../useAutoGrow";

/**
 * jsdom does no layout, so every size reads 0. Give textareas a content height
 * that follows their value (one pixel per character, so the arithmetic is
 * visible) and a one-pixel border on each side, the way the app's `Input` has.
 */
const BORDER = 2;
const stubbed = ["scrollHeight", "offsetHeight", "clientHeight"] as const;
const originals = stubbed.map((key) => [
  key,
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, key),
] as const);

beforeAll(() => {
  Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
    configurable: true,
    get(this: HTMLTextAreaElement) {
      return this.value.length;
    },
  });
  Object.defineProperty(HTMLTextAreaElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 40 + BORDER,
  });
  Object.defineProperty(HTMLTextAreaElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 40,
  });
});

afterAll(() => {
  for (const [key, descriptor] of originals) {
    if (descriptor) {
      Object.defineProperty(HTMLTextAreaElement.prototype, key, descriptor);
    } else {
      delete (HTMLTextAreaElement.prototype as unknown as Record<string, unknown>)[key];
    }
  }
});

/** A textarea driven by the hook, as `QuickAddForm` and `NoteEditor` use it. */
const Harness: React.FC<{ initial: string }> = ({ initial }) => {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(ref, value);
  return (
    <textarea
      aria-label="Body"
      ref={ref}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
};

const body = () => screen.getByLabelText("Body") as HTMLTextAreaElement;

describe("useAutoGrow", () => {
  test("sizes the box to its content on mount, border included", () => {
    render(<Harness initial={"x".repeat(300)} />);
    // Content plus padding is 300; the border-box needs the border on top, or
    // the last line sits two pixels under a scrollbar.
    expect(body().style.height).toBe(`${300 + BORDER}px`);
  });

  test("grows as text is added", () => {
    render(<Harness initial="short" />);
    fireEvent.change(body(), { target: { value: "x".repeat(500) } });
    expect(body().style.height).toBe(`${500 + BORDER}px`);
  });

  test("shrinks again when text is removed", () => {
    render(<Harness initial={"x".repeat(500)} />);
    fireEvent.change(body(), { target: { value: "x".repeat(120) } });
    expect(body().style.height).toBe(`${120 + BORDER}px`);
  });
});
