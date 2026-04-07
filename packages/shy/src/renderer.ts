import { eff, onCleanup, untrack } from "./reactivity";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const templateCache = new Map<string, Element>();

export function h(tag: string | Function | any, props: any, ...children: any[]) {
  if (typeof tag === "function") {
    return tag({ ...props, children });
  }

  const isSvg = tag === "svg" || (props && props.xmlns === SVG_NAMESPACE);
  let el: Element;
  const cacheKey = isSvg ? `svg:${tag}` : tag;
  let cached = templateCache.get(cacheKey);
  if (!cached) {
    cached = (isSvg ? document.createElementNS(SVG_NAMESPACE, tag) : document.createElement(tag)) as Element;
    templateCache.set(cacheKey, cached);
  }
  el = cached!.cloneNode(false) as Element;

  if (props) {
    for (const key in props) {
      if (key === "ref" && typeof props[key] === "function") {
        props[key](el);
      } else if (key.startsWith("on") && key.toLowerCase() in window) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, props[key]);
      } else if (key.startsWith("on")) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, props[key]);
      } else {
        if (typeof props[key] === "function") {
          eff(() => setAttribute(el, key, props[key]()));
        } else {
          setAttribute(el, key, props[key]);
        }
      }
    }
  }

  for (const child of children) {
    appEl(el, child, isSvg);
  }

  return el;
}

function setAttribute(el: Element, key: string, value: any) {
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

function appEl(parent: Element | DocumentFragment | Node, child: any, isSvg: boolean) {
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
          untrack(() => {
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
            untrack(() => {
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

    onCleanup(() => {
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

export interface Context<T> {
  id: symbol;
  defaultValue?: T;
}

let contextProviderMap = new Map<symbol, any>();

export function createContext<T>(defaultValue?: T): Context<T> {
  return { id: Symbol("context"), defaultValue };
}

export function provide<T>(context: Context<T>, value: T, fn: () => any) {
  const prevMap = contextProviderMap;
  contextProviderMap = new Map(prevMap);
  contextProviderMap.set(context.id, value);
  const result = fn();
  contextProviderMap = prevMap;
  return result;
}

export function inject<T>(context: Context<T>): T {
  if (contextProviderMap.has(context.id)) {
    return contextProviderMap.get(context.id);
  }
  return context.defaultValue as T;
}