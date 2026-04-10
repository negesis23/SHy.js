import { describe, it, expect, beforeEach } from "vitest";
import { renderToString, hydrate, h, s, For } from "../index";

describe("SSR & Hydration", () => {
  it("renders to string and hydrates correctly", async () => {
    function App() {
      const [count, setCount] = s(0);
      return (
        h("div", { id: "app" },
          h("button", { id: "btn", onClick: () => setCount(c => c + 1) }, 
            "Count: ", () => count()
          )
        )
      );
    }

    // 1. SSR
    const html = renderToString(App);
    console.log("SSR HTML:", html);
    expect(html).toContain("Count: ");

    // 2. Setup DOM for hydration
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    console.log("Container innerHTML:", container.innerHTML);
    console.log("Container firstChild:", container.firstChild?.nodeName);
    console.log("Container firstElementChild:", container.firstElementChild?.nodeName);

    const btn = document.getElementById("btn") as HTMLButtonElement;
    expect(btn.textContent).toContain("Count: 0");

    // 3. Hydrate
    hydrate(App, container);

    // 4. Test interactivity
    const liveBtn = document.getElementById("btn") as HTMLButtonElement;
    liveBtn.click();
    
    // Wait for microtasks
    await new Promise(r => setTimeout(r, 0));
    
    expect(liveBtn.textContent).toContain("Count: 1");
    
    document.body.removeChild(container);
  });
});
