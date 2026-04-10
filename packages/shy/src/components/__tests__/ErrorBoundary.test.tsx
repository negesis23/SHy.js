import { describe, it, expect } from "vitest";
import { s, eff } from "../../reactivity";
import { ErrorBoundary } from "../ErrorBoundary";
import { render, h } from "../../runtime";

describe("ErrorBoundary", () => {
  it("catches errors in effects", async () => {
    const root = document.createElement("div");

    function BadComponent() {
      eff(() => {
        throw new Error("Oops!");
      });
      return <span>Success</span>;
    }

    render(
      () => (
        <ErrorBoundary fallback={(err: Error) => <div>Error: {err.message}</div>}>
          {() => <BadComponent />}
        </ErrorBoundary>
      ),
      root
    );

    await new Promise(r => setTimeout(r, 0));
    expect(root.innerHTML).toBe("<div>Error: Oops!</div><!--marker-->");
  });

  it("catches asynchronous errors in effects after update", async () => {
    const [shouldThrow, setThrow] = s(false);
    const root = document.createElement("div");

    function BadComponent() {
      eff(() => {
        if (shouldThrow()) {
           throw new Error("Async Oops!");
        }
      });
      return <span>Success</span>;
    }

    render(
      () => (
        <ErrorBoundary fallback={(err: Error) => <div>Error: {err.message}</div>}>
          {() => <BadComponent />}
        </ErrorBoundary>
      ),
      root
    );

    await new Promise(r => setTimeout(r, 0));
    expect(root.innerHTML).toBe("<span>Success</span><!--marker-->");

    setThrow(true);
    await new Promise(r => setTimeout(r, 0));
    expect(root.innerHTML).toBe("<div>Error: Async Oops!</div><!--marker-->");
  });
});
