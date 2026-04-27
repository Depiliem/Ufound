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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login SSO</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login sebagai Mahasiswa</Text>
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
