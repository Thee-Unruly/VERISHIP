import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "dark" || v === "light") return v;
    } catch (e) {
      // ignore
    }
    return "light";
  });

  useEffect(() => {
    try {
      const root = window.document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((s) => (s === "dark" ? "light" : "dark"));

  return { theme, setTheme, toggle };
}
