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
let resourceCounter = 0;

export function setSSRResources(map: Map<string, any> | null) {
  ssrResources = map;
  resourceCounter = 0;
}

export function res<T, S = true>(
  fetcher: S extends true ? () => Promise<T> : (source: S) => Promise<T>,
  source?: () => S
): Resource<T> {
  const [data, setData] = s<T | undefined>(undefined);
  const [loading, setLoading] = s(false);
  const [error, setError] = s<unknown>(undefined);
  
  let currentPromise: Promise<T> | null = null;

  function load(sVal: S | true) {
    if (sVal === false || sVal === null || sVal === undefined) return;

    setLoading(true);
    setError(undefined);
    
    const promise = (fetcher as (s: S | true) => Promise<T>)(sVal);
    currentPromise = promise;
    
    promise.then(
      (v) => {
        if (currentPromise === promise) {
          setData(v);
          setLoading(false);
          if (ssrResources) {
              // We need an ID for SSR. This is still problematic with global counter.
          }
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
