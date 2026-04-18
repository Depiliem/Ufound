import { View } from "react-native";

export default function Add() {
  // Komponen ini tidak akan pernah dirender karena tombol tab-nya
  // sudah dicegat oleh listener di _layout.tsx untuk membuka /report
  return <View />;
}
