import { currentEffect, setCurrentEffect, effectCleanups, cleanupEffect } from "./core";

export function eff(fn: () => void | (() => void)): () => void {
    const effect = () => {
    cleanupEffect(effect);
    const prevEffect = currentEffect;
    setCurrentEffect(effect);
    try {
      const cleanup = fn();
      if (typeof cleanup === 'function') {
        off(cleanup);
      }
    } finally {
      setCurrentEffect(prevEffect);
    }
    };

    if (currentEffect) {
    off(() => cleanupEffect(effect));
    }

    effect();
    return () => cleanupEffect(effect);
}

export function ut<T>(fn: () => T): T {
    const prevEffect = currentEffect;
    setCurrentEffect(null);
    try {
    return fn();
    } finally {
    setCurrentEffect(prevEffect);
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
