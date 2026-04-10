import { setSSRContext, h as ssrH } from "./jsx-ssr";
import { setSSRResources } from "../reactivity/resource";
import { setSSRImplementation } from "../runtime/jsx";

export function renderToString(fn: () => any): string {
  const resources = new Map<string, any>();
  let id = 0;
  
  const ctx = {
    nextId: () => id++,
    resources
  };
  
  setSSRContext(ctx);
  setSSRResources(resources);
  setSSRImplementation(ssrH);
  
  try {
    let html = fn();
    if (typeof html === "function") {
        html = html();
    }
    
    let resourceScripts = "";
    for (const [resId, data] of resources) {
        const json = JSON.stringify(data).replace(/</g, '\\u003c');
        resourceScripts += `<script type="application/json" id="shy-res-${resId}">${json}</script>`;
    }
    
    return html.toString() + resourceScripts;
  } finally {
    setSSRContext(null);
    setSSRResources(null);
    setSSRImplementation(null);
  }
}
