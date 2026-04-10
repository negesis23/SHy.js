import { eff, off, ut } from "../reactivity/index";
import { appEl, hydrationContext } from "../runtime/reconciler";
import { s } from "../reactivity/signal";

export function Index<T>(props: { each: T[] | (() => T[]); children: [(item: () => T, index: number) => any] }) {
  return {
    $$isIndex: true,
    props
  };
}

export function handleIndex(parent: Element | DocumentFragment | Node, child: any, isSvg: boolean, onNodes?: (nodes: Node[]) => void) {
  const props = child.props;
  const getList = typeof props.each === "function" ? props.each : () => props.each;
  const renderItem = props.children[0];

  const marker = document.createComment("IndexMarker");
  parent.appendChild(marker);
  
  if (onNodes) onNodes([marker]);

  let renderedNodes: { nodes: Node[]; dispose: () => void; itemSignal: (v: any) => void }[] = [];

  const listEffDispose = eff(() => {
    const list = getList() || [];
    const minLength = Math.min(list.length, renderedNodes.length);

    // Update existing
    for (let i = 0; i < minLength; i++) {
      renderedNodes[i].itemSignal(() => list[i]);
    }

    // Add new ones
    if (list.length > renderedNodes.length) {
      for (let i = renderedNodes.length; i < list.length; i++) {
        const [getItem, setItem] = (function() {
          let val = list[i];
          const subscribers = new Set<any>();
          return [
            () => {
              return val;
            },
            (v: any) => {
              val = typeof v === 'function' ? v(val) : v;
            }
          ];
        })();
        
        const [itemSignal, setItemSignal] = s(list[i]);

        const frag = document.createDocumentFragment();
        let dispose!: () => void;
        let itemNodes: Node[] = [];
        ut(() => {
          const el = renderItem(itemSignal, i);
          appEl(frag, el, isSvg, (nodes) => {
             itemNodes = nodes;
             if (renderedNodes[i]) renderedNodes[i].nodes = nodes;
          });
          dispose = () => { /* empty since no outer eff */ };
        });
        
        marker.parentNode?.insertBefore(frag, marker);
        renderedNodes.push({ nodes: itemNodes, dispose, itemSignal: setItemSignal });
      }
    } 
    // Remove old ones
    else if (list.length < renderedNodes.length) {
      for (let i = renderedNodes.length - 1; i >= list.length; i--) {
        const rendered = renderedNodes.pop()!;
        for (const node of rendered.nodes) node.parentNode?.removeChild(node);
        rendered.dispose();
      }
    }
  });

  off(() => {
    listEffDispose();
    for (const rendered of renderedNodes) {
      for (const node of rendered.nodes) node.parentNode?.removeChild(node);
      rendered.dispose();
    }
    marker.parentNode?.removeChild(marker);
  });
}
