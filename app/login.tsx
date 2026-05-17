import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";

export default function Login() {
  const [status, setStatus] = useState<string>("Belum diuji");

  const handleLogin = () => {
    router.replace("/(tabs)");
  };

  const handleAdminLogin = () => {
    router.push("/admin");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login SSO</Text>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login sebagai Mahasiswa</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.adminButton]}
        onPress={handleAdminLogin}
      >
        <Text style={[styles.buttonText, styles.adminButtonText]}>
          Login sebagai Admin
        </Text>
      </TouchableOpacity>
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
    marginBottom: 40,
    color: Colors.textMain,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 15,
    width: "80%",
    alignItems: "center",
  },
  adminButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  adminButtonText: {
    color: Colors.primary,
  },
});
