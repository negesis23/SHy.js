import { describe, it, expect } from "vitest";
import { s, eff } from "../../reactivity";
import { For } from "../For";
import { render, h } from "../../runtime";

describe("For Component", () => {
  it("renders a list of items", async () => {
    const [list] = s([1, 2, 3]);
    const root = document.createElement("div");

    render(
      () => <For each={list}>{item => <span>{item}</span>}</For>,
      root
    );

    await Promise.resolve();
    expect(root.innerHTML).toBe("<span>1</span><span>2</span><span>3</span><!--ForMarker-->");
  });

  it("updates list reactively", async () => {
    const [list, setList] = s([1, 2]);
    const root = document.createElement("div");

    render(
      () => <For each={list}>{item => <span>{item}</span>}</For>,
      root
    );
    
    await Promise.resolve();
    expect(root.innerHTML).toBe("<span>1</span><span>2</span><!--ForMarker-->");

    setList([2, 3, 4]);
    await Promise.resolve();
    expect(root.innerHTML).toBe("<span>2</span><span>3</span><span>4</span><!--ForMarker-->");
  });
});
