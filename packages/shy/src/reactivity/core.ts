export type EffectFn = () => void;

export let currentEffect: EffectFn | null = null;
let errorHandlers: ((err: any) => void)[] = [];

export function pushErrorHandler(handler: (err: any) => void) {
  errorHandlers.push(handler);
}

export function popErrorHandler() {
  errorHandlers.pop();
}

export function runInErrorHandler(fn: () => void) {
  try {
    fn();
  } catch (err) {
    if (errorHandlers.length > 0) {
      errorHandlers[errorHandlers.length - 1](err);
    } else {
      console.error("SHy.js: Uncaught error in effect", err);
    }
  }
}

export function setCurrentEffect(v: EffectFn | null) {
    currentEffect = v;
}

export const effectDependencies = new WeakMap<EffectFn, Set<Set<EffectFn>>>();
export const effectCleanups = new WeakMap<EffectFn, Set<() => void>>();
export const pendingEffects = new Set<EffectFn>();
export const transitionEffects = new Set<EffectFn>();
export let microtaskQueued = false;
export let isTransitioning = false;

export function setTransitioning(v: boolean) {
    isTransitioning = v;
}

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
    runInErrorHandler(() => subscriber());
    } else {
    if (isTransitioning) {
        transitionEffects.add(subscriber);
    } else {
        pendingEffects.add(subscriber);
    }

    if (!microtaskQueued) {
      setMicrotaskQueued(true);
      Promise.resolve().then(() => {
        setMicrotaskQueued(false);
        const effectsToRun = Array.from(pendingEffects);
        pendingEffects.clear();
        for (const effToRun of effectsToRun) {
          runInErrorHandler(() => effToRun());
        }
        
        // Transition effects run after normal effects
        if (transitionEffects.size > 0) {
            const transEffectsToRun = Array.from(transitionEffects);
            transitionEffects.clear();
            for (const effToRun of transEffectsToRun) {
                runInErrorHandler(() => effToRun());
            }
        }
      });
    }
    }
}
