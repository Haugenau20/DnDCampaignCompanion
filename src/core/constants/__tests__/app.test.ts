// src/core/constants/__tests__/app.test.ts
import { isPreviewBuild } from "../app";

describe("isPreviewBuild", () => {
  afterEach(() => {
    delete process.env.REACT_APP_PREVIEW;
  });

  it("is true only when the preview workflow says so", () => {
    process.env.REACT_APP_PREVIEW = "true";
    expect(isPreviewBuild()).toBe(true);
  });

  it("is false when unset, as on the live deploy and the dev server", () => {
    expect(isPreviewBuild()).toBe(false);
  });

  it("is false for any other value", () => {
    process.env.REACT_APP_PREVIEW = "1";
    expect(isPreviewBuild()).toBe(false);
  });
});
