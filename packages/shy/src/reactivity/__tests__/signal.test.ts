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

  it('should support object patch updates (fine-grained)', async () => {
    const [user, setUser] = s({ name: 'Alice', age: 20 });
    
    let nameRuns = 0;
    eff(() => {
      user().name;
      nameRuns++;
    });

    let ageRuns = 0;
    eff(() => {
      user().age;
      ageRuns++;
    });

    expect(nameRuns).toBe(1);
    expect(ageRuns).toBe(1);

    setUser({ name: 'Bob' });
    
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(nameRuns).toBe(2);
    expect(ageRuns).toBe(1); // age should not trigger!
    expect(user().name).toBe('Bob');
  });

  it('should support path updates', async () => {
    const [state, setState] = s({ user: { address: { city: 'NY' } } });
    
    let cityRuns = 0;
    eff(() => {
      state().user.address.city;
      cityRuns++;
    });

    expect(cityRuns).toBe(1);

    setState('user.address.city', 'LA');
    
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(cityRuns).toBe(2);
    expect(state().user.address.city).toBe('LA');
  });
});
