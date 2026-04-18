import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://qbhcebjqhatcdlertjgc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaGNlYmpxaGF0Y2RsZXJ0amdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTY2MjAsImV4cCI6MjA5MjA5MjYyMH0.6qvbyTNJH3wg8zqdL5h_sehXKWBhrPCSZF_Bu-Wj9w4";

const ExpoStorageAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return Promise.resolve(null);
      }
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return Promise.resolve();
      }
      return Promise.resolve(window.localStorage.setItem(key, value));
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return Promise.resolve();
      }
      return Promise.resolve(window.localStorage.removeItem(key));
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
