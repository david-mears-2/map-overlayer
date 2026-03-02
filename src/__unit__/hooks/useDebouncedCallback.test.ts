import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback";

const DELAY = 100;

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a ref whose current is initially null, then populated after effect", async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, DELAY));

    // After effects run, the debounced function should be created
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.current).not.toBeNull();
    expect(typeof result.current.current).toBe("function");
  });

  it("debounces calls by the specified delay", async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, DELAY));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => {
      result.current.current!("a");
      result.current.current!("b");
      result.current.current!("c");
    });

    // Not called yet — within debounce window
    expect(callback).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY);
    });

    // Called once with the last arguments
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith("c");
  });

  it("always calls the latest callback (no stale closures)", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ cb }) => useDebouncedCallback(cb, DELAY),
      { initialProps: { cb: first } }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => {
      result.current.current!();
    });

    // Update the callback before the debounce fires
    rerender({ cb: second });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it("cancel() prevents the pending call from firing", async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, DELAY));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => {
      result.current.current!();
      result.current.current!.cancel();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("cancels pending calls on unmount", async () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, DELAY));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => {
      result.current.current!();
    });

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAY);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
