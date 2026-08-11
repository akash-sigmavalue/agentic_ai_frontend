"use client";

import React from "react";

const THEME_STORAGE_KEY = "sigmavalue_theme";
const THEME_CHANGE_EVENT = "sigmavalue-theme-change";

const getThemeSnapshot = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark";
};

const getServerThemeSnapshot = () => false;

const subscribeToTheme = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => {
    const isDark = getThemeSnapshot();
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    onStoreChange();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(THEME_CHANGE_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(THEME_CHANGE_EVENT, handleChange);
  };
};

export function useTheme() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const isDark = localStorage.getItem(THEME_STORAGE_KEY) === "dark";
      document.documentElement.classList.toggle("dark-mode", isDark);
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
    }
  }, []);

  const isDarkSnapshot = React.useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  return mounted ? isDarkSnapshot : false;
}
