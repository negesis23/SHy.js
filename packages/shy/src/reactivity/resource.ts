import { s } from "./signal";
import { currentEffect, notifyEffect } from "./core";
import { ctx, inj } from "../context";
import { eff } from "./effect";

export interface Resource<T> {
  (): T | undefined;
  data: () => T | undefined;
  loading: () => boolean;
  error: () => any;
  refetch: () => void;
}

const SuspenseContext = ctx<{
  register: (promise: Promise<any>) => void;
} | null>(null);

export { SuspenseContext };

export function res<T, S = true>(
  fetcher: S extends true ? () => Promise<T> : (source: S) => Promise<T>,
  source?: () => S
): Resource<T> {
  const [data, setData] = s<T | undefined>(undefined);
  const [loading, setLoading] = s(false);
  const [error, setError] = s<any>(undefined);
  
  let currentPromise: Promise<T> | null = null;

  function load(sVal: any) {
    if (sVal === false || sVal === null || sVal === undefined) return;

    setLoading(true);
    setError(undefined);
    
    const promise = fetcher(sVal as any);
    currentPromise = promise;
    
    promise.then(
      (v) => {
        if (currentPromise === promise) {
          setData(() => v);
          setLoading(false);
        }
      },
      (err) => {
        if (currentPromise === promise) {
          setError(() => err);
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

  const res: any = () => {
    const suspense = inj(SuspenseContext);
    if (loading() && suspense && currentPromise) {
      suspense.register(currentPromise);
    }
    return data();
  };

  res.data = () => res();
  res.loading = loading;
  res.error = error;
  res.refetch = () => {
    if (source) {
        load(source());
    } else {
        load(true);
    }
  };

  return res as Resource<T>;
}
