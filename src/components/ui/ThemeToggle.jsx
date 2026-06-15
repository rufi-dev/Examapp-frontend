import { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

function getInitial() {
  try {
    const t = localStorage.getItem("theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <button
      type="button"
      aria-label={theme === "dark" ? "İşıqlı temaya keç" : "Qaranlıq temaya keç"}
      title={theme === "dark" ? "İşıqlı tema" : "Qaranlıq tema"}
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-text transition-all duration-200 ease-out-quint hover:bg-surface2 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 ${className}`}
    >
      {theme === "dark" ? <FiSun className="text-[18px]" /> : <FiMoon className="text-[18px]" />}
    </button>
  );
}
