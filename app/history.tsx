import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Colors } from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";

type Item = {
  id: string;
  created_at: string;
  type: "lost" | "found";
  name: string;
  category: string;
  building: string;
  floor: string;
  image_url: string | null;
};

export default function History() {
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTheme } = useAppContext();

  const fetchMyReports = async () => {
    try {
      setLoading(true);
      const storedIds = await AsyncStorage.getItem("my_reports");
      console.log("ISI STORAGE DI HP:", storedIds); // Untuk Debugging

      if (!storedIds) {
        setMyItems([]);
        return;
      }

      let idsArray: string[] = [];
      try {
        idsArray = JSON.parse(storedIds);
      } catch (e) {
        // Jika file JSON corrupt dari test sebelumnya, bersihkan.
        await AsyncStorage.removeItem("my_reports");
        setMyItems([]);
        return;
      }

      if (!Array.isArray(idsArray) || idsArray.length === 0) {
        setMyItems([]);
        return;
      }

      const { data, error } = await supabase
        .from("items")
        .select("*")
        .in("id", idsArray)
        .eq("type", "lost")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyItems(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyReports();
    }, []),
  );

  const handleDelete = (id: string) => {
    Alert.alert(
      "Selesaikan Laporan",
      "Apakah barang sudah kembali? Laporan akan dihapus permanen.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Selesai",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from("items").delete().eq("id", id);
              const storedIds = await AsyncStorage.getItem("my_reports");
              if (storedIds) {
                const updatedIds = JSON.parse(storedIds).filter(
                  (itemId: string) => itemId !== id,
                );
                await AsyncStorage.setItem(
                  "my_reports",
                  JSON.stringify(updatedIds),
                );
              }
              fetchMyReports();
            } catch (error) {
              Alert.alert("Gagal", "Gagal menghapus.");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Item }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: currentTheme.cardBackground,
          borderColor: currentTheme.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.cardWrapper}
        onPress={() => router.push(`/detail/${item.id}`)}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <View
            style={[
              styles.noImage,
              { backgroundColor: currentTheme.background },
            ]}
          >
            <Ionicons
              name="image-outline"
              size={30}
              color={currentTheme.textSecondary}
            />
          </View>
        )}
        <View style={styles.cardText}>
          <Text
            style={[styles.itemName, { color: currentTheme.textMain }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.dateText, { color: currentTheme.textSecondary }]}
          >
            {new Date(item.created_at).toLocaleDateString("id-ID")}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.resolveBtn}
        onPress={() => handleDelete(item.id)}
      >
        <Text style={styles.resolveText}>Tandai Selesai</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: currentTheme.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={currentTheme.textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.textMain }]}>
          Riwayat Saya
        </Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : myItems.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="document-text-outline"
            size={60}
            color={currentTheme.iconEmpty}
          />
          <Text style={{ color: currentTheme.textSecondary, marginTop: 10 }}>
            Belum ada laporan "I Lost an Item".
          </Text>
        </View>
      ) : (
        <FlatList
          data={myItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
    overflow: "hidden",
  },
  cardWrapper: { flexDirection: "row", padding: 15 },
  cardImage: { width: 60, height: 60, borderRadius: 8, resizeMode: "cover" },
  noImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: { flex: 1, marginLeft: 15, justifyContent: "center" },
  itemName: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  dateText: { fontSize: 12 },
  resolveBtn: {
    backgroundColor: Colors.primary,
    padding: 12,
    alignItems: "center",
  },
  resolveText: { color: "#FFFFFF", fontWeight: "bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
