"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "dark");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("propval-theme", nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-bg-card px-3 text-xs font-semibold text-text-secondary transition hover:border-border-glow hover:text-text-primary"
      aria-label="Toggle theme"
    >
      <span className="text-sm">{theme === "dark" ? "☀️" : "🌙"}</span>
      <span>{theme === "dark" ? "Light" : "Dark"} Mode</span>
    </button>
  );
}
