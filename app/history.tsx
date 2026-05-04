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
  status: string | null;
};

export default function History() {
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTheme } = useAppContext();

  const fetchMyReports = async () => {
    try {
      setLoading(true);
      const storedIds = await AsyncStorage.getItem("my_reports");

      if (!storedIds) {
        setMyItems([]);
        return;
      }

      let idsArray: string[] = [];
      try {
        idsArray = JSON.parse(storedIds);
      } catch (e) {
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
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyReports();
    }, []),
  );

  const executeDelete = async (id: string) => {
    try {
      await supabase.from("items").delete().eq("id", id);
      const storedIds = await AsyncStorage.getItem("my_reports");
      if (storedIds) {
        const updatedIds = JSON.parse(storedIds).filter(
          (itemId: string) => itemId !== id,
        );
        await AsyncStorage.setItem("my_reports", JSON.stringify(updatedIds));
      }
      fetchMyReports();
    } catch (error) {
      if (Platform.OS === "web") {
        window.alert("Gagal memproses permintaan.");
      } else {
        Alert.alert("Gagal", "Gagal memproses permintaan.");
      }
    }
  };

  const handleCancelReport = (id: string) => {
    if (Platform.OS === "web") {
      const isConfirmed = window.confirm(
        "Laporan ini belum disetujui. Yakin ingin membatalkan dan menghapusnya dari database?",
      );
      if (isConfirmed) executeDelete(id);
    } else {
      Alert.alert(
        "Batalkan Laporan",
        "Laporan ini belum disetujui. Yakin ingin membatalkan dan menghapusnya dari database?",
        [
          { text: "Kembali", style: "cancel" },
          {
            text: "Ya, Batalkan",
            style: "destructive",
            onPress: () => executeDelete(id),
          },
        ],
      );
    }
  };

  const handleMarkAsDone = (id: string) => {
    if (Platform.OS === "web") {
      const isConfirmed = window.confirm(
        "Apakah barang Anda sudah ditemukan? Laporan ini akan ditandai selesai dan dihapus dari database.",
      );
      if (isConfirmed) executeDelete(id);
    } else {
      Alert.alert(
        "Selesaikan Laporan",
        "Apakah barang Anda sudah ditemukan? Laporan ini akan ditandai selesai dan dihapus dari database.",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Ya, Selesai",
            style: "default",
            onPress: () => executeDelete(id),
          },
        ],
      );
    }
  };

  const getStatusBadge = (status: string | null) => {
    const safeStatus = status || "pending";
    switch (safeStatus) {
      case "approved":
        return { label: "Posted", color: "#34C759", bgColor: "#EFFFF4" };
      case "rejected":
        return { label: "Rejected", color: "#FF3B30", bgColor: "#FFEFEF" };
      case "pending":
      default:
        return {
          label: "Waiting approval",
          color: "#FF9500",
          bgColor: "#FFF9E6",
        };
    }
  };

  const renderItem = ({ item }: { item: Item }) => {
    const amanStatus = item.status || "pending";
    const statusInfo = getStatusBadge(amanStatus);

    return (
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

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusInfo.bgColor },
              ]}
            >
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>

            <Text
              style={[styles.dateText, { color: currentTheme.textSecondary }]}
            >
              {new Date(item.created_at).toLocaleDateString("id-ID")}
            </Text>
          </View>
        </TouchableOpacity>

        {amanStatus === "pending" && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleCancelReport(item.id)}
          >
            <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {amanStatus === "approved" && (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => handleMarkAsDone(item.id)}
          >
            <Ionicons name="checkmark-done-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
          showsVerticalScrollIndicator={false}
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
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
    overflow: "hidden",
    alignItems: "stretch",
  },
  cardWrapper: { flex: 1, flexDirection: "row", padding: 15 },
  cardImage: { width: 65, height: 65, borderRadius: 8, resizeMode: "cover" },
  noImage: {
    width: 65,
    height: 65,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: { flex: 1, marginLeft: 15, justifyContent: "center" },
  itemName: { fontSize: 16, fontWeight: "bold", marginBottom: 6 },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  statusText: { fontSize: 10, fontWeight: "bold" },
  dateText: { fontSize: 12 },
  deleteBtn: {
    backgroundColor: "#3b82f6",
    width: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  doneBtn: {
    backgroundColor: "#3b82f6",
    width: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
