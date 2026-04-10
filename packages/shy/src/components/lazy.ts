import { inj } from "../context/index";
import { SuspenseContext } from "../reactivity/resource";

export function lazy<T extends (props: any) => any>(
  fn: () => Promise<{ default: T } | T>
): (props: Parameters<T>[0]) => () => any {
  let comp: T | undefined;
  let promise: Promise<any> | undefined;

  return (props: any) => {
    return () => {
      if (comp) return comp(props);
      if (!promise) {
        promise = fn().then((m) => {
          comp = (m as any).default || m;
          return comp;
        });
      }
      
      const suspense = inj(SuspenseContext);
      if (suspense && promise) {
        suspense.register(promise);
        (promise as any).$$shyRegistered = true;
      }
      
      throw promise;
    };
  };
}
