import { describe, it, expect } from 'vitest';
import { s } from '../signal';
import { mem } from '../memo';
import { eff } from '../effect';

describe('memo', () => {
  it('should lazy evaluate', () => {
    const [count, setCount] = s(0);
    let runs = 0;
    const double = mem(() => {
      runs++;
      return count() * 2;
    });

    expect(runs).toBe(0);
    expect(double()).toBe(0);
    expect(runs).toBe(1);

    expect(double()).toBe(0);
    expect(runs).toBe(1);
  });

  it('should update reactive dependencies', async () => {
    const [count, setCount] = s(0);
    let runs = 0;
    const double = mem(() => {
      runs++;
      return count() * 2;
    });

    let value = 0;
    eff(() => {
        value = double();
    });

    expect(value).toBe(0);
    expect(runs).toBe(1);

    setCount(1);
    // Memo itself updates synchronously (sets isDirty to true)
    // But effect is batching via microtask
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(value).toBe(2);
    expect(runs).toBe(2);
  });

  it('should not re-evaluate if dependency value is the same', async () => {
    const [count, setCount] = s(0);
    let runs = 0;
    const double = mem(() => {
      runs++;
      return count() * 2;
    });

    expect(double()).toBe(0);
    expect(runs).toBe(1);

    setCount(0);
    expect(double()).toBe(0);
    expect(runs).toBe(1);
  });
});
