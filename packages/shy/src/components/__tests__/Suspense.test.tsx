import { describe, it, expect } from "vitest";
import { s, eff } from "../../reactivity";
import { Suspense } from "../Suspense";
import { createResource } from "../../reactivity/resource";
import { render, h } from "../../runtime";

describe("Suspense Component", () => {
  it("renders fallback while promises are pending, then renders children", async () => {
    const root = document.createElement("div");
    let resolvePromise!: () => void;
    
    const fetcher = () => new Promise<string>((resolve) => {
       resolvePromise = () => resolve("Data Loaded");
    });
    
    const data = createResource(fetcher);
    function AsyncComponent() {
       // data() throws promise if loading
       return <span>{data() || ""}</span>;
    }

    render(
      () => (
        <Suspense fallback={<div>Loading...</div>}>
          {() => <AsyncComponent />}
        </Suspense>
      ),
      root
    );

    // Initial render should show loading
    await new Promise(r => setTimeout(r, 0));
    expect(root.innerHTML).toBe("<div>Loading...</div><!--marker-->");

    // Resolve the promise
    resolvePromise();
    // Wait for promise microtasks
    await new Promise(r => setTimeout(r, 0));
    
    // Now it should show data
    expect(root.innerHTML).toBe("<span>Data Loaded</span><!--marker-->");
  });
});
