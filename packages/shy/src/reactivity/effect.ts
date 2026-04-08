import { currentEffect, setCurrentEffect, cleanupEffect, runInErrorHandler } from "./core";
import { getContextProviderMap, setContextProviderMap } from "../context/index";

export function eff(fn: () => void | (() => void)): () => void {
    const context = getContextProviderMap();
    const effect = () => {
        cleanupEffect(effect);
        const prevEffect = currentEffect;
        const prevContext = getContextProviderMap();
        setCurrentEffect(effect);
        setContextProviderMap(context);
        runInErrorHandler(() => {
            try {
                const cleanup = fn();
                if (typeof cleanup === 'function') {
                    off(cleanup);
                }
            } finally {
                setCurrentEffect(prevEffect);
                setContextProviderMap(prevContext);
            }
        });
    };

    if (currentEffect) {
        off(() => cleanupEffect(effect));
    }

    effect();
    return () => cleanupEffect(effect);
}

export const createEffect = eff;

export function ut<T>(fn: () => T): T {
    const prevEffect = currentEffect;
    setCurrentEffect(null);
    try {
        return fn();
    } finally {
        setCurrentEffect(prevEffect);
    }
}

export const untrack = ut;

export function off(fn: () => void) {
    if (currentEffect) {
        if (!currentEffect.cleanups) {
            currentEffect.cleanups = [];
        }
        currentEffect.cleanups.push(fn);
    }
}

export const onCleanup = off;
