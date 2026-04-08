import { eff, off, ut } from "./reactivity";

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
    const props = child.props;
    const getList = typeof props.each === "function" ? props.each : () => props.each;
    const renderItem = props.children[0];
    const fallback = props.fallback;

    const marker = document.createComment("ForMarker");
    parent.appendChild(marker);

    let renderedItemsMap = new Map<any, { nodes: Node[]; dispose: () => void }>();
    let isFallback = false;
    let fallbackNodes: Node[] = [];
    let fallbackDispose: (() => void) | null = null;

    const listEffDispose = eff(() => {
      const list = getList() || [];
      const newItemsSet = new Set(list);
      const newRenderedItemsMap = new Map<any, { nodes: Node[]; dispose: () => void }>();

      if (list.length > 0 && isFallback) {
        for (const n of fallbackNodes) n.parentNode?.removeChild(n);
        if (fallbackDispose) fallbackDispose();
        fallbackNodes = [];
        fallbackDispose = null;
        isFallback = false;
      }

      for (const [item, rendered] of renderedItemsMap.entries()) {
        if (!newItemsSet.has(item)) {
          for (const node of rendered.nodes) node.parentNode?.removeChild(node);
          rendered.dispose();
        }
      }

      if (list.length === 0) {
        if (fallback && !isFallback) {
          isFallback = true;
          const frag = document.createDocumentFragment();
          ut(() => {
            fallbackDispose = eff(() => {
              const fbChild = typeof fallback === "function" ? fallback() : fallback;
              appEl(frag, fbChild, isSvg);
            });
          });
          fallbackNodes = Array.from(frag.childNodes);
          marker.parentNode?.insertBefore(frag, marker);
        }
      } else {
        for (const item of list) {
          const existing = renderedItemsMap.get(item);
          if (existing) {
            newRenderedItemsMap.set(item, existing);
            for (const node of existing.nodes) {
              marker.parentNode?.insertBefore(node, marker);
            }
          } else {
            const frag = document.createDocumentFragment();
            let dispose!: () => void;
            ut(() => {
              dispose = eff(() => {
                const el = renderItem(item, () => list.indexOf(item));
                appEl(frag, el, isSvg);
              });
            });
            const itemNodes = Array.from(frag.childNodes);
            marker.parentNode?.insertBefore(frag, marker);
            newRenderedItemsMap.set(item, { nodes: itemNodes, dispose });
          }
        }
      }
      renderedItemsMap = newRenderedItemsMap;
    });

    off(() => {
      listEffDispose();
      if (fallbackDispose) fallbackDispose();
      for (const rendered of renderedItemsMap.values()) {
        for (const node of rendered.nodes) node.parentNode?.removeChild(node);
        rendered.dispose();
      }
      marker.parentNode?.removeChild(marker);
    });

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

export function For<T>(props: { each: T[] | (() => T[]); fallback?: any; children: [(item: T, index: () => number) => any] }) {
    return { $$isFor: true, props };
}
