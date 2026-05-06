import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { useAppContext } from "../../context/AppContext";
import { supabase } from "../../lib/supabase";

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
  status: string;
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

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("Semua");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { isDarkMode, currentTheme } = useAppContext();

  const filterBuildings = [
    "Semua",
    "Gedung A",
    "Gedung B",
    "Gedung C",
    "Gedung D",
  ];

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("type", activeTab)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) return;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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

  const handleTabSwitch = (tab: "lost" | "found") => {
    setActiveTab(tab);
    setSelectedCategory("All");
    setSelectedBuilding("Semua");
    setSearchQuery("");
  };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: currentTheme.cardBackground,
          borderColor: currentTheme.border,
        },
      ]}
      onPress={() => router.push(`/detail/${item.id}`)}
    >
      {/* Image with category badge overlay */}
      <View style={styles.imageWrapper}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <View
            style={[
              styles.noImageContainer,
              { backgroundColor: currentTheme.background },
            ]}
          >
            <Ionicons
              name="image-outline"
              size={40}
              color={currentTheme.textSecondary}
            />
          </View>
        )}

        {/* Category badge overlay */}
        <View style={styles.categoryOverlay}>
          <Text style={styles.categoryOverlayText}>{item.category}</Text>
        </View>

        {/* Type badge overlay */}
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
          <Ionicons
            name="location-outline"
            size={14}
            color={currentTheme.textSecondary}
          />
          <Text
            style={[styles.locationText, { color: currentTheme.textSecondary }]}
          >
            {item.building} · {item.floor}
          </Text>
        </View>

        <View style={styles.dateRow}>
          <Ionicons
            name="time-outline"
            size={13}
            color={currentTheme.textSecondary}
          />
          <Text
            style={[styles.dateText, { color: currentTheme.textSecondary }]}
          >
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={currentTheme.background}
      />
      <View
        style={[styles.container, { backgroundColor: currentTheme.background }]}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <Text style={styles.topHeaderTitle}>LOST N FOUND</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => router.push("/history")}
              style={styles.iconButton}
            >
              <Ionicons name="time" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/admin")}
              style={styles.adminRouteBtn}
            >
              <Text style={styles.adminRouteText}>ADMIN</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lost / Found Tabs */}
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
              Lost Items
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
              Found Items
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: currentTheme.searchBackground,
                borderColor: currentTheme.border,
              },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: currentTheme.textMain }]}
              placeholder={`Search ${activeTab} item`}
              placeholderTextColor={currentTheme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Ionicons
              name="search"
              size={20}
              color={currentTheme.textSecondary}
              style={styles.searchIcon}
            />
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
                      backgroundColor: isActive
                        ? Colors.primary
                        : currentTheme.cardBackground,
                      borderColor: isActive
                        ? Colors.primary
                        : currentTheme.border,
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
                      {
                        color: isActive ? "#FFFFFF" : currentTheme.textSecondary,
                      },
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
                  {
                    backgroundColor: currentTheme.cardBackground,
                    borderColor: currentTheme.border,
                  },
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
                    selectedBuilding === bldg && {
                      color: currentTheme.textMain,
                      fontWeight: "bold",
                    },
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
              {filteredItems.length} item ditemukan
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
            <Ionicons
              name="search-outline"
              size={60}
              color={currentTheme.iconEmpty}
            />
            <Text
              style={[styles.emptyText, { color: currentTheme.textSecondary }]}
            >
              Tidak ada data yang sesuai.
            </Text>
          </View>
        ) : (
          <FlatList
            data={
              filteredItems.length % 2 !== 0
                ? [...filteredItems, { id: "__placeholder__" } as any]
                : filteredItems
            }
            keyExtractor={(item) => item.id}
            renderItem={({ item }) =>
              item.id === "__placeholder__" ? (
                <View style={styles.cardPlaceholder} />
              ) : (
                renderItem({ item })
              )
            }
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
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
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  iconButton: { marginLeft: 15 },
  adminRouteBtn: {
    marginLeft: 15,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminRouteText: { color: Colors.primary, fontWeight: "bold", fontSize: 12 },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 14, fontWeight: "600" },

  // Search
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

  // Category chips
  categorySection: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
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

  // Building filter
  filterSection: { marginTop: 10, marginBottom: 4 },
  filterScroll: { paddingHorizontal: 20 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: { fontSize: 12, fontWeight: "500" },

  // Results bar
  resultsBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  resultsCount: { fontSize: 12 },

  // Grid list
  listContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  columnWrapper: { gap: 10, marginBottom: 10 },

  // Card (grid style)
  card: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  imageWrapper: {
    position: "relative",
  },
  cardImage: { width: "100%", height: 120, resizeMode: "cover" },
  noImageContainer: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },

  // Overlays on image
  categoryOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryOverlayText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  typeBadgeOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeLost: { backgroundColor: "rgba(226,75,74,0.85)" },
  typeBadgeFound: { backgroundColor: "rgba(59,109,17,0.85)" },
  typeBadgeOverlayText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },

  // Card body
  cardContent: { padding: 10 },
  itemName: { fontSize: 13, fontWeight: "600", marginBottom: 5 },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 3 },
  locationText: { fontSize: 11, flex: 1 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  dateText: { fontSize: 11 },

  // Invisible placeholder to keep last odd card at half width
  cardPlaceholder: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "transparent",
  },

  // Empty
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 15 },
});
