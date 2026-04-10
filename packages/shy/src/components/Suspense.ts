import { prv } from "../context/index";
import { s } from "../reactivity/signal";
import { SuspenseContext } from "../reactivity/resource";
import { pushErrorHandler, popErrorHandler, runInErrorHandler } from "../reactivity/core";

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

  let cachedChildren: any = null;
  let childrenEvaluated = false;

  return () => {
    if (!childrenEvaluated) {
      cachedChildren = prv(SuspenseContext, { register }, () => {
        let result: any;
        pushErrorHandler((err) => {
          if (err instanceof Promise) {
            register(err);
          } else {
            throw err;
          }
        });
        try {
          runInErrorHandler(() => {
            result = Array.isArray(props.children) ? props.children[0] : props.children;
            // Evaluate thunks so the error handler and context are active during child setup
            while (typeof result === "function" && !result.$$isShy) {
              result = result();
            }
          });
          return result;
        } finally {
          popErrorHandler();
        }
      })();
      childrenEvaluated = true;
    }

    if (loading()) {
      return props.fallback;
    }

    return cachedChildren;
  };
}
