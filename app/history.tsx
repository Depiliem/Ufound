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
  ScrollView,
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

type CategoryOption = {
  label: string;
  value: string;
  icon: string;
};

const CATEGORIES: CategoryOption[] = [
  { label: "Semua", value: "All", icon: "apps-outline" },
  { label: "Elektronik", value: "Elektronik", icon: "phone-portrait-outline" },
  { label: "Alat Makan", value: "Alat Makan", icon: "restaurant-outline" },
  { label: "Pakaian", value: "Pakaian", icon: "shirt-outline" },
  { label: "Accesories", value: "Accesories", icon: "glasses-outline" },
  { label: "Lainnya", value: "Lainnya", icon: "cube-outline" },
];

export default function History() {
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { currentTheme } = useAppContext();

  const fetchMyReports = async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem("current_user");
      if (!raw) { setMyItems([]); return; }
      const currentUser = JSON.parse(raw);
      if (!currentUser?.id) { setMyItems([]); return; }

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

  const handleTabSwitch = (tab: "lost" | "found") => {
    setActiveTab(tab);
    setSelectedCategory("All");
    setLoading(true);
  };

  const filteredItems = myItems.filter((item) => {
    return selectedCategory === "All" || item.category === selectedCategory;
  });

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
          { text: "Ya, Batalkan", style: "destructive", onPress: () => executeDelete(id) },
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
          { text: "Ya, Selesai", style: "default", onPress: () => executeDelete(id) },
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
        return { label: "Menunggu", color: "#FFFFFF", bgColor: "#FF9500" };
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

  const hasActiveFilter = selectedCategory !== "All";

  const renderItem = ({ item }: { item: Item }) => {
    const amanStatus = item.status || "pending";
    const statusInfo = getStatusBadge(amanStatus);
    const typeInfo = getTypeBadge(item.type);

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border },
        ]}
      >
        <TouchableOpacity
          style={styles.cardWrapper}
          onPress={() => router.push(`/detail/${item.id}`)}
        >
          {/* Thumbnail */}
          <View style={styles.thumbWrapper}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.cardImage} />
            ) : (
              <View style={[styles.noImage, { backgroundColor: currentTheme.background }]}>
                <Ionicons name="image-outline" size={28} color={currentTheme.textSecondary} />
              </View>
            )}
            {/* Category overlay on thumbnail */}
            <View style={styles.categoryOverlay}>
              <Text style={styles.categoryOverlayText}>{item.category}</Text>
            </View>
          </View>

          {/* Text content */}
          <View style={styles.cardText}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.itemName, { color: currentTheme.textMain }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: typeInfo.bgColor }]}>
                <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
              </View>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Text style={styles.statusText}>{statusInfo.label}</Text>
            </View>

            <Text style={[styles.dateText, { color: currentTheme.textSecondary }]}>
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
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Lost: approved → bisa ditandai selesai */}
        {item.type === "lost" && amanStatus === "approved" && (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => handleMarkAsDone(item.id)}
          >
            <Ionicons name="checkmark-done-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
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
      <View style={[styles.tabContainer, { borderBottomColor: currentTheme.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { borderBottomColor: "transparent" },
            activeTab === "lost" && { borderBottomColor: Colors.primary },
          ]}
          onPress={() => handleTabSwitch("lost")}
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
          onPress={() => handleTabSwitch("found")}
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

      {/* Category Filter — sembunyikan saat loading */}
      {!loading && (
        <View style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isActive ? Colors.primary : currentTheme.cardBackground,
                      borderColor: isActive ? Colors.primary : currentTheme.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.value)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={13}
                    color={isActive ? "#FFFFFF" : currentTheme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: isActive ? "#FFFFFF" : currentTheme.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
      ) : filteredItems.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={hasActiveFilter ? "search-outline" : "document-text-outline"}
            size={60}
            color={currentTheme.iconEmpty}
          />
          <Text style={[styles.emptyTitle, { color: currentTheme.textMain }]}>
            {hasActiveFilter ? "Tidak Ada Hasil" : "Belum Ada Laporan"}
          </Text>
          <Text style={[styles.emptySubtext, { color: currentTheme.textSecondary }]}>
            {hasActiveFilter
              ? `Tidak ada laporan dengan kategori "${selectedCategory}"`
              : `Kamu belum membuat laporan ${activeTab === "lost" ? '"Lost Item"' : '"Found Item"'}`}
          </Text>
          {hasActiveFilter ? (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => setSelectedCategory("All")}
            >
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyActionBtnText}>Reset Filter</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push("/report")}
            >
              <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyActionBtnText}>Buat Laporan</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.resultsBar}>
            <Text style={[styles.resultsCount, { color: currentTheme.textSecondary }]}>
              {filteredItems.length} laporan ditemukan
            </Text>
          </View>
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
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
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },

  tabContainer: { flexDirection: "row", borderBottomWidth: 1 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2 },
  tabText: { fontSize: 14, fontWeight: "600" },

  categorySection: { paddingVertical: 10 },
  categoryScroll: { paddingHorizontal: 16 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: { fontSize: 12, fontWeight: "500" },

  resultsBar: { paddingHorizontal: 16, paddingBottom: 6 },
  resultsCount: { fontSize: 12 },

  listContainer: { paddingHorizontal: 16, paddingBottom: 100 },

  // Card — 1 kolom horizontal (versi lama)
  card: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    alignItems: "stretch",
  },
  cardWrapper: { flex: 1, flexDirection: "row", padding: 12 },

  // Thumbnail kiri
  thumbWrapper: { position: "relative" },
  cardImage: { width: 70, height: 70, borderRadius: 8, resizeMode: "cover" },
  noImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryOverlay: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: "center",
  },
  categoryOverlayText: { color: "#FFFFFF", fontSize: 9, fontWeight: "600" },

  // Teks kanan
  cardText: { flex: 1, marginLeft: 12, justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  itemName: { fontSize: 15, fontWeight: "bold", flex: 1 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 10, fontWeight: "bold", color: "#FFFFFF" },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 5,
  },
  statusText: { fontSize: 10, fontWeight: "bold", color: "#FFFFFF" },
  dateText: { fontSize: 11 },

  // Action buttons (ujung kanan card)
  deleteBtn: {
    backgroundColor: "#FF3B30",
    width: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  doneBtn: {
    backgroundColor: "#34C759",
    width: 52,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty state
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  emptyTitle: { fontSize: 17, fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  emptySubtext: { fontSize: 13, textAlign: "center", marginBottom: 20 },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyActionBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
});
