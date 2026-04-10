import { describe, it, expect } from "vitest";
import { s, eff } from "../../reactivity";
import { render, h } from "../index";

describe("JSX Runtime", () => {
  it("renders basic HTML elements", async () => {
    const root = document.createElement("div");
    
    render(() => <div class="container" id="my-div">Hello</div>, root);
    await Promise.resolve();

    expect(root.innerHTML).toBe('<div class="container" id="my-div">Hello</div>');
  });

  it("handles reactive attributes and classes", async () => {
    const [isActive, setActive] = s(false);
    const [color, setColor] = s("red");
    const root = document.createElement("div");

    render(
      () => (
        <div 
           classList={() => ({ active: isActive() })} 
           style={() => ({ color: color() })}
           aria-hidden={() => !isActive()}
        >
          Test
        </div>
      ),
      root
    );

    await Promise.resolve();
    const div = root.firstChild as HTMLElement;
    expect(div.className).toBe("");
    expect(div.style.color).toBe("red");
    expect(div.getAttribute("aria-hidden")).toBe("true");

    setActive(true);
    setColor("blue");
    await Promise.resolve();
    
    expect(div.className).toBe("active");
    expect(div.style.color).toBe("blue");
    expect(div.getAttribute("aria-hidden")).toBe(null);
  });

  it("delegates events correctly", async () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    
    let clicked = false;
    
    render(
      () => <button onClick={() => clicked = true}>Click Me</button>,
      root
    );

    await Promise.resolve();
    
    const btn = root.firstChild as HTMLButtonElement;
    btn.click();
    
    expect(clicked).toBe(true);
    
    document.body.removeChild(root);
  });
});
