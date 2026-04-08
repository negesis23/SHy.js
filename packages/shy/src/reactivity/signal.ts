import { EffectFn, currentEffect, effectDependencies, notifyEffect } from "./core";

// --- Proxy Reactivity Engine (Membrane) ---

// Stores subscribers for object properties: Target -> Property -> Set<EffectFn>
// Uses WeakMap to prevent memory leaks, ensuring the target object remains pure.
const targetMap = new WeakMap<object, Map<string | symbol, Set<EffectFn>>>();

// Cache to avoid recreating proxies for the same object
const proxyMap = new WeakMap<object, object>();

function trackProperty(target: object, key: string | symbol) {
  if (currentEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      depsMap = new Map();
      targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
      dep = new Set();
      depsMap.set(key, dep);
    }
    dep.add(currentEffect);
    
    let effectDeps = effectDependencies.get(currentEffect);
    if (!effectDeps) {
      effectDeps = new Set();
      effectDependencies.set(currentEffect, effectDeps);
    }
    effectDeps.add(dep);
  }
}

function triggerProperty(target: object, key: string | symbol) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (dep) {
    // Clone set to avoid infinite loops if effects cause more triggers
    const subs = Array.from(dep);
    for (const subscriber of subs) {
      notifyEffect(subscriber);
    }
  }
}

function isObject(val: unknown): val is object {
  return val !== null && typeof val === "object";
}

function createReactiveProxy<T extends object>(target: T): T {
  if (proxyMap.has(target)) {
    return proxyMap.get(target) as T;
  }

  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      trackProperty(obj, key);
      const res = Reflect.get(obj, key, receiver);
      // Lazy deep reactivity: wrap nested objects only when they are accessed
      if (isObject(res)) {
        return createReactiveProxy(res);
      }
      return res;
    },
    set(obj, key, value, receiver) {
      const oldValue = Reflect.get(obj, key, receiver);
      const result = Reflect.set(obj, key, value, receiver);
      // Only trigger if value actually changed
      if (oldValue !== value) {
        triggerProperty(obj, key);
      }
      return result;
    },
    deleteProperty(obj, key) {
      const hasKey = Object.prototype.hasOwnProperty.call(obj, key);
      const result = Reflect.deleteProperty(obj, key);
      if (hasKey && result) {
        triggerProperty(obj, key);
      }
      return result;
    }
  });

  proxyMap.set(target, proxy);
  return proxy;
}

// Deep merge for Option A (Patch updates)
function deepMerge(target: any, source: any) {
  if (!isObject(target) || !isObject(source)) return source;
  for (const key of Object.keys(source)) {
    if (isObject(source[key]) && isObject(target[key]) && !Array.isArray(source[key])) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Path setter logic for Option B ("a.b.c")
function applyPathSet(target: any, path: string, value: any) {
  const keys = path.split('.');
  let current = target;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!isObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

// --- Unified Signal API ---

// Enhanced Setter type supporting both primitives, patching, and path setting
export interface Setter<T> {
  // Option A: Patch Setter
  (patch: Partial<T>): void;
  // Option B: Path Setter
  (path: string, value: any): void;
  // Fallback for primitives or full replacement
  (v: T | ((prev: T) => T)): void;
}

export function s<T>(initialValue: T): [() => T, any] {
  let isObj = isObject(initialValue);
  let value = initialValue;
  let proxyValue = isObj ? createReactiveProxy(initialValue as object) : initialValue;
  
  // Root subscribers are used for primitives, or when the entire object reference is replaced
  const rootSubscribers = new Set<EffectFn>();

  const get = (): T => {
    // If it's a primitive or they access the root proxy reference
    if (currentEffect) {
      rootSubscribers.add(currentEffect);
      let deps = effectDependencies.get(currentEffect);
      if (!deps) {
        deps = new Set();
        effectDependencies.set(currentEffect, deps);
      }
      deps.add(rootSubscribers);
    }
    return (isObj ? proxyValue : value) as T;
  };

  const set = (...args: any[]) => {
    if (isObj) {
      if (args.length === 2 && typeof args[0] === 'string') {
        // Option B: Path Setter -> setUser('user.name', 'B')
        const [path, newValue] = args;
        applyPathSet(proxyValue, path, newValue); // mutates the proxy, which auto-triggers
      } else if (args.length === 1) {
        const arg = args[0];
        if (typeof arg === 'function') {
          // Functional update -> setUser(prev => ({ ...prev, name: 'B' }))
          const nextValue = arg(proxyValue);
          if (nextValue !== value) {
             value = nextValue;
             isObj = isObject(value);
             proxyValue = isObj ? createReactiveProxy(value as object) : value;
             const subs = Array.from(rootSubscribers);
             for (const sub of subs) notifyEffect(sub);
          }
        } else if (isObject(arg) && !Array.isArray(arg) && !Array.isArray(value)) {
          // Option A: Patch Setter -> setUser({ name: 'B' }) (Only applies if both are pure objects)
          deepMerge(proxyValue, arg); // mutates proxy, triggers automatically via properties
        } else {
          // Full replacement with a new object/primitive
          value = arg;
          isObj = isObject(value);
          proxyValue = isObj ? createReactiveProxy(value as object) : value;
          const subs = Array.from(rootSubscribers);
          for (const sub of subs) notifyEffect(sub);
        }
      }
    } else {
      // Primitive Setter
      const newValue = args[0];
      const nextValue = typeof newValue === "function" ? newValue(value) : newValue;
      if (nextValue !== value) {
        value = nextValue;
        isObj = isObject(value);
        if (isObj) {
           proxyValue = createReactiveProxy(value as object);
        }
        const subs = Array.from(rootSubscribers);
        for (const subscriber of subs) {
          notifyEffect(subscriber);
        }
      }
    }
  };

  return [get, set];
}

export const createSignal = s;
