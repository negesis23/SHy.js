import { describe, it, expect } from "vitest";
import { s } from "../../reactivity";
import { Dynamic } from "../Dynamic";
import { render, h } from "../../runtime";

describe("Dynamic Component", () => {
  it("renders a dynamic element and updates reactively", async () => {
    const [tag, setTag] = s("div");
    const root = document.createElement("div");

    render(
      () => <Dynamic component={tag} id="dynamic-tag">Hello</Dynamic>,
      root
    );

    await new Promise(r => setTimeout(r, 0));
    expect(root.innerHTML).toBe('<div id="dynamic-tag">Hello</div><!--marker-->');

    setTag("span");
    await new Promise(r => setTimeout(r, 0));
    expect(root.innerHTML).toBe('<span id="dynamic-tag">Hello</span><!--marker-->');
    
    // Switch to a custom component
    const CustomComp = (props: any) => <h1 class={props.class}>{props.children}</h1>;
    setTag(() => CustomComp as any);
    await new Promise(r => setTimeout(r, 0));
    expect(root.innerHTML).toBe('<h1>Hello</h1><!--marker-->');
  });
});
