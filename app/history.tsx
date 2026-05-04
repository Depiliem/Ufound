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
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost");
  const { currentTheme } = useAppContext();

  const fetchMyReports = async () => {
    try {
      setLoading(true);

      // Ambil user yang sedang login
      const raw = await AsyncStorage.getItem("current_user");
      if (!raw) {
        setMyItems([]);
        return;
      }

      const currentUser = JSON.parse(raw);
      if (!currentUser?.id) {
        setMyItems([]);
        return;
      }

      // Query items berdasarkan user_id dan type
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("type", activeTab)
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
    }, [activeTab]),
  );

  const executeDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
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
        return { label: "Disetujui", color: "#FFFFFF", bgColor: "#34C759" };
      case "rejected":
        return { label: "Ditolak", color: "#FFFFFF", bgColor: "#FF3B30" };
      case "pending":
      default:
        return {
          label: "Menunggu Persetujuan",
          color: "#FFFFFF",
          bgColor: "#FF9500",
        };
    }
  };

  const getTypeBadge = (type: "lost" | "found") => {
    switch (type) {
      case "lost":
        return { label: "Hilang", color: "#FFFFFF", bgColor: "#FF3B30" };
      case "found":
        return { label: "Ditemukan", color: "#FFFFFF", bgColor: "#34C759" };
    }
  };

  const renderItem = ({ item }: { item: Item }) => {
    const amanStatus = item.status || "pending";
    const statusInfo = getStatusBadge(amanStatus);
    const typeInfo = getTypeBadge(item.type);

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
            <View style={styles.nameRow}>
              <Text
                style={[styles.itemName, { color: currentTheme.textMain }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: typeInfo.bgColor },
                ]}
              >
                <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                  {typeInfo.label}
                </Text>
              </View>
            </View>

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

        {/* Lost: pending → bisa dibatalkan */}
        {item.type === "lost" && amanStatus === "pending" && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleCancelReport(item.id)}
          >
            <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Lost: approved → bisa ditandai selesai */}
        {item.type === "lost" && amanStatus === "approved" && (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => handleMarkAsDone(item.id)}
          >
            <Ionicons name="checkmark-done-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Found: tidak ada tombol aksi */}
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

      {/* Tab Lost / Found */}
      <View
        style={[
          styles.tabContainer,
          { borderBottomColor: currentTheme.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabButton,
            { borderBottomColor: "transparent" },
            activeTab === "lost" && { borderBottomColor: Colors.primary },
          ]}
          onPress={() => {
            setActiveTab("lost");
            setLoading(true);
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: currentTheme.textSecondary },
              activeTab === "lost" && { color: Colors.primary },
            ]}
          >
            Lost Items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { borderBottomColor: "transparent" },
            activeTab === "found" && { borderBottomColor: Colors.primary },
          ]}
          onPress={() => {
            setActiveTab("found");
            setLoading(true);
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: currentTheme.textSecondary },
              activeTab === "found" && { color: Colors.primary },
            ]}
          >
            Found Items
          </Text>
        </TouchableOpacity>
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
            Belum ada laporan{" "}
            {activeTab === "lost" ? '"Lost Item"' : '"Found Item"'}.
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
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: { fontSize: 10, fontWeight: "bold" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
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
  itemName: { fontSize: 16, fontWeight: "bold", flex: 1 },
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
    backgroundColor: "#FF3B30",
    width: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  doneBtn: {
    backgroundColor: "#34C759",
    width: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
