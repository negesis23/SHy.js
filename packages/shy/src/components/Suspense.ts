import { prv } from "../context";
import { s } from "../reactivity/signal";
import { SuspenseContext } from "../reactivity/resource";
import { pushErrorHandler, popErrorHandler } from "../reactivity/core";

export function Suspense(props: { fallback: any, children: any }) {
  const [loading, setLoading] = s(false);
  const promises = new Set<Promise<any>>();

  const register = (promise: Promise<any>) => {
    if (promises.has(promise)) return;
    promises.add(promise);
    setLoading(true);
    promise.finally(() => {
      promises.delete(promise);
      if (promises.size === 0) {
        setLoading(false);
      }
    });
  };

  return () => {
    if (loading()) {
      return props.fallback;
    }
    
    pushErrorHandler((err) => {
      if (err instanceof Promise) {
        register(err);
      } else {
        throw err;
      }
    });

    let result;
    try {
      result = prv(SuspenseContext, { register }, () => {
        return typeof props.children === "function" ? props.children() : props.children;
      });
    } finally {
      popErrorHandler();
    }
    
    return result;
  };
}
