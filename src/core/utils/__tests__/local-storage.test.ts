// src/core/utils/__tests__/local-storage.test.ts
import { readLocalStorage, writeLocalStorage } from "../local-storage";

describe("local-storage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  test("reads and writes through to localStorage", () => {
    expect(writeLocalStorage("k", "v")).toBe(true);
    expect(readLocalStorage("k")).toBe("v");
    expect(readLocalStorage("missing")).toBeNull();
  });

  test("an unreadable store reads as empty", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    expect(readLocalStorage("k")).toBeNull();
  });

  test("a refused write reports false instead of throwing", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    expect(writeLocalStorage("k", "v")).toBe(false);
  });
});
