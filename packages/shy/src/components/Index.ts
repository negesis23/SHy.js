import { eff, off, ut } from "../reactivity/index";
import { appEl } from "../runtime/reconciler";
import { s } from "../reactivity/signal";

export function Index<T>(props: { each: T[] | (() => T[]); children: [(item: () => T, index: number) => any] }) {
  return {
    $$isIndex: true,
    props
  };
}

export function handleIndex(parent: Element | DocumentFragment | Node, child: any, isSvg: boolean) {
  const props = child.props;
  const getList = typeof props.each === "function" ? props.each : () => props.each;
  const renderItem = props.children[0];

  const marker = document.createComment("IndexMarker");
  parent.appendChild(marker);

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
              // Simple internal signal for index items
              return val;
            },
            (v: any) => {
              val = typeof v === 'function' ? v(val) : v;
              // We rely on the internal eff in the rendered item
            }
          ];
        })();
        
        // Actually, let's use a real signal for simplicity and correctness
        const frag = document.createDocumentFragment();
        let dispose!: () => void;
        
        // We need a way to update the item without re-rendering the whole row if possible,
        // but Index usually re-renders if the item signal is used inside.
        // For Index optimization, we pass a signal-like getter.
        
        // Let's use the real signal from shy
        const [itemSignal, setItemSignal] = s(list[i]);

        ut(() => {
          const el = renderItem(itemSignal, i);
          appEl(frag, el, isSvg);
          dispose = () => { /* empty since no outer eff */ };
        });
        
        const itemNodes = Array.from(frag.childNodes);
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
