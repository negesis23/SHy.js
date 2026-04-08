export interface Context<T> {
    id: symbol;
    defaultValue?: T;
}

let contextProviderMap = new Map<symbol, any>();

export function ctx<T>(defaultValue: T): Context<T> {
    return { id: Symbol("context"), defaultValue };
}

export function prv<T>(context: Context<T>, value: T, fn: () => any) {
    const prevMap = contextProviderMap;
    contextProviderMap = new Map(prevMap);
    contextProviderMap.set(context.id, value);
    const result = fn();
    contextProviderMap = prevMap;
    return result;
}

export function inj<T>(context: Context<T>): T {
    if (contextProviderMap.has(context.id)) {
    return contextProviderMap.get(context.id);
    }
    return context.defaultValue as T;
}
