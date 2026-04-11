import { s } from "./signal";
import { currentEffect, notifyEffect } from "./core";
import { ctx, inj } from "../context/index";
import { eff } from "./effect";

export interface Resource<T> {
  (): T | undefined;
  data: () => T | undefined;
  loading: () => boolean;
  error: () => unknown;
  refetch: () => void;
}

const SuspenseContext = ctx<{
  register: (promise: Promise<unknown>) => void;
} | null>(null);
export { SuspenseContext };

let ssrResources: Map<string, any> | null = null;
let ssrPromises: Promise<any>[] = [];
let resourceCounter = 0;

export function setSSRResources(map: Map<string, any> | null) {
  ssrResources = map;
  ssrPromises = [];
  resourceCounter = 0;
}

export function resetResourceCounter() {
  resourceCounter = 0;
}

export function getSSRPromises() {
  const promises = [...ssrPromises];
  ssrPromises = []; 
  return promises;
}

export function res<T, S = true>(
  fetcher: S extends true ? () => Promise<T> : (source: S) => Promise<T>,
  source?: () => S
): Resource<T> {
  const resId = resourceCounter++;
  
  let initialData = undefined;
  let isHydratedFromSSR = false;

  // Cek apakah ada data hidrasi dari server di HTML
  if (typeof window !== "undefined" && (window as any).__SHY_HYDRATION__) {
    const el = document.getElementById(`shy-res-${resId}`);
    if (el) {
      try {
        initialData = JSON.parse(el.textContent || "null");
        isHydratedFromSSR = true;
        el.remove();
      } catch (e) {
        console.error("Failed to hydrate resource", resId, e);
      }
    }
  }

  const [data, setData] = s<T | undefined>(initialData);
  const [loading, setLoading] = s(false);
  const [error, setError] = s<unknown>(undefined);
  let currentPromise: Promise<T> | null = null;
  
  // Flag ini memastikan kita HANYA mem-bypass fetch di eksekusi pertama
  let isFirstLoad = true;

  function load(sVal: S | true) {
    if (sVal === false || sVal === null || sVal === undefined) return;
    
    // 1. Bypass fetch di Client JIKA data sudah ada dari SSR
    if (isFirstLoad && isHydratedFromSSR) {
        isFirstLoad = false;
        return;
    }

    // 2. Bypass fetch di Server (Pass ke-2) JIKA data sudah di-cache dari Pass ke-1
    if (isFirstLoad && ssrResources && ssrResources.has(String(resId))) {
        isFirstLoad = false;
        setData(ssrResources.get(String(resId)));
        return;
    }

    isFirstLoad = false;

    setLoading(true);
    setError(undefined);
    const promise = (fetcher as (s: S | true) => Promise<T>)(sVal);
    currentPromise = promise;

    if (ssrResources) {
        ssrPromises.push(promise);
    }

    promise.then(
      (v) => {
        if (currentPromise === promise) {
          setData(v);
          setLoading(false);
          if (ssrResources) ssrResources.set(String(resId), v);
        }
      },
      (err: unknown) => {
        if (currentPromise === promise) {
          setError(err);
          setLoading(false);
        }
      }
    );
  }

  if (source) {
    eff(() => {
      const sVal = source();
      load(sVal);
    });
  } else {
    load(true);
  }

  const resourceFn = (() => {
    const suspense = inj(SuspenseContext);
    if (loading() && currentPromise) {
      if (suspense) {
        suspense.register(currentPromise);
        (currentPromise as any).$$shyRegistered = true;
      }
    }
    return data();
  }) as Resource<T>;

  resourceFn.data = () => resourceFn();
  resourceFn.loading = loading;
  resourceFn.error = error;
  resourceFn.refetch = () => {
    if (source) {
        load(source());
    } else {
        load(true);
    }
  };

  return resourceFn;
}

export const createResource = res;
