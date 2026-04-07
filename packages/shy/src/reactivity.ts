type EffectFn = () => void;

let currentEffect: EffectFn | null = null;
const effectDependencies = new WeakMap<EffectFn, Set<Set<EffectFn>>>();
const effectCleanups = new WeakMap<EffectFn, Set<() => void>>();

export function ut<T>(fn: () => T): T {
  const prevEffect = currentEffect;
  currentEffect = null;
  try {
    return fn();
  } finally {
    currentEffect = prevEffect;
  }
}

export function off(fn: () => void) {
  if (currentEffect) {
    let cleanups = effectCleanups.get(currentEffect);
    if (!cleanups) {
      cleanups = new Set();
      effectCleanups.set(currentEffect, cleanups);
    }
    cleanups.add(fn);
  }
}

function cleanupEffect(effect: EffectFn) {
  const deps = effectDependencies.get(effect);
  if (deps) {
    for (const dep of deps) {
      dep.delete(effect);
    }
    deps.clear();
  }
  const cleanups = effectCleanups.get(effect);
  if (cleanups) {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups.clear();
  }
}

const pendingEffects = new Set<EffectFn>();
let microtaskQueued = false;

function notifyEffect(subscriber: EffectFn) {
  if ((subscriber as any).$$isMemo) {
    subscriber();
  } else {
    pendingEffects.add(subscriber);
    if (!microtaskQueued) {
      microtaskQueued = true;
      Promise.resolve().then(() => {
        microtaskQueued = false;
        const effectsToRun = Array.from(pendingEffects);
        pendingEffects.clear();
        for (const eff of effectsToRun) {
          eff();
        }
      });
    }
  }
}

export function s<T>(initialValue: T): [() => T, (v: T | ((prev: T) => T)) => void] {
  let value = initialValue;
  const subscribers = new Set<EffectFn>();

  const get = () => {
    if (currentEffect) {
      subscribers.add(currentEffect);
      let deps = effectDependencies.get(currentEffect);
      if (!deps) {
        deps = new Set();
        effectDependencies.set(currentEffect, deps);
      }
      deps.add(subscribers);
    }
    return value;
  };

  const set = (newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === "function" ? (newValue as any)(value) : newValue;
    if (nextValue !== value) {
      value = nextValue;
      const subs = Array.from(subscribers);
      for (const subscriber of subs) {
        notifyEffect(subscriber);
      }
    }
  };

  return [get, set];
}

export function eff(fn: () => void | (() => void)): () => void {
  const effect = () => {
    cleanupEffect(effect);
    const prevEffect = currentEffect;
    currentEffect = effect;
    try {
      const cleanup = fn();
      if (typeof cleanup === 'function') {
        off(cleanup);
      }
    } finally {
      currentEffect = prevEffect;
    }
  };
  
  if (currentEffect) {
    off(() => cleanupEffect(effect));
  }
  
  effect();
  return () => cleanupEffect(effect);
}

export function mem<T>(fn: () => T): () => T {
  let value: T;
  let isDirty = true;
  const subscribers = new Set<EffectFn>();

  const effect = () => {
    if (isDirty) return;
    isDirty = true;
    const subs = Array.from(subscribers);
    for (const subscriber of subs) {
      notifyEffect(subscriber);
    }
  };
  (effect as any).$$isMemo = true;

  const get = () => {
    if (isDirty) {
      cleanupEffect(effect);
      const prevEffect = currentEffect;
      currentEffect = effect;
      try {
        value = fn();
      } finally {
        currentEffect = prevEffect;
      }
      isDirty = false;
    }

    if (currentEffect) {
      subscribers.add(currentEffect);
      let deps = effectDependencies.get(currentEffect);
      if (!deps) {
        deps = new Set();
        effectDependencies.set(currentEffect, deps);
      }
      deps.add(subscribers);
    }
    return value;
  };

  return get;
}