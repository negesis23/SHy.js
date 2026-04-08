import { appEl } from "../runtime/reconciler";
import { off } from "../reactivity/effect";

export function Portal(props: { mount?: Node, children: any }) {
  const mount = props.mount || document.body;
  const fragment = document.createDocumentFragment();
  
  // Render children into fragment
  appEl(fragment, props.children, false);
  
  // Keep track of what we added for cleanup
  const nodes = Array.from(fragment.childNodes);
  
  // Move to mount point
  mount.appendChild(fragment);
  
  // Cleanup on effect disposal
  off(() => {
    for (const node of nodes) {
      if (node.parentNode === mount) {
        mount.removeChild(node);
      }
    }
  });
  
  return null;
}
