import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [status, setStatus] = useState<string>("Belum diuji");

  const handleLogin = () => {
    router.replace("/(tabs)");
  };

  const testConnection = async () => {
    setStatus("Menguji koneksi...");
    try {
      const { data, error } = await supabase.from("items").select("*").limit(1);

      if (error) {
        setStatus(`Koneksi berhasil, tetapi ada error: ${error.message}`);
      } else {
        setStatus("Koneksi sukses dan tabel items ditemukan.");
      }
    } catch (err: any) {
      setStatus(`Koneksi gagal: ${err.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login SSO</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login sebagai Mahasiswa</Text>
      </TouchableOpacity>

      <View style={styles.testContainer}>
        <TouchableOpacity style={styles.testButton} onPress={testConnection}>
          <Text style={styles.testButtonText}>Test Database Connection</Text>
        </TouchableOpacity>
        <Text style={styles.statusText}>Status: {status}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    color: Colors.textMain,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 40,
  },
  buttonText: {
    color: Colors.primaryText,
    fontSize: 16,
    fontWeight: "bold",
  },
  testContainer: {
    alignItems: "center",
    marginTop: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    width: "80%",
  },
  testButton: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  testButtonText: {
    color: Colors.primary,
    fontWeight: "bold",
  },
  statusText: {
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 10,
  },
});
