
const ESCAPE_LOOKUP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (s) => ESCAPE_LOOKUP[s]);
}

let ssrContext: {
  nextId: () => number;
  resources: Map<string, any>;
} | null = null;

export function setSSRContext(ctx: typeof ssrContext) {
  ssrContext = ctx;
}

export class SafeHTML {
  constructor(public html: string) {}
  toString() { return this.html; }
}

export function h(tag: any, props: any, ...children: any[]): any {
  if (typeof tag === "function") {
    const result = tag({ ...props, children });
    return result;
  }

  let attrs = "";
  if (props) {
    for (const key in props) {
      if (key === "ref" || key === "use" || key.startsWith("on")) {
        continue;
      }
      const value = props[key];
      const attrName = key === "className" ? "class" : key;
      
      if (typeof value === "function") {
          const val = value();
          if (val != null && val !== false) {
              if (key === "style" && typeof val === "object") {
                  const styleStr = Object.entries(val)
                      .map(([k, v]) => `${k}:${v}`)
                      .join(";");
                  attrs += ` ${attrName}="${escapeHtml(styleStr)}"`;
              } else if (key === "classList" && typeof val === "object") {
                  const classes = Object.entries(val)
                      .filter(([_, v]) => v)
                      .map(([k, _]) => k)
                      .join(" ");
                  if (classes) attrs += ` class="${escapeHtml(classes)}"`;
              } else {
                  attrs += ` ${attrName}="${escapeHtml(String(val))}"`;
              }
          }
      } else if (value != null && value !== false) {
          if (key === "style" && typeof value === "object") {
              const styleStr = Object.entries(value)
                  .map(([k, v]) => `${k}:${v}`)
                  .join(";");
              attrs += ` style="${escapeHtml(styleStr)}"`;
          } else if (key === "classList" && typeof value === "object") {
              const classes = Object.entries(value)
                  .filter(([_, v]) => v)
                  .map(([k, _]) => k)
                  .join(" ");
              if (classes) attrs += ` class="${escapeHtml(classes)}"`;
          } else {
              attrs += ` ${attrName}="${escapeHtml(String(value))}"`;
          }
      }
    }
  }

  const flatChildren = children.flat(Infinity);
  let innerHtml = "";

  for (const child of flatChildren) {
    innerHtml += renderChild(child);
  }

  let html: string;
  const selfClosing = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  if (selfClosing.has(tag)) {
    html = `<${tag}${attrs}>`;
  } else {
    html = `<${tag}${attrs}>${innerHtml}</${tag}>`;
  }

  return new SafeHTML(html);
}

export function renderChild(child: any): string {
  if (child == null || child === false) return "";

  if (child instanceof SafeHTML) {
      return child.html;
  }

  if (child && child.$$isFor) {
    const { each, fallback } = child.props;
    const renderItem = child.props.children ? (Array.isArray(child.props.children) ? child.props.children[0] : child.props.children) : null;
    const list = typeof each === "function" ? each() : each;
    if (!list || list.length === 0) {
      return (fallback ? renderChild(typeof fallback === "function" ? fallback() : fallback) : "") + "<!--ForMarker-->";
    }
    return list.map((item: any, i: number) => renderChild(() => renderItem(item, () => i))).join("") + "<!--ForMarker-->";
  }

  if (child && child.$$isIndex) {
    const { each, fallback } = child.props;
    const renderItem = child.props.children ? (Array.isArray(child.props.children) ? child.props.children[0] : child.props.children) : null;
    const list = typeof each === "function" ? each() : each;
    if (!list || list.length === 0) {
      return (fallback ? renderChild(typeof fallback === "function" ? fallback() : fallback) : "") + "<!--IndexMarker-->";
    }
    return list.map((item: any, i: number) => renderChild(() => renderItem(() => item, i))).join("") + "<!--IndexMarker-->";
  }

  if (typeof child === "function") {
    const id = ssrContext ? ssrContext.nextId() : 0;
    let val = child();
    while (typeof val === "function" && !val.$$isShy) {
      val = val();
    }
    
    return `<!--shy:${id}-->${renderChild(val)}<!--/shy:${id}-->`;
  }

  if (Array.isArray(child)) {
    return child.map(renderChild).join("");
  }

  if (typeof child === "string") {
    return escapeHtml(child);
  }

  return escapeHtml(String(child));
}
