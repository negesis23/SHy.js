import { setAttribute, appEl } from "./reconciler";
import { eff } from "./reactivity";

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
export const SVG_TAGS = new Set([
      "svg", "animate", "animateMotion", "animateTransform", "circle", "clipPath",
      "defs", "desc", "ellipse", "feBlend", "feColorMatrix", "feComponentTransfer",
      "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap",
      "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG",
      "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology",
      "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile",
      "feTurbulence", "filter", "foreignObject", "g", "image", "line", "linearGradient",
      "marker", "mask", "metadata", "mpath", "path", "pattern", "polygon", "polyline",
      "radialGradient", "rect", "stop", "switch", "symbol", "text", "textPath",
      "tspan", "use", "view"
    ]);
export const templateCache = new Map<string, Element>();

export function h(tag: string | Function | any, props: any, ...children: any[]) {
    if (typeof tag === "function") {
    return tag({ ...props, children });
    }

    const isSvg = SVG_TAGS.has(tag) || (props && props.xmlns === SVG_NAMESPACE);
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
