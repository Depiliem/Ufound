import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
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

// Key untuk menyimpan data di AsyncStorage
const THEME_STORAGE_KEY = "app_theme_mode";

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 1. Muat preferensi tema saat aplikasi pertama kali dibuka (Cold Start)
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === "dark");
        }
      } catch (error) {
        console.error("Gagal memuat preferensi tema:", error);
      }
    };

    loadTheme();
  }, []);

  // 2. Ubah fungsi toggle agar ikut menyimpan pilihan ke AsyncStorage
  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode); // Update tampilan secara instan

      // Simpan pilihan ke storage HP
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode ? "dark" : "light");
    } catch (error) {
      console.error("Gagal menyimpan preferensi tema:", error);
    }
  };

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
