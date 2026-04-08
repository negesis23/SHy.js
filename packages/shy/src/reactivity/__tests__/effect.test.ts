import { describe, it, expect, vi } from 'vitest';
import { s } from '../signal';
import { eff, off } from '../effect';

describe('effect', () => {
  it('should run initially', () => {
    let runs = 0;
    eff(() => {
      runs++;
    });
    expect(runs).toBe(1);
  });

  it('should auto-update when dependencies change', async () => {
    const [count, setCount] = s(0);
    let value = 0;
    eff(() => {
      value = count();
    });
    expect(value).toBe(0);

    setCount(1);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(value).toBe(1);
  });

  it('should support cleanups via off', async () => {
    const [count, setCount] = s(0);
    const cleanup = vi.fn();
    eff(() => {
      count();
      off(cleanup);
    });

    expect(cleanup).not.toHaveBeenCalled();

    setCount(1);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('should support cleanups by returning a function', async () => {
    const [count, setCount] = s(0);
    const cleanup = vi.fn();
    eff(() => {
      count();
      return cleanup;
    });

    expect(cleanup).not.toHaveBeenCalled();

    setCount(1);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('should stop tracking after cleanup', async () => {
    const [count, setCount] = s(0);
    let runs = 0;
    const stop = eff(() => {
      count();
      runs++;
    });

    expect(runs).toBe(1);
    stop();

    setCount(1);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(runs).toBe(1);
  });
});
