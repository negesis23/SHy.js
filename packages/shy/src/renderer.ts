import { eff } from "./reactivity";

export function h(tag: string | Function, props: any, ...children: any[]) {
  if (typeof tag === "function") {
    return tag({ ...props, children });
  }

  const el = document.createElement(tag);

  if (props) {
    for (const key in props) {
      if (key.startsWith("on")) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, props[key]);
      } else {
        // Handle reactive props
        if (typeof props[key] === "function") {
          eff(() => {
            if (key === "className") {
              el.className = props[key]();
            } else {
              (el as any)[key] = props[key]();
            }
          });
        } else {
          if (key === "className") {
            el.className = props[key];
          } else {
            (el as any)[key] = props[key];
          }
        }
      }
    }
  }

  for (const child of children) {
    appEl(el, child);
  }

  return el;
}

function appEl(parent: HTMLElement, child: any) {
  if (typeof child === "function") {
    // Reactive text node
    const textNode = document.createTextNode("");
    eff(() => {
      textNode.nodeValue = String(child());
    });
    parent.appendChild(textNode);
  } else if (child instanceof Node) {
    parent.appendChild(child);
  } else if (Array.isArray(child)) {
    for (const c of child) {
      appEl(parent, c);
    }
  } else {
    parent.appendChild(document.createTextNode(String(child)));
  }
}