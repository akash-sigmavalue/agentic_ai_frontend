"use client";

import { useEffect, useState } from "react";

const THEMES = {
  dark: {
    label: "Dark",
    icon: "🌙",
  },
  light: {
    label: "Light",
    icon: "☀️",
  },
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("reai-theme");
    const initialTheme = stored || "dark";
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("reai-theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition hover:scale-[1.02]"
      style={{
        borderColor: "var(--border-soft)",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      }}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span>{THEMES[theme].icon}</span>
      <span>{THEMES[theme].label}</span>
    </button>
  );
}
