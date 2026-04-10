import { eff, off, ut } from "../reactivity/index";
import { appEl, hydrationContext } from "../runtime/reconciler";

export function For<T>(props: { each: T[] | (() => T[]); fallback?: any; children: [(item: T, index: () => number) => any] }) {
    return { $$isFor: true, props };
}

export function handleFor(parent: Element | DocumentFragment | Node, child: any, isSvg: boolean, onNodes?: (nodes: Node[]) => void) {
    const props = child.props;
    const getList = typeof props.each === "function" ? props.each : () => props.each;
    const renderItem = props.children[0];
    const fallback = props.fallback;

    const marker = document.createComment("ForMarker");
    parent.appendChild(marker);
    
    if (onNodes) onNodes([marker]);

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
          for (const node of rendered.nodes) {
             if (node.parentNode) {
                node.parentNode.removeChild(node);
             }
          }
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
              appEl(frag, fbChild, isSvg, (nodes) => {
                  fallbackNodes = nodes;
              });
            });
          });
          marker.parentNode?.insertBefore(frag, marker);
        }
      } else {
        let lastNode: Node | null = marker;
        for (let i = list.length - 1; i >= 0; i--) {
          const item = list[i];
          const existing = renderedItemsMap.get(item);
          if (existing) {
            newRenderedItemsMap.set(item, existing);
            const firstExistingNode = existing.nodes[0];
            const lastExistingNode = existing.nodes[existing.nodes.length - 1];
            
            if (lastExistingNode && lastExistingNode.nextSibling !== lastNode) {
               for (const node of existing.nodes) {
                 lastNode!.parentNode?.insertBefore(node, lastNode);
               }
            }
            if (firstExistingNode) {
              lastNode = firstExistingNode;
            }
          } else {
            const frag = document.createDocumentFragment();
            let dispose!: () => void;
            let itemNodes: Node[] = [];
            ut(() => {
              dispose = eff(() => {
                const el = renderItem(item, () => list.indexOf(item));
                appEl(frag, el, isSvg, (nodes) => {
                    itemNodes = nodes;
                    const existingMapItem = newRenderedItemsMap.get(item);
                    if (existingMapItem) existingMapItem.nodes = nodes;
                });
              });
            });
            if (itemNodes.length > 0) {
               lastNode!.parentNode?.insertBefore(frag, lastNode);
               lastNode = itemNodes[0];
            }
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
