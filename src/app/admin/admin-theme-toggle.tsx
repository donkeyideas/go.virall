"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function AdminThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("admin-theme");
    if (saved === "light") {
      setTheme("light");
      document.querySelector(".admin-dark")?.classList.replace("admin-dark", "admin-light");
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("admin-theme", next);
    const wrapper = document.querySelector(`.admin-${theme}`);
    wrapper?.classList.replace(`admin-${theme}`, `admin-${next}`);
  }

  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        background: "rgba(75,156,211,0.15)",
        border: "1px solid rgba(75,156,211,0.2)",
        borderRadius: 8,
        color: theme === "dark" ? "#FFB84D" : "#7c3aed",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
