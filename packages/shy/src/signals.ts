import { EffectFn, currentEffect, effectDependencies, notifyEffect } from "./core";

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
