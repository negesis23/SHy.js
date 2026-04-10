import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Portal } from "../Portal";
import { render, h } from "../../runtime";

describe("Portal Component", () => {
  let modalRoot: HTMLElement;

  beforeEach(() => {
    modalRoot = document.createElement("div");
    modalRoot.id = "modal-root";
    document.body.appendChild(modalRoot);
  });

  afterEach(() => {
    document.body.removeChild(modalRoot);
  });

  it("renders children into a different DOM node", async () => {
    const root = document.createElement("div");

    render(
      () => (
        <div>
          <span>Normal</span>
          <Portal mount={modalRoot}>
            <span>Portaled</span>
          </Portal>
        </div>
      ),
      root
    );

    await Promise.resolve();
    
    // Normal tree should not contain the portaled span
    expect(root.innerHTML).toBe("<div><span>Normal</span></div>");
    
    // The target mount node should contain it
    expect(modalRoot.innerHTML).toBe("<span>Portaled</span>");
  });
});
