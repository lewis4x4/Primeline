import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const commands = [
  { label: "Dashboard", path: "/dashboard", type: "Nav" },
  { label: "Athletes", path: "/athletes", type: "Nav" },
  { label: "Brands", path: "/brands", type: "Nav" },
  { label: "Matches", path: "/matches", type: "Nav" },
  { label: "Deals", path: "/deals", type: "Nav" },
  { label: "Action Queue", path: "/digest", type: "Nav" },
  { label: "Deal Intel", path: "/deal-intel", type: "Nav" },
  { label: "Rate Intel", path: "/rate-intel", type: "Nav" },
  { label: "Leads", path: "/leads", type: "Nav" },
  { label: "Analytics", path: "/analytics", type: "Nav" },
  { label: "Settings", path: "/settings", type: "Nav" },
  { label: "Calculator", path: "/calculator", type: "Tool" },
  { label: "Create Athlete", path: "/athletes/new", type: "Action" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle on Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setSelectedIndex(0);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && filtered[selectedIndex]) {
      navigate(filtered[selectedIndex].path);
      setOpen(false);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white border border-black overflow-hidden">
        {/* Input */}
        <div className="flex items-center border-b border-gray-200 px-4">
          <span className="font-mono text-xs text-gray-400 mr-3">&gt;</span>
          <input
            ref={inputRef}
            className="flex-1 h-14 bg-transparent outline-none text-base font-medium placeholder:text-gray-300"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="font-mono text-[10px] text-gray-400 border border-gray-200 px-1.5 py-0.5">
            ESC
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              No results found.
            </div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.path}
                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                  i === selectedIndex
                    ? "bg-black text-white"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => {
                  navigate(item.path);
                  setOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span
                  className={`font-mono text-[10px] uppercase ${
                    i === selectedIndex ? "text-gray-400" : "text-gray-300"
                  }`}
                >
                  {item.type}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-2 flex justify-between items-center text-[10px] text-gray-400 font-mono uppercase">
          <span>
            <span className="border border-gray-200 px-1 mr-1">↑↓</span>
            Navigate
          </span>
          <span>
            <span className="border border-gray-200 px-1 mr-1">↵</span>
            Open
          </span>
        </div>
      </div>
    </div>
  );
}
