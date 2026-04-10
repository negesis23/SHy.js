import { inj } from "../context/index";
import { SuspenseContext } from "../reactivity/resource";
import { s } from "../reactivity/signal";

export function lazy<T extends (props: any) => any>(
  fn: () => Promise<{ default: T } | T>
): (props: Parameters<T>[0]) => () => any {
  let comp: T | undefined;
  let promise: Promise<any> | undefined;

  return (props: any) => {
    const [loaded, setLoaded] = s(false);

    return () => {
      if (comp) return comp(props);
      if (!promise) {
        promise = fn().then((m) => {
          comp = (m as any).default || m;
          setLoaded(true);
          return comp;
        });
      }
      
      const suspense = inj(SuspenseContext);
      if (suspense && promise && !loaded()) {
        suspense.register(promise);
        (promise as any).$$shyRegistered = true;
      }
      
      // If not loaded, return nothing. When loaded, the signal triggers a re-render of this thunk.
      if (!loaded()) return null;
      return comp!(props);
    };
  };
}
