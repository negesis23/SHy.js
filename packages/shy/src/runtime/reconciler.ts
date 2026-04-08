import { eff, off, ut } from "../reactivity/index";
import { handleFor } from "../components/For";

export function setAttribute(el: Element, key: string, value: any) {
    if (key === "className") {
    el.setAttribute("class", value);
    } else if (key === "style" && typeof value === "object") {
    Object.assign((el as HTMLElement).style, value);
    } else if (value == null || value === false) {
    el.removeAttribute(key);
    } else {
    if (el instanceof SVGElement) {
      el.setAttribute(key, value);
    } else {
      if (key in el) {
        (el as any)[key] = value;
      } else {
        el.setAttribute(key, value);
      }
    }
    }
}

export function appEl(parent: Element | DocumentFragment | Node, child: any, isSvg: boolean) {
    if (child == null || child === false) return;

    if (child && child.$$isFor) {
        handleFor(parent, child, isSvg);
        return;
    }

    if (typeof child === "function") {
    const marker = document.createComment("marker");
    parent.appendChild(marker);
    let currentNodes: Node[] = [];

    eff(() => {
      const val = child();
      
      const isPrimitive = typeof val === "string" || typeof val === "number" || typeof val === "boolean";
      if (isPrimitive && currentNodes.length === 1 && currentNodes[0].nodeType === Node.TEXT_NODE) {
        currentNodes[0].nodeValue = String(val);
        return;
      }

      for (const n of currentNodes) {
        n.parentNode?.removeChild(n);
      }
      currentNodes = [];
      
      if (val != null && val !== false) {
        if (val instanceof Node) {
          currentNodes.push(val);
          marker.parentNode?.insertBefore(val, marker);
        } else if (Array.isArray(val)) {
          const frag = document.createDocumentFragment();
          for (const v of val) {
            appEl(frag, v, isSvg);
          }
          currentNodes = Array.from(frag.childNodes);
          marker.parentNode?.insertBefore(frag, marker);
        } else if (val && val.$$isFor) {
          const frag = document.createDocumentFragment();
          appEl(frag, val, isSvg);
          currentNodes = Array.from(frag.childNodes);
          marker.parentNode?.insertBefore(frag, marker);
        } else {
          const text = document.createTextNode(String(val));
          currentNodes.push(text);
          marker.parentNode?.insertBefore(text, marker);
        }
      }
    });
    } else if (child instanceof Node) {
    parent.appendChild(child);
    } else if (Array.isArray(child)) {
    for (const c of child) {
      appEl(parent, c, isSvg);
    }
    } else {
    parent.appendChild(document.createTextNode(String(child)));
    }
}
