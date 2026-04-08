import { EffectFn, currentEffect, setCurrentEffect, cleanupEffect, SignalNode, track, trigger } from "./core";

export function mem<T>(fn: () => T): () => T {
    let value: T;
    let isDirty = true;
    
    // Memo acts as a source
    const node: SignalNode = { firstEdge: null };

    const effect: EffectFn = () => {
        if (isDirty) return;
        isDirty = true;
        trigger(node);
    };
    effect.$$isMemo = true;

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

        track(node);
        return value;
    };

    return get;
}

export const createMemo = mem;
