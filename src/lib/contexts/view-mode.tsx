"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export type ViewMode = "modern" | "editorial";

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextValue>({
  viewMode: "modern",
  setViewMode: () => {},
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("modern");

  useEffect(() => {
    const stored = localStorage.getItem("viewMode") as ViewMode | null;
    if (stored === "modern" || stored === "editorial") {
      setViewModeState(stored);
    }
    // Apply the class on mount
    document.documentElement.classList.toggle(
      "modern-view",
      (stored ?? "modern") === "modern",
    );
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    document.documentElement.classList.toggle("modern-view", mode === "modern");
    localStorage.setItem("viewMode", mode);
  }, []);

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
