import { 
  s, eff, off, ut, mem, res, trn, 
  ctx, prv, inj, 
  For, Index, ErrorBoundary, Suspense, Portal, Dynamic 
} from 'shy';

// --- Context & Types ---
const ThemeContext = ctx("light");
type Item = { id: number; text: string };

// --- Sub-Components ---
function ThemedText(props: { text: string }) {
  const theme = inj(ThemeContext);
  return (
    <span style={() => ({ 
      color: theme() === "dark" ? "#646cff" : "#3232bb", 
      fontWeight: "bold" 
    })}>
      {props.text}
    </span>
  );
}

function UserProfile(props: { id: number }) {
  // Testing Resource API
  const user = res(async (id) => {
    const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
  }, () => props.id);

  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", margin: "10px", borderRadius: "8px" }}>
      {() => {
        const data = user();
        if (user.error()) return <p style={{ color: "red" }}>Error: {user.error().message}</p>;
        return (
          <div className="user-info">
            <h3>{data?.name}</h3>
            <p>Email: {data?.email}</p>
            <p>Company: {data?.company?.name}</p>
          </div>
        );
      }}
    </div>
  );
}

function BuggyComponent() {
  const [shouldCrash, setShouldCrash] = s(false);
  return (
    <div>
      <button onClick={() => setShouldCrash(true)}>Crash this sub-tree</button>
      {() => {
        if (shouldCrash()) throw new Error("Boom! Sub-tree crashed.");
        return <p>I am safe for now.</p>;
      }}
    </div>
  );
}

// --- Main App ---
function App() {
  const [count, setCount] = s(0);
  const [theme, setTheme] = s("dark");
  const [userId, setUserId] = s(1);
  const [items, setItems] = s<Item[]>([{ id: 1, text: "Keyed Item 1" }, { id: 2, text: "Keyed Item 2" }]);
  const [simpleList, setSimpleList] = s(["Alpha", "Beta", "Gamma"]);
  const [isModalOpen, setModalOpen] = s(false);
  const [tab, setTab] = s("home");
  const [isPending, startTransition] = trn();
  const [dynamicTag, setDynamicTag] = s("button");

  const toggleTheme = () => setTheme((t) => t === "light" ? "dark" : "light");
  
  const switchTab = (t: string) => {
    startTransition(() => {
      // Simulate heavy work during transition
      const start = performance.now();
      while(performance.now() - start < 50) {} 
      setTab(t);
    });
  };

  return prv(ThemeContext, theme, () => (
    <div className="app-root" style={() => ({ 
      background: theme() === "dark" ? "#1a1a1a" : "#f9f9f9", 
      color: theme() === "dark" ? "#f9f9f9" : "#1a1a1a",
      minHeight: "100vh",
      padding: "20px",
      fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"
    })}>
      <header>
        <h1>SHy.js Enterprise Test Suite</h1>
        <button onClick={toggleTheme}>Toggle Theme: {() => theme()}</button>
      </header>

      <section>
        <h2>1. Suspense & Resource API</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "center" }}>
           <button onClick={() => setUserId(id => Math.max(1, id - 1))}>Prev User</button>
           <span>User ID: {() => userId()}</span>
           <button onClick={() => setUserId(id => id + 1)}>Next User</button>
        </div>
        
        <Suspense fallback={<div className="loader">Loading User Data...</div>}>
          <UserProfile id={userId()} />
        </Suspense>
      </section>

      <section>
        <h2>2. Transitions & Tabs</h2>
        <nav style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button onClick={() => switchTab("home")} style={() => ({ opacity: tab() === "home" ? 1 : 0.6 })}>Home</button>
          <button onClick={() => switchTab("about")} style={() => ({ opacity: tab() === "about" ? 1 : 0.6 })}>About (Heavy)</button>
        </nav>
        <div style={{ margin: "10px", color: "#646cff" }}>
          {() => isPending() ? "Transitioning..." : "Idle"}
        </div>
        <div className="tab-content">
          {() => tab() === "home" ? <p>Welcome Home!</p> : <p>This is the heavy About tab.</p>}
        </div>
      </section>

      <section>
        <h2>3. Error Boundaries</h2>
        <ErrorBoundary fallback={(err) => <div className="error-box">Caught by Boundary: {err.message}</div>}>
          {() => <BuggyComponent />}
        </ErrorBoundary>
      </section>

      <section>
        <h2>4. Keyed (For) vs Non-Keyed (Index)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <h3>For (Keyed)</h3>
            <button onClick={() => setItems(prev => [{ id: Date.now(), text: "New Item" }, ...prev])}>Add Top</button>
            <ul>
              <For each={items}>
                {(item) => <li key={item.id}>{item.text} (ID: {item.id})</li>}
              </For>
            </ul>
          </div>
          <div>
            <h3>Index (Non-Keyed)</h3>
            <button onClick={() => setSimpleList(prev => ["New", ...prev])}>Add Top</button>
            <ul>
              <Index each={simpleList}>
                {(item, i) => <li>{() => i} - {() => item()}</li>}
              </Index>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2>5. Portals & Dynamic Components</h2>
        <button onClick={() => setModalOpen(true)}>Open Portal Modal</button>
        <button onClick={() => setDynamicTag(t => t === "button" ? "div" : "button")}>
          Switch Dynamic Tag: {() => dynamicTag()}
        </button>
        
        <div style={{ marginTop: "10px" }}>
          <Dynamic component={dynamicTag()} style={{ border: "1px solid green", padding: "5px" }}>
             I am a dynamic {() => dynamicTag()}
          </Dynamic>
        </div>

        {() => isModalOpen() && (
          <Portal>
            <div className="modal-overlay" onClick={() => setModalOpen(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>I am in a Portal!</h2>
                <p>I am rendered directly under document.body</p>
                <button onClick={() => setModalOpen(false)}>Close</button>
              </div>
            </div>
          </Portal>
        )}
      </section>

      <section>
        <h2>6. SVG & Reactive Attributes</h2>
        <p>Value: {() => count()}</p>
        <button onClick={() => setCount(c => c + 1)}>Increment</button>
        <div style={{ marginTop: "10px" }}>
          <svg width="200" height="60" viewBox="0 0 200 60">
            <rect 
              x="10" y="10" 
              width={() => 20 + count() * 5} 
              height="40" 
              fill={() => theme() === "dark" ? "#646cff" : "#3232bb"} 
              rx="5"
            />
            <text x="100" y="35" fill="white" text-anchor="middle">
              {() => count()}
            </text>
          </svg>
        </div>
      </section>

      <style>{`
        .app-root { text-align: center; transition: background 0.3s, color 0.3s; }
        section { margin-bottom: 40px; border-bottom: 1px solid #444; padding-bottom: 20px; }
        .loader { font-style: italic; color: #888; padding: 20px; }
        .error-box { background: #fee; color: #c33; padding: 15px; border-radius: 4px; border: 1px solid #c33; }
        .modal-overlay { 
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
          background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;
        }
        .modal-content { 
          background: #fff; color: #000; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%;
        }
        button { 
          padding: 8px 16px; margin: 4px; cursor: pointer; border-radius: 4px; 
          border: 1px solid #646cff; background: transparent; color: inherit;
          transition: border-color 0.25s;
        }
        button:hover { border-color: #535bf2; background: rgba(100, 108, 255, 0.1); }
        ul { list-style: none; padding: 0; }
        li { padding: 4px 0; }
      `}</style>
    </div>
  ));
}

const rootEl = document.getElementById("root");
if (rootEl) {
  rootEl.innerHTML = '';
  const app = App();
  if (typeof app === 'function') {
    // If it's a thunk, we need to wrap it in a marker for the renderer to handle re-renders
    const fragment = document.createDocumentFragment();
    // Use h to create a temporary container that handles the thunk
    const container = h('div', { id: 'shy-app-container' }, app);
    rootEl.appendChild(container);
  } else {
    rootEl.appendChild(app);
  }
}
