// src/features/campaign-entities/rumors/hooks/__tests__/useCreateRumor.test.ts
import { renderHook, act } from "@testing-library/react";
import { useCreateRumor } from "../useCreateRumor";

jest.mock("shared/hooks/useNavigation", () => ({ useNavigation: jest.fn() }));
jest.mock("../../context/RumorContext", () => ({ useRumors: jest.fn() }));

const { useNavigation } = require("shared/hooks/useNavigation");
const { useRumors } = require("../../context/RumorContext");

const mockAddRumor = jest.fn();
const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn(
  (path: string, _p: unknown, query?: Record<string, string>) =>
    query ? `${path}?${new URLSearchParams(query).toString()}` : path
);

beforeEach(() => {
  jest.clearAllMocks();
  mockAddRumor.mockResolvedValue("new-rumor");
  (useRumors as jest.Mock).mockReturnValue({ addRumor: mockAddRumor });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    createPath: mockCreatePath,
  });
});

/**
 * The global create menu used to send a rumour to `/rumors/create`. A rumour
 * is the one entity with no page, so there was never anywhere for it to land.
 */
describe("useCreateRumor", () => {
  test("writes an empty rumour and lands on its row in the list", async () => {
    const { result } = renderHook(() => useCreateRumor());
    await act(() => result.current.createAndOpen());

    expect(mockAddRumor).toHaveBeenCalledWith(
      expect.objectContaining({ title: "", content: "", status: "unconfirmed" })
    );
    expect(mockNavigateToPage).toHaveBeenCalledWith("/rumors?highlight=new-rumor");
  });

  test("never goes to the retired create route", async () => {
    const { result } = renderHook(() => useCreateRumor());
    await act(() => result.current.createAndOpen());

    expect(mockNavigateToPage).not.toHaveBeenCalledWith("/rumors/create");
  });

  test("invents no placeholder title", () => {
    // A stored "New rumour" is indistinguishable from one somebody typed,
    // which is the mistake the notes side is still cleaning up after with
    // LEGACY_DEFAULT_TITLE. The list renders the absence instead.
    const { result } = renderHook(() => useCreateRumor());
    return act(() => result.current.createAndOpen()).then(() => {
      expect(mockAddRumor.mock.calls[0][0].title).toBe("");
    });
  });

  test("leaves the source unasked rather than defaulting it", async () => {
    const { result } = renderHook(() => useCreateRumor());
    await act(() => result.current.createAndOpen());

    expect(mockAddRumor.mock.calls[0][0]).not.toHaveProperty("sourceType");
  });

  test("does not navigate when the write fails", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockAddRumor.mockRejectedValueOnce(new Error("Permission denied"));

    const { result } = renderHook(() => useCreateRumor());
    // Logged, not thrown: the call site is a menu item with no error surface,
    // and highlighting a rumour that was never written is worse than nothing.
    await act(() => result.current.createAndOpen());

    expect(mockNavigateToPage).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
