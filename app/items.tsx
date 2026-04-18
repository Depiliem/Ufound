import { StyleSheet, Text, View } from "react-native";

export default function Items() {
  return (
    <View style={styles.container}>
      <Text>Halaman List Barang</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
});
