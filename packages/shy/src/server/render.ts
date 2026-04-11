import { setSSRContext, h as ssrH, renderChild } from "./jsx-ssr";
import { setSSRResources, getSSRPromises, resetResourceCounter } from "../reactivity/resource";
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
    // GUNAKAN renderChild agar root component mendapatkan marker <!--shy:0--> yang sama dengan client
    const html = renderChild(fn);
    
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

export async function renderToStringAsync(fn: () => any): Promise<string> {
  const resources = new Map<string, any>();
  
  // Re-define nextId logic for consistency
  let globalId = 0;
  const getNextId = () => globalId++;

  setSSRContext({ nextId: getNextId, resources });
  setSSRResources(resources);
  setSSRImplementation(ssrH);
  
  try {
    // Pass 1: Trigger resources
    renderChild(fn);

    // Wait for all collected promises
    let promises = getSSRPromises();
    while (promises.length > 0) {
        await Promise.all(promises);
        resetResourceCounter();
        globalId = 0; // Reset ID for re-render
        renderChild(fn);
        promises = getSSRPromises();
    }
    
    // Final Pass: Get HTML with markers
    resetResourceCounter();
    globalId = 0;
    const html = renderChild(fn);

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
