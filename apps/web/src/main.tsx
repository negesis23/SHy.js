import { s, eff, For, ctx, prv, inj, off } from 'shy';

// Test Context
const ThemeContext = ctx("light");

function ThemedText(props: { text: string }) {
  const theme = inj(ThemeContext);
  return (
    <span style={() => ({ color: theme() === "dark" ? "white" : "black", background: theme() === "dark" ? "#333" : "#eee", padding: "4px" })}>
      {props.text}
    </span>
  );
}

function Counter() {
  const [count, setCount] = s(0);
  const [theme, setTheme] = s("light");
  const [items, setItems] = s([{ id: 1, text: "Item 1" }, { id: 2, text: "Item 2" }]);

  // Test effect cleanup
  eff(() => {
    console.log("Count changed to:", count());
    const interval = setInterval(() => {
      console.log("Interval running for count:", count());
    }, 1000);
    off(() => {
      console.log("Cleanup for count:", count());
      clearInterval(interval);
    });
  });

  // Test refs
  let myRef: HTMLDivElement | null = null;
  eff(() => {
    if (myRef) {
      console.log("Ref is attached!", myRef);
    }
  });

  const toggleTheme = () => setTheme((t) => t === "light" ? "dark" : "light");

  const addItem = () => {
    setItems((prev) => [...prev, { id: prev.length + 1, text: `Item ${prev.length + 1}` }]);
  };

  const removeItem = () => {
    setItems((prev) => prev.slice(0, -1));
  };
  
  // Test batching
  const doBatchedUpdates = () => {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    // Should only trigger the effect once because of microtask batching
  };

  return prv(ThemeContext, theme, () => (
    <div ref={(el: HTMLDivElement) => (myRef = el)} className="container" style={() => ({ background: theme() === "dark" ? "#222" : "#fff", color: theme() === "dark" ? "#fff" : "#000" })}>
      <h1>
        Counter with SHy.js
      </h1>
      <p>
        <ThemedText text="Themed text example" />
      </p>
      <p>
        Value: {() => count()}
      </p>
      
      {/* Test SVG Support */}
      <svg width="100" height="100" style={{ border: "1px solid red", margin: "10px" }}>
        <circle cx={() => 50 + count() * 2} cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
      </svg>

      <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
        <button onClick={doBatchedUpdates}>
          Add 3 (Batched)
        </button>
        <button onClick={toggleTheme}>
          Toggle Theme
        </button>
        <button onClick={addItem}>
          Add Item
        </button>
        <button onClick={removeItem}>
          Remove Item
        </button>
      </div>

      {/* Test Keyed Diffing with For */}
      <ul style={{ listStyle: "none", padding: 0 }}>
        <For each={items} fallback={<li>No items</li>}>
          {(item, index) => (
            <li style={{ padding: "8px", borderBottom: "1px solid #ccc" }}>
              {() => index()} - {item.text}
            </li>
          )}
        </For>
      </ul>

      <style>{`
        .container { font-family: sans-serif; text-align: center; padding: 2rem; margin-top: 50px; min-height: 100vh; }
        button { padding: 0.5rem 1rem; font-size: 1rem; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; }
        button:hover { background-color: #f0f0f0; color: black; }
        p { font-size: 1.5rem; font-weight: bold; }
      `}</style>
    </div>
  ));
}

const rootEl = document.getElementById("root");
if (rootEl) {
  rootEl.innerHTML = '';
  rootEl.appendChild(Counter());
}
