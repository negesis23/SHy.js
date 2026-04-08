import { s } from "./signal";
import { setTransitioning } from "./core";

export function trn(): [() => boolean, (cb: () => void) => void] {
  const [pending, setPending] = s(false);

  const startTransition = (cb: () => void) => {
    setPending(true);
    setTransitioning(true);
    
    // We run the callback. Any state updates inside will be marked as transition effects.
    try {
        cb();
    } finally {
        setTransitioning(false);
    }
    
    // Once they run, we can set pending to false.
    // Actually, transition effects will run in the next microtask.
    // So pending should be set to false after that.
    Promise.resolve().then(() => {
        setPending(false);
    });
  };

  return [pending, startTransition];
}

export const useTransition = trn;
