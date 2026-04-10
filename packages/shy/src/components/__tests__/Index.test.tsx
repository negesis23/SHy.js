import { describe, it, expect } from "vitest";
import { s } from "../../reactivity";
import { Index } from "../Index";
import { render, h } from "../../runtime";

describe("Index Component", () => {
  it("renders a list of items and updates reactively by index", async () => {
    const [list, setList] = s([1, 2, 3]);
    const root = document.createElement("div");

    render(
      () => <Index each={list}>{item => <span>{item}</span>}</Index>,
      root
    );

    await new Promise(r => setTimeout(r, 0));
    expect(root.innerHTML).toBe("<span>1<!--marker--></span><span>2<!--marker--></span><span>3<!--marker--></span><!--IndexMarker-->");

    setList([2, 3]);
    await new Promise(r => setTimeout(r, 0));
    // The items should update in-place based on their index.
    // Length shrinks from 3 to 2.
    expect(root.innerHTML).toBe("<span>2<!--marker--></span><span>3<!--marker--></span><!--IndexMarker-->");
    
    setList([5, 6, 7]);
    await new Promise(r => setTimeout(r, 0));
    expect(root.innerHTML).toBe("<span>5<!--marker--></span><span>6<!--marker--></span><span>7<!--marker--></span><!--IndexMarker-->");
  });
});
