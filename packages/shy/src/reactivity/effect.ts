import { currentEffect, setCurrentEffect, cleanupEffect, runInErrorHandler, getErrorHandlers, setErrorHandlers } from "./core";
import { getContextProviderMap, setContextProviderMap } from "../context/index";

export function eff(fn: () => void | (() => void)): () => void {
    const context = getContextProviderMap();
    const capturedErrorHandlers = getErrorHandlers();
    
    const effect = () => {
        cleanupEffect(effect);
        const prevEffect = currentEffect;
        const prevContext = getContextProviderMap();
        const prevErrorHandlers = getErrorHandlers();
        
        setCurrentEffect(effect);
        setContextProviderMap(context);
        setErrorHandlers(capturedErrorHandlers);
        
        try {
            runInErrorHandler(() => {
                const cleanup = fn();
                if (typeof cleanup === 'function') {
                    off(cleanup);
                }
            });
        } finally {
            setCurrentEffect(prevEffect);
            setContextProviderMap(prevContext);
            setErrorHandlers(prevErrorHandlers);
        }
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
