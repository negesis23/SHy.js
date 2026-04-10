import { setHydrationContext } from "../runtime/reconciler";
import { eventRegistry } from "../runtime/jsx";

export function hydrate(fn: () => any, container: Element) {
  // Set global flag for resource hydration so createResource uses serialized state
  (window as any).__SHY_HYDRATION__ = true;
  
  try {
    // Eagerly render the blueprint tree
    let result = fn();
    while (typeof result === "function" && !result.$$isShy) {
        result = result();
    }
    
    // Completely replace the container's contents with the blueprint
    // This ensures all eff() closures and event listeners are attached to the live DOM nodes.
    container.innerHTML = '';
    
    if (result instanceof Node) {
        container.appendChild(result);
    } else if (Array.isArray(result)) {
        for (const child of result) {
            if (child instanceof Node) container.appendChild(child);
        }
    }
  } finally {
    setHydrationContext(null);
    delete (window as any).__SHY_HYDRATION__;
  }
}
