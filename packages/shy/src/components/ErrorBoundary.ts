import { s } from "../reactivity/signal";
import { pushErrorHandler, popErrorHandler, runInErrorHandler } from "../reactivity/core";

export function ErrorBoundary(props: { fallback: (err: any) => any, children: any[] }) {
  const [error, setError] = s<any>(null);

  const content = () => {
    const errValue = error();
    if (errValue) {
      return props.fallback(errValue);
    }
    
    return () => {
      pushErrorHandler((err) => {
        setError(err);
      });
      let result;
      runInErrorHandler(() => {
        result = props.children[0];
        // Evaluate thunks so the error handler is active during child setup
        while (typeof result === "function" && !result.$$isShy) {
          result = result();
        }
      });
      popErrorHandler();
      return result;
    };
  };

  return content;
}
