import { eff, off, ut } from "../reactivity/index";
import { handleFor } from "../components/For";
import { handleIndex } from "../components/Index";

export function setAttribute(el: any, key: string, value: any) {
    if (key === "className") {
        el.setAttribute("class", value);
    } else if (key === "classList" && typeof value === "object") {
        for (const name in value) {
            if (value[name]) el.classList.add(name);
            else el.classList.remove(name);
        }
    } else if (key === "style" && typeof value === "object") {
        const prev = (el as any)._prevStyle || {};
        for (const k in prev) {
            if (!(k in value)) (el as any).style.removeProperty(k);
        }
        for (const k in value) {
            (el as any).style.setProperty(k, value[k]);
        }
        (el as any)._prevStyle = value;
    } else if (value == null || value === false) {
        el.removeAttribute(key);
    } else {
        if (typeof SVGElement !== "undefined" && el instanceof SVGElement) {
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

export function appEl(parent: any, child: any, isSvg: boolean, onNodes?: (nodes: any[]) => void) {
    if (child == null || child === false) return;

    if (child && child.$$isFor) {
        handleFor(parent, child, isSvg, onNodes);
        return;
    }

    if (child && child.$$isIndex) {
        handleIndex(parent, child, isSvg, onNodes);
        return;
    }

    if (typeof child === "function") {
        const marker = document.createComment("marker");
        parent.appendChild(marker);
        let currentNodes: any[] = [];

        eff(() => {
            let val = child();
            while (typeof val === "function" && !val.$$isShy) {
                val = val();
            }

            const isPrimitive = typeof val === "string" || typeof val === "number" || typeof val === "boolean";
            const TEXT_NODE = 3;
            
            if (isPrimitive && currentNodes.length === 1 && currentNodes[0].nodeType === TEXT_NODE) {
                if (currentNodes[0].nodeValue !== String(val)) {
                    currentNodes[0].nodeValue = String(val);
                }
                if (onNodes) onNodes(currentNodes);
                return;
            }

            for (const n of currentNodes) {
                n.parentNode?.removeChild(n);
            }
            currentNodes = [];

            if (val != null && val !== false) {
                if (typeof Node !== "undefined" && val instanceof Node) {
                    currentNodes.push(val);
                    marker.parentNode?.insertBefore(val, marker);
                } else if (Array.isArray(val)) {
                    if (typeof document !== "undefined") {
                        const frag = document.createDocumentFragment();
                        for (const v of val) {
                            appEl(frag, v, isSvg);
                        }
                        currentNodes = Array.from(frag.childNodes);
                        marker.parentNode?.insertBefore(frag, marker);
                    }
                } else if (val && val.$$isFor) {
                    if (typeof document !== "undefined") {
                        const frag = document.createDocumentFragment();
                        appEl(frag, val, isSvg);
                        currentNodes = Array.from(frag.childNodes);
                        marker.parentNode?.insertBefore(frag, marker);
                    }
                } else {
                    if (typeof document !== "undefined") {
                        const text = document.createTextNode(String(val));
                        currentNodes.push(text);
                        marker.parentNode?.insertBefore(text, marker);
                    }
                }
            }
            if (onNodes) onNodes(currentNodes);
        });
    } else if (typeof Node !== "undefined" && child instanceof Node) {
        parent.appendChild(child);
        if (onNodes) onNodes([child]);
    } else if (Array.isArray(child)) {
        const arrNodes: any[] = [];
        for (const c of child) {
            appEl(parent, c, isSvg, (n) => arrNodes.push(...n));
        }
        if (onNodes) onNodes(arrNodes);
    } else {
        if (typeof document !== "undefined") {
            const text = document.createTextNode(String(child));
            parent.appendChild(text);
            if (onNodes) onNodes([text]);
        }
    }
}
