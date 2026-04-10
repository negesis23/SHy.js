import { setAttribute, appEl, hydrationContext } from "./reconciler";
import { eff } from "../reactivity/index";

// Registry for SSR implementation to avoid static imports
let ssrImplementation: any | null = null;
export function setSSRImplementation(impl: any | null) {
  ssrImplementation = impl;
}

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
export const SVG_TAGS = new Set([
  "svg", "animate", "animateMotion", "animateTransform", "circle", "clipPath",
  "defs", "desc", "ellipse", "feBlend", "feColorMatrix", "feComponentTransfer",
  "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDropShadow", "feFlood",
  "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge",
  "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting",
  "feSpotLight", "feTile", "feTurbulence", "filter", "foreignObject", "g", "image",
  "line", "linearGradient", "marker", "mask", "metadata", "mpath", "path", "pattern",
  "polygon", "polyline", "radialGradient", "rect", "stop", "switch", "symbol", "text",
  "textPath", "tspan", "use", "view"
]);

const DELEGATED_EVENTS = new Set(["click", "input", "change", "submit", "focus", "blur", "keydown", "keyup", "keypress"]);

export const templateCache = new Map<string, Element>();
const eventListeners = new Set<string>();

function delegateEvent(name: string) {
  if (eventListeners.has(name)) return;
  eventListeners.add(name);

  document.addEventListener(name, (e) => {
    let node = e.target as any;
    while (node && node !== document) {
      const handler = node[`__shy_${name}`];
      if (handler) {
        handler(e);
        if (e.cancelBubble) break;
      }
      node = node.parentNode;
    }
  });
}

export function h(tag: string | Function | any, props: any, ...children: any[]) {
  if (ssrImplementation || (typeof document === "undefined" && (globalThis as any).__SHY_SSR_H__)) {
    const impl = ssrImplementation || (globalThis as any).__SHY_SSR_H__;
    return impl(tag, props, ...children);
  }

  if (typeof tag === "function") {
    const result = tag({ ...props, children });
    if (typeof result === "function" && !result.$$isShy) {
      return result;
    }
    return result;
  }

  const isSvg = SVG_TAGS.has(tag) || (props && props.xmlns === SVG_NAMESPACE);
  let el: Element | undefined;

  if (!el) {
    const cacheKey = isSvg ? `svg:${tag}` : tag;
    let cached = templateCache.get(cacheKey);

    if (!cached) {
      cached = (isSvg ? document.createElementNS(SVG_NAMESPACE, tag) : document.createElement(tag)) as Element;
      templateCache.set(cacheKey, cached);
    }
    el = cached!.cloneNode(false) as Element;
  }

  if (props) {
    for (const key in props) {
      if (key === "ref" && typeof props[key] === "function") {
        props[key](el);
      } else if (key === "use" && Array.isArray(props[key])) {
        for (const item of props[key]) {
          if (Array.isArray(item)) {
            item[0](el, () => item[1]);
          } else if (typeof item === "function") {
            item(el, () => undefined);
          }
        }
      } else if (key.startsWith("on")) {
        const name = key.slice(2).toLowerCase();
        if (DELEGATED_EVENTS.has(name)) {
          let handlers = eventRegistry.get(el);
          if (!handlers) {
            handlers = {};
            eventRegistry.set(el, handlers);
          }
          handlers[name] = props[key];
          delegateEvent(name);
        } else {
          el.addEventListener(name, props[key]);
        }
      } else {
        if (typeof props[key] === "function") {
          eff(() => setAttribute(el!, key, props[key]()));
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
