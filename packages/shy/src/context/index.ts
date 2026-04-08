export interface Context<T> {
    id: symbol;
    defaultValue?: T;
}

let contextProviderMap = new Map<symbol, any>();

export function getContextProviderMap() {
    return contextProviderMap;
}

export function setContextProviderMap(map: Map<symbol, any>) {
    contextProviderMap = map;
}

export function ctx<T>(defaultValue: T): Context<T> {
    return { id: Symbol("context"), defaultValue };
}

export function prv<T>(context: Context<T>, value: T, fn: () => any) {
    return () => {
        const prevMap = contextProviderMap;
        contextProviderMap = new Map(prevMap);
        contextProviderMap.set(context.id, value);
        try {
            let result = fn();
            while (typeof result === "function" && !result.$$isShy) {
                result = result();
            }
            return result;
        } finally {
            contextProviderMap = prevMap;
        }
    };
}

export function inj<T>(context: Context<T>): T {
    if (contextProviderMap.has(context.id)) {
    return contextProviderMap.get(context.id);
    }
    return context.defaultValue as T;
}
