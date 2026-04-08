import { s } from "../reactivity/signal";
import { pushErrorHandler, popErrorHandler } from "../reactivity/core";

export function ErrorBoundary(props: { fallback: (err: any) => any, children: any[] }) {
  const [error, setError] = s<any>(null);

  pushErrorHandler((err) => {
    setError(err);
  });

  const content = () => {
    const errValue = error();
    if (errValue) {
      popErrorHandler();
      return props.fallback(errValue);
    }
    const result = props.children[0];
    popErrorHandler();
    return result;
  };

  return content;
}
