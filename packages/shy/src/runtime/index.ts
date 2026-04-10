import { appEl } from "./reconciler";
export { h } from "./jsx";

export function render(code: () => any, element: Element) {
  const root = code();
  appEl(element, root, false);
  return () => {
    element.innerHTML = "";
  };
}
