import { EffectFn, currentEffect, setCurrentEffect, effectDependencies, cleanupEffect, notifyEffect } from "./core";

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
      setCurrentEffect(effect);
      try {
        value = fn();
      } finally {
        setCurrentEffect(prevEffect);
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
