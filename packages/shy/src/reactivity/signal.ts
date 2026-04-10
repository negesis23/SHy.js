import { currentEffect, track, trigger, SignalNode } from "./core";

// --- Proxy Reactivity Engine (Membrane) ---

// Stores SignalNodes for object properties: Target -> Property -> SignalNode
// Uses WeakMap to prevent memory leaks, ensuring the target object remains pure.
const targetMap = new WeakMap<object, Map<string | symbol, SignalNode>>();

// Cache to avoid recreating proxies for the same object
const proxyMap = new WeakMap<object, object>();

function trackProperty(target: object, key: string | symbol) {
  if (currentEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      depsMap = new Map();
      targetMap.set(target, depsMap);
    }
    let node = depsMap.get(key);
    if (!node) {
      node = { firstEdge: null };
      depsMap.set(key, node);
    }
    track(node);
  }
}

function triggerProperty(target: object, key: string | symbol) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const node = depsMap.get(key);
  if (node) {
    trigger(node);
  }
}

function isObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === "object";
}

const arrayInstrumentations: Record<string, Function> = {};
['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const original = (Array.prototype as any)[method];
  arrayInstrumentations[method] = function (this: unknown[], ...args: unknown[]) {
    // Execute original array method
    const res = original.apply(this, args);
    // Trigger the length and the root array object, bypassing individual index triggers during the operation
    // For optimal performance, we just trigger the 'length' property directly which triggers components like <For>
    triggerProperty(this, 'length');
    return res;
  };
});

function createReactiveProxy<T extends object>(target: T): T {
  if (proxyMap.has(target)) {
    return proxyMap.get(target) as T;
  }

  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      if (Array.isArray(obj) && Object.prototype.hasOwnProperty.call(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }
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
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
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
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
    if (!isObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  const lastKey = keys[keys.length - 1];
  if (lastKey === '__proto__' || lastKey === 'constructor' || lastKey === 'prototype') return;
  current[lastKey] = value;
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
  
  // Root node used for primitives, or when the entire object reference is replaced
  const rootNode: SignalNode = { firstEdge: null };

  const get = (): T => {
    track(rootNode);
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
             trigger(rootNode);
          }
        } else if (isObject(arg) && !Array.isArray(arg) && !Array.isArray(value)) {
          // Option A: Patch Setter -> setUser({ name: 'B' })
          deepMerge(proxyValue, arg); // mutates proxy, triggers automatically via properties
        } else {
          // Full replacement with a new object/primitive
          value = arg;
          isObj = isObject(value);
          proxyValue = isObj ? createReactiveProxy(value as object) : value;
          trigger(rootNode);
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
        trigger(rootNode);
      }
    }
  };

  return [get, set];
}

export const createSignal = s;
