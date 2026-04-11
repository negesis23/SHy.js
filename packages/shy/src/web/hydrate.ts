export function hydrate(fn: () => any, container: Element) {
  // 1. Ambil data Resource dari script tag sebelum dibersihkan
  (window as any).__SHY_HYDRATION__ = true;
  
  try {
    // 2. Build interactive Blueprint di memory
    let blueprint = fn();
    while (typeof blueprint === "function" && !blueprint.$$isShy) {
        blueprint = blueprint();
    }
    
    // 3. Structural Patching (Recursive Match & Replace)
    // Kita menyusuri DOM Server dan menggantinya dengan DOM Reaktif.
    patch(container, blueprint);

  } finally {
    delete (window as any).__SHY_HYDRATION__;
  }
}

/**
 * Fungsi patch yang melakukan sinkronisasi antara DOM statis (server)
 * dengan DOM interaktif (blueprint) secara rekursif dan bedah.
 */
function patch(realParent: Node, blueprint: any) {
  if (blueprint == null || blueprint === false) return;

  if (Array.isArray(blueprint)) {
    blueprint.forEach(child => patch(realParent, child));
    return;
  }

  if (blueprint instanceof Node) {
    // Cari elemen statis yang bersesuaian di real DOM
    // Kita prioritaskan berdasarkan urutan dan tipe Node
    let realNode = realParent.firstChild;
    
    // Skip sampai menemukan Node yang tipenya sama
    while (realNode && realNode.nodeType !== blueprint.nodeType) {
        realNode = realNode.nextSibling;
    }

    if (realNode) {
        // GANTI node statis dengan node interaktif secara bedah!
        // Ini memastikan 'eff' closure tetap merujuk ke elemen yang benar.
        realParent.replaceChild(blueprint, realNode);
    } else {
        // Jika tidak ketemu (misal elemen baru), append saja
        realParent.appendChild(blueprint);
    }
  }
}
