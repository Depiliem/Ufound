import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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
  description: string;
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
  { label: "Kunci", value: "Kunci", icon: "key-outline" },
  { label: "Accesories", value: "Accesories", icon: "glasses-outline" },
  { label: "Lainnya", value: "Lainnya", icon: "cube-outline" },
];

export default function AdminPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("Semua");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { currentTheme } = useAppContext();

  const filterBuildings = ["Semua", "Gedung A", "Gedung B", "Gedung C", "Gedung D"];

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("type", activeTab)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchItems();
    }, [activeTab]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("items")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      fetchItems();
    } catch (error) {
      if (Platform.OS === "web") {
        window.alert("Gagal: Tidak dapat memperbarui status laporan.");
      } else {
        Alert.alert("Gagal", "Tidak dapat memperbarui status laporan.");
      }
      setLoading(false);
    }
  };

  const confirmAction = (id: string, newStatus: string) => {
    const actionText = newStatus === "approved" ? "Setujui" : "Tolak";

    if (Platform.OS === "web") {
      const isConfirmed = window.confirm(
        `Apakah Anda yakin ingin ${actionText.toLowerCase()} laporan ini?`,
      );
      if (isConfirmed) handleUpdateStatus(id, newStatus);
    } else {
      Alert.alert(
        `${actionText} Laporan`,
        `Apakah Anda yakin ingin ${actionText.toLowerCase()} laporan ini?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: `Ya, ${actionText}`,
            style: newStatus === "rejected" ? "destructive" : "default",
            onPress: () => handleUpdateStatus(id, newStatus),
          },
        ],
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleTabSwitch = (tab: "lost" | "found") => {
    setActiveTab(tab);
    setSelectedCategory("All");
    setSelectedBuilding("Semua");
    setSearchQuery("");
  };

  const resetFilters = () => {
    setSelectedCategory("All");
    setSelectedBuilding("Semua");
    setSearchQuery("");
  };

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchBuilding =
      selectedBuilding === "Semua" || item.building === selectedBuilding;
    const matchCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    return matchSearch && matchBuilding && matchCategory;
  });

  const hasActiveFilter =
    selectedCategory !== "All" ||
    selectedBuilding !== "Semua" ||
    searchQuery !== "";

  const renderItem = ({ item }: { item: Item }) => {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.push(`/detail/${item.id}`)}>
          <View style={styles.imageWrapper}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.cardImage} />
            ) : (
              <View
                style={[styles.noImageContainer, { backgroundColor: currentTheme.background }]}
              >
                <Ionicons name="image-outline" size={40} color={currentTheme.textSecondary} />
              </View>
            )}

            <View style={styles.categoryOverlay}>
              <Text style={styles.categoryOverlayText}>{item.category}</Text>
            </View>

            <View
              style={[
                styles.typeBadgeOverlay,
                activeTab === "lost" ? styles.typeBadgeLost : styles.typeBadgeFound,
              ]}
            >
              <Text style={styles.typeBadgeOverlayText}>
                {activeTab === "lost" ? "Hilang" : "Ditemukan"}
              </Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <Text
              style={[styles.itemName, { color: currentTheme.textMain }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={currentTheme.textSecondary} />
              <Text style={[styles.locationText, { color: currentTheme.textSecondary }]}>
                {item.building} · {item.floor}
              </Text>
            </View>

            <View style={styles.dateRow}>
              <Ionicons name="time-outline" size={13} color={currentTheme.textSecondary} />
              <Text style={[styles.dateText, { color: currentTheme.textSecondary }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => confirmAction(item.id, "rejected")}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Tolak</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => confirmAction(item.id, "approved")}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Setujui</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>ADMIN PANEL</Text>
          <TouchableOpacity onPress={() => router.replace("/")} style={styles.backButton}>
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderBottomColor: currentTheme.border },
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
              Moderasi Lost
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderBottomColor: currentTheme.border },
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
              Moderasi Found
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: currentTheme.searchBackground, borderColor: currentTheme.border },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: currentTheme.textMain }]}
              placeholder="Cari data laporan..."
              placeholderTextColor={currentTheme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Ionicons name="search" size={20} color={currentTheme.textSecondary} style={styles.searchIcon} />
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.categorySection}>
          <Text style={[styles.categorySectionLabel, { color: currentTheme.textSecondary }]}>
            Category
          </Text>
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

        {/* Building Filter */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filterBuildings.map((bldg, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.filterChip,
                  { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border },
                  selectedBuilding === bldg && {
                    backgroundColor: currentTheme.chipActive,
                    borderColor: currentTheme.chipActive,
                  },
                ]}
                onPress={() => setSelectedBuilding(bldg)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: currentTheme.textSecondary },
                    selectedBuilding === bldg && { color: currentTheme.textMain, fontWeight: "bold" },
                  ]}
                >
                  {bldg}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results count */}
        {!loading && (
          <View style={styles.resultsBar}>
            <Text style={[styles.resultsCount, { color: currentTheme.textSecondary }]}>
              {filteredItems.length} laporan menunggu moderasi
            </Text>
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.centerContent}>
            {hasActiveFilter ? (
              <>
                <Ionicons name="search-outline" size={60} color={currentTheme.iconEmpty} />
                <Text style={[styles.emptyTitle, { color: currentTheme.textMain }]}>
                  Tidak Ada Hasil
                </Text>
                <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
                  Tidak ada laporan yang cocok dengan filter aktif.
                </Text>
                <TouchableOpacity style={styles.emptyActionBtn} onPress={resetFilters}>
                  <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyActionBtnText}>Reset Filter</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={60} color={currentTheme.iconEmpty} />
                <Text style={[styles.emptyTitle, { color: currentTheme.textMain }]}>
                  Semua Bersih!
                </Text>
                <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
                  Tidak ada laporan yang menunggu moderasi saat ini.
                </Text>
              </>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.primary,
  },
  backButton: { padding: 5 },
  topHeaderTitle: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF", letterSpacing: 1 },

  tabContainer: { flexDirection: "row", paddingHorizontal: 20 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2 },
  tabText: { fontSize: 14, fontWeight: "600" },

  searchSection: { paddingHorizontal: 20, paddingTop: 12, marginBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchIcon: { marginLeft: 10 },

  categorySection: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  categorySectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  categoryScroll: { paddingHorizontal: 20 },
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

  filterSection: { marginTop: 10, marginBottom: 4 },
  filterScroll: { paddingHorizontal: 20 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 12, fontWeight: "500" },

  resultsBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  resultsCount: { fontSize: 12 },

  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30 },

  emptyTitle: { fontSize: 17, fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyActionBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },

  card: { borderRadius: 12, overflow: "hidden", marginBottom: 15, borderWidth: 1 },
  imageWrapper: { position: "relative" },
  cardImage: { width: "100%", height: 150, resizeMode: "cover" },
  noImageContainer: { width: "100%", height: 150, justifyContent: "center", alignItems: "center" },

  categoryOverlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  categoryOverlayText: { color: "#FFFFFF", fontSize: 11, fontWeight: "600" },
  typeBadgeOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeBadgeLost: { backgroundColor: "rgba(226,75,74,0.85)" },
  typeBadgeFound: { backgroundColor: "rgba(59,109,17,0.85)" },
  typeBadgeOverlayText: { color: "#FFFFFF", fontSize: 11, fontWeight: "600" },

  cardContent: { padding: 12 },
  itemName: { fontSize: 16, fontWeight: "bold", marginBottom: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 5, gap: 4 },
  locationText: { fontSize: 13 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12 },

  actionRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.1)" },
  actionButton: { flex: 1, flexDirection: "row", padding: 12, justifyContent: "center", alignItems: "center" },
  rejectButton: { backgroundColor: "#FF3B30" },
  approveButton: { backgroundColor: "#34C759" },
  actionButtonText: { color: "#FFFFFF", fontWeight: "bold", marginLeft: 8 },
});
