import { describe, it, expect } from "vitest";
import { s } from "../../reactivity";
import { Suspense } from "../Suspense";
import { lazy } from "../lazy";
import { render, h } from "../../runtime";

describe("lazy Component", () => {
  it("delays rendering until component module resolves", async () => {
    const root = document.createElement("div");
    let resolveModule!: (mod: { default: any }) => void;
    
    const LazyComp = lazy(() => new Promise<{ default: any }>((resolve) => {
       resolveModule = resolve;
    }));

    render(
      () => (
        <Suspense fallback={<div>Loading Component...</div>}>
          {() => <LazyComp name="Shy" />}
        </Suspense>
      ),
      root
    );

    // Initial render should show loading
    await new Promise(r => setTimeout(r, 0));
    expect(root.innerHTML).toBe("<div>Loading Component...</div><!--marker-->");

    // Resolve the promise with a component
    resolveModule({
       default: (props: { name: string }) => <span>Hello, {props.name}!</span>
    });
    
    // Wait for promise microtasks to flush
    await new Promise(r => setTimeout(r, 0));
    
    // Now it should show component
    expect(root.innerHTML).toBe("<span>Hello, Shy!</span><!--marker-->");
  });
});
