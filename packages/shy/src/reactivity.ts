let context: (() => void)[] = [];

export function s<T>(initialValue: T): [() => T, (v: T | ((prev: T) => T)) => void] {
  let value = initialValue;
  const subscribers = new Set<() => void>();

  const get = () => {
    const currentObserver = context[context.length - 1];
    if (currentObserver) {
      subscribers.add(currentObserver);
    }
    return value;
  };

  const set = (newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === "function" ? (newValue as any)(value) : newValue;
    if (nextValue !== value) {
      value = nextValue;
      for (const subscriber of subscribers) {
        subscriber();
      }
    }
  };

  return [get, set];
}

export function eff(fn: () => void | (() => void)) {
  let cleanup: void | (() => void);
  const effect = () => {
    if (cleanup) cleanup();
    context.push(effect);
    cleanup = fn();
    context.pop();
  };
  effect();
}

export function mem<T>(fn: () => T): () => T {
  const [get, set] = s<T>(undefined as any);
  eff(() => {
    set(fn());
  });
  return get;
}