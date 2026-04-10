import { h } from "../runtime/jsx";

export function Dynamic(props: { component: any, [key: string]: any }) {
  return () => {
    const { component, children, ...rest } = props;
    let Tag = typeof component === "function" ? component() : component;
    
    // If calling component() returned a Node or Array, it was already a rendered component
    if ((typeof Node !== "undefined" && Tag instanceof Node) || Array.isArray(Tag)) {
        return Tag;
    }
    
    if (!Tag) return null;
    return h(Tag, rest, children);
  };
}
