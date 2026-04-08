export interface Context<T> {
    id: symbol;
    defaultValue?: T;
}

let contextProviderMap = new Map<symbol, unknown>();

export function getContextProviderMap() {
    return contextProviderMap;
}

export function setContextProviderMap(map: Map<symbol, unknown>) {
    contextProviderMap = map;
}

export function ctx<T>(defaultValue: T): Context<T> {
    return { id: Symbol("context"), defaultValue };
}

export const createContext = ctx;

export function prv<T, R>(context: Context<T>, value: T, fn: () => R) {
    return () => {
        const prevMap = contextProviderMap;
        contextProviderMap = new Map(prevMap);
        contextProviderMap.set(context.id, value);
        try {
            let result = fn() as any;
            while (typeof result === "function" && !result.$$isShy) {
                result = result();
            }
            return result as R;
        } finally {
            contextProviderMap = prevMap;
        }
    };
}

export const provide = prv;

export function inj<T>(context: Context<T>): T {
    if (contextProviderMap.has(context.id)) {
    return contextProviderMap.get(context.id) as T;
    }
    return context.defaultValue as T;
}

export const inject = inj;
