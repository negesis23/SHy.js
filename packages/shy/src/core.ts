export type EffectFn = () => void;

export let currentEffect: EffectFn | null = null;

export function setCurrentEffect(v: EffectFn | null) {
    currentEffect = v;
}

export const effectDependencies = new WeakMap<EffectFn, Set<Set<EffectFn>>>();
export const effectCleanups = new WeakMap<EffectFn, Set<() => void>>();
export const pendingEffects = new Set<EffectFn>();
export let microtaskQueued = false;

export function setMicrotaskQueued(v: any) {
    microtaskQueued = v;
}

export function cleanupEffect(effect: EffectFn) {
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

export function notifyEffect(subscriber: EffectFn) {
    if ((subscriber as any).$$isMemo) {
    subscriber();
    } else {
    pendingEffects.add(subscriber);
    if (!microtaskQueued) {
      setMicrotaskQueued(true);
      Promise.resolve().then(() => {
        setMicrotaskQueued(false);
        const effectsToRun = Array.from(pendingEffects);
        pendingEffects.clear();
        for (const eff of effectsToRun) {
          eff();
        }
      });
    }
    }
}
