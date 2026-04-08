import { eff, off, ut } from "../reactivity";
import { appEl } from "../runtime/reconciler";

export function For<T>(props: { each: T[] | (() => T[]); fallback?: any; children: [(item: T, index: () => number) => any] }) {
    return { $$isFor: true, props };
}

export function handleFor(parent: Element | DocumentFragment | Node, child: any, isSvg: boolean) {
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
}
