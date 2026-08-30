// src/shared/components/contact/__tests__/useFunctionsReady.test.ts
import { renderHook, act } from "@testing-library/react";
import {
  useFunctionsReady,
  FUNCTIONS_POLL_INTERVAL_MS,
  FUNCTIONS_POLL_TIMEOUT_MS,
} from "../useFunctionsReady";

const mockHas = jest.fn();

jest.mock("core/services/firebase/core/ServiceRegistry", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({ has: mockHas })),
  },
}));

describe("useFunctionsReady", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockHas.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reports ready immediately when the service is already registered", () => {
    mockHas.mockReturnValue(true);

    const { result } = renderHook(() => useFunctionsReady());

    expect(result.current.ready).toBe(true);
    expect(result.current.failed).toBe(false);
  });

  it("is neither ready nor failed while it is still polling", () => {
    mockHas.mockReturnValue(false);

    const { result } = renderHook(() => useFunctionsReady());
    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_INTERVAL_MS * 2);
    });

    expect(result.current.ready).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it("becomes ready when the service appears part-way through the window", () => {
    mockHas.mockReturnValue(false);

    const { result } = renderHook(() => useFunctionsReady());

    mockHas.mockReturnValue(true);
    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_INTERVAL_MS);
    });

    expect(result.current.ready).toBe(true);
    expect(result.current.failed).toBe(false);
  });

  it("fails only after the whole window has elapsed", () => {
    mockHas.mockReturnValue(false);

    const { result } = renderHook(() => useFunctionsReady());

    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_TIMEOUT_MS - FUNCTIONS_POLL_INTERVAL_MS);
    });
    expect(result.current.failed).toBe(false);

    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_INTERVAL_MS);
    });
    expect(result.current.failed).toBe(true);
    expect(result.current.ready).toBe(false);
  });

  it("stops polling once it is ready", () => {
    mockHas.mockReturnValue(true);

    renderHook(() => useFunctionsReady());
    const callsAfterMount = mockHas.mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_INTERVAL_MS * 10);
    });

    expect(mockHas.mock.calls.length).toBe(callsAfterMount);
  });

  it("treats a throwing registry as a failure rather than crashing", () => {
    mockHas.mockImplementation(() => {
      throw new Error("registry exploded");
    });

    const { result } = renderHook(() => useFunctionsReady());

    expect(result.current.failed).toBe(true);
    expect(result.current.ready).toBe(false);
  });

  it("clears its interval on unmount", () => {
    mockHas.mockReturnValue(false);

    const { unmount } = renderHook(() => useFunctionsReady());
    unmount();
    const callsAfterUnmount = mockHas.mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(FUNCTIONS_POLL_INTERVAL_MS * 4);
    });

    expect(mockHas.mock.calls.length).toBe(callsAfterUnmount);
  });
});
