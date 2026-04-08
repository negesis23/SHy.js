import { describe, it, expect, vi } from 'vitest';
import { s } from '../signal';
import { res } from '../resource';

describe('resource', () => {
  it('should load data from fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    const user = res(fetcher);

    expect(user.loading()).toBe(true);
    expect(user.data()).toBeUndefined();

    // Wait for promise
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(user.loading()).toBe(false);
    expect(user.data()).toBe('data');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should support reactive source', async () => {
    const [userId, setUserId] = s(1);
    let resolvePromise: (v: string) => void;
    const fetcher = vi.fn().mockImplementation((id) => {
        return new Promise(resolve => {
            resolvePromise = resolve;
        });
    });
    const user = res(fetcher, userId);

    expect(user.loading()).toBe(true);
    resolvePromise!('user-1');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(user.data()).toBe('user-1');
    expect(user.loading()).toBe(false);

    setUserId(2);
    // Source change triggers eff, which calls load
    // eff is batched
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(user.loading()).toBe(true);
    
    resolvePromise!('user-2');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(user.data()).toBe('user-2');
    expect(user.loading()).toBe(false);
  });

  it('should handle errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('fail'));
    const user = res(fetcher);

    expect(user.loading()).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(user.loading()).toBe(false);
    expect(user.error()).toBeInstanceOf(Error);
    expect(user.error().message).toBe('fail');
  });

  it('should support refetch', async () => {
    let count = 0;
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(++count));
    const user = res(fetcher);

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(user.data()).toBe(1);

    user.refetch();
    expect(user.loading()).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(user.data()).toBe(2);
  });
});
