import React, { createContext, ReactNode, useContext, useState } from "react";
import { Colors } from "../constants/Colors";

type Theme = {
  background: string;
  cardBackground: string;
  textMain: string;
  textSecondary: string;
  border: string;
  searchBackground: string;
  chipActive: string;
  iconEmpty: string;
};

interface AppContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  currentTheme: Theme;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const currentTheme: Theme = {
    background: isDarkMode ? "#121212" : Colors.background,
    cardBackground: isDarkMode ? "#1E1E1E" : Colors.cardBackground,
    textMain: isDarkMode ? "#FFFFFF" : Colors.textMain,
    textSecondary: isDarkMode ? "#A0A0A0" : Colors.textSecondary,
    border: isDarkMode ? "#333333" : Colors.border,
    searchBackground: isDarkMode ? "#2A2A2A" : "#EAEAEA",
    chipActive: isDarkMode ? "#444444" : "#D3D3D3",
    iconEmpty: isDarkMode ? "#333333" : Colors.border,
  };

  return (
    <AppContext.Provider value={{ isDarkMode, toggleTheme, currentTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
