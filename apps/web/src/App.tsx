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
    <span className={() => theme() === "dark" ? "text-indigo-400 font-bold" : "text-indigo-600 font-bold"}>
      {props.text}
    </span>
  );
}

function UserProfile(props: { id: () => number }) {
  const user = res(async (id) => {
    const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
  }, props.id);

  return (
    <div className="border border-gray-300 p-4 m-2 rounded-lg text-left inline-block">
      {() => {
        const data = user();
        if (user.error()) return <p className="text-red-500">Error: {(user.error() as Error).message}</p>;
        return (
          <div className="user-info">
            <h3 className="text-xl font-bold">{data?.name}</h3>
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
    <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition" onClick={() => setShouldCrash(true)}>Crash this sub-tree</button>
      <div className="mt-2">
        {() => {
          if (shouldCrash()) throw new Error("Boom! Sub-tree crashed.");
          return <p>I am safe for now.</p>;
        }}
      </div>
    </div>
  );
}

// --- Main App ---
export function App() {
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
      const start = performance.now();
      while(performance.now() - start < 50) {} 
      setTab(t);
    });
  };

  return prv(ThemeContext, theme, () => (
    <div className={() => `min-h-screen p-5 transition-colors duration-300 font-sans text-center ${theme() === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <header className="mb-8 border-b border-gray-400 pb-4">
        <h1 className="text-3xl font-extrabold mb-4">SHy.js Full-Stack Framework</h1>
        <button className="border border-indigo-500 px-4 py-2 rounded hover:bg-indigo-500/10 transition" onClick={toggleTheme}>Toggle Theme: {() => theme()}</button>
      </header>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">1. SSR & Hydration with Suspense</h2>
        <div className="flex gap-4 items-center justify-center mb-4">
           <button className="border border-indigo-500 px-4 py-2 rounded hover:bg-indigo-500/10" onClick={() => setUserId(id => Math.max(1, id - 1))}>Prev User</button>
           <span className="text-lg">User ID: {() => userId()}</span>
           <button className="border border-indigo-500 px-4 py-2 rounded hover:bg-indigo-500/10" onClick={() => setUserId(id => id + 1)}>Next User</button>
        </div>
        
        <Suspense fallback={<div className="italic text-gray-500 p-4">Loading User Data on Server...</div>}>
          <UserProfile id={() => userId()} />
        </Suspense>
      </section>

      <section className="mb-10 border-t border-gray-400 pt-8">
        <h2 className="text-2xl font-bold mb-4">2. Transitions & Tabs</h2>
        <nav className="flex gap-4 justify-center mb-4">
          <button className="border border-indigo-500 px-4 py-2 rounded hover:bg-indigo-500/10" onClick={() => switchTab("home")} style={() => ({ opacity: tab() === "home" ? 1 : 0.6 })}>Home</button>
          <button className="border border-indigo-500 px-4 py-2 rounded hover:bg-indigo-500/10" onClick={() => switchTab("about")} style={() => ({ opacity: tab() === "about" ? 1 : 0.6 })}>About (Heavy)</button>
        </nav>
        <div className="text-indigo-500 mb-4">
          {() => isPending() ? "Transitioning..." : "Idle"}
        </div>
        <div className="tab-content p-4 bg-black/5 rounded-lg inline-block">
          {() => tab() === "home" ? <p>Welcome Home!</p> : <p>This is the heavy About tab.</p>}
        </div>
      </section>

      <section className="mb-10 border-t border-gray-400 pt-8">
        <h2 className="text-2xl font-bold mb-4">3. Error Boundaries</h2>
        <ErrorBoundary fallback={(err) => <div className="bg-red-100 text-red-700 p-4 rounded-lg border border-red-700 inline-block">Caught by Boundary: {err.message}</div>}>
          {() => <BuggyComponent />}
        </ErrorBoundary>
      </section>

      <section className="mb-10 border-t border-gray-400 pt-8">
        <h2 className="text-2xl font-bold mb-4">4. Keyed (For) vs Non-Keyed (Index)</h2>
        <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
          <div className="bg-black/5 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">For (Keyed)</h3>
            <button className="border border-indigo-500 px-3 py-1 rounded hover:bg-indigo-500/10 mb-4" onClick={() => setItems(prev => [{ id: Date.now(), text: "New Item" }, ...prev])}>Add Top</button>
            <ul className="text-left space-y-1">
              <For each={items}>
                {(item) => <li key={item.id}>{item.text} (ID: {item.id})</li>}
              </For>
            </ul>
          </div>
          <div className="bg-black/5 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Index (Non-Keyed)</h3>
            <button className="border border-indigo-500 px-3 py-1 rounded hover:bg-indigo-500/10 mb-4" onClick={() => setSimpleList(prev => ["New", ...prev])}>Add Top</button>
            <ul className="text-left space-y-1">
              <Index each={simpleList}>
                {(item, i) => <li>{() => i} - {() => item()}</li>}
              </Index>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-10 border-t border-gray-400 pt-8">
        <h2 className="text-2xl font-bold mb-4">5. Portals & Dynamic Components</h2>
        <button className="border border-indigo-500 px-4 py-2 rounded hover:bg-indigo-500/10 m-2" onClick={() => setModalOpen(true)}>Open Portal Modal</button>
        <button className="border border-indigo-500 px-4 py-2 rounded hover:bg-indigo-500/10 m-2" onClick={() => setDynamicTag(t => t === "button" ? "div" : "button")}>
          Switch Dynamic Tag: {() => dynamicTag()}
        </button>
        
        <div className="mt-4">
          <Dynamic component={dynamicTag()} className="border-2 border-green-500 p-2 rounded inline-block">
             I am a dynamic {() => dynamicTag()}
          </Dynamic>
        </div>

        {() => isModalOpen() && (
          <Portal>
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
              <div className="bg-white text-black p-8 rounded-xl max-w-md w-11/12 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">I am in a Portal!</h2>
                <p className="mb-6">I am rendered directly under document.body</p>
                <button className="bg-indigo-500 text-white px-6 py-2 rounded hover:bg-indigo-600" onClick={() => setModalOpen(false)}>Close</button>
              </div>
            </div>
          </Portal>
        )}
      </section>

      <section className="mb-10 border-t border-gray-400 pt-8 pb-20">
        <h2 className="text-2xl font-bold mb-4">6. SVG & Reactive Attributes</h2>
        <p className="text-lg mb-4">Value: {() => count()}</p>
        <button className="border border-indigo-500 px-6 py-2 rounded hover:bg-indigo-500/10" onClick={() => setCount(c => c + 1)}>Increment</button>
        <div className="mt-6 flex justify-center">
          <svg width="200" height="60" viewBox="0 0 200 60">
            <rect 
              x="10" y="10" 
              width={() => 20 + count() * 5} 
              height="40" 
              fill={() => theme() === "dark" ? "#818cf8" : "#4f46e5"} 
              rx="5"
            />
            <text x="100" y="35" fill="white" text-anchor="middle" dominant-baseline="middle">
              {() => count()}
            </text>
          </svg>
        </div>
      </section>
    </div>
  ));
}
