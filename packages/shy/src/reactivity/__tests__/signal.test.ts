import { describe, it, expect } from 'vitest';
import { s } from '../signal';
import { eff } from '../effect';

describe('signal', () => {
  it('should get and set value', () => {
    const [count, setCount] = s(0);
    expect(count()).toBe(0);
    setCount(1);
    expect(count()).toBe(1);
  });

  it('should support functional updates', () => {
    const [count, setCount] = s(0);
    setCount((prev) => prev + 1);
    expect(count()).toBe(1);
  });

  it('should not notify if value is the same', async () => {
    const [count, setCount] = s(0);
    let runs = 0;
    eff(() => {
      count();
      runs++;
    });

    // Initial run
    expect(runs).toBe(1);

    setCount(0);
    // Wait for microtask
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(runs).toBe(1);

    setCount(1);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(runs).toBe(2);
  });
});
