import { s, eff } from 'shy';

function Counter() {
  const [count, setCount] = s(0);

  // Efek berjalan setiap kali "count" berubah
  eff(() => {
    console.log("Count changed to:", count());
  });

  return (
    <div className="container">
      <h1 className={() => (count() > 5 ? 'high' : 'low')}>
        Super React Counter
      </h1>
      <p>
        Nilai: {() => count()}
      </p>
      <button onClick={() => setCount((c: number) => c + 1)}>
        Tambah
      </button>

      <style>{`
        .container { font-family: sans-serif; text-align: center; padding: 2rem; margin-top: 50px; }
        .high { color: red; }
        .low { color: blue; }
        button { padding: 0.5rem 1rem; font-size: 1rem; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; }
        button:hover { background-color: #f0f0f0; }
        p { font-size: 1.5rem; font-weight: bold; }
      `}</style>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  rootEl.appendChild(Counter());
}