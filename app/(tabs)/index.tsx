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

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("Semua");

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
    return matchSearch && matchBuilding;
  });

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

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text
            style={[styles.itemName, { color: currentTheme.textMain }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View
            style={[
              styles.badge,
              activeTab === "lost" ? styles.badgeLost : styles.badgeFound,
            ]}
          >
            <Text style={styles.badgeText}>
              {activeTab === "lost" ? "Hilang" : "Ditemukan"}
            </Text>
          </View>
        </View>

        <Text style={styles.itemCategory}>{item.category}</Text>

        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={16}
            color={currentTheme.textSecondary}
          />
          <Text
            style={[styles.locationText, { color: currentTheme.textSecondary }]}
          >
            {item.building} - {item.floor}
          </Text>
        </View>

        <View style={styles.dateRow}>
          <Ionicons
            name="time-outline"
            size={14}
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

            <TouchableOpacity
              onPress={() => router.replace("/")}
              style={styles.iconButton}
            >
              <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderBottomColor: currentTheme.border },
              activeTab === "lost" && { borderBottomColor: Colors.primary },
            ]}
            onPress={() => setActiveTab("lost")}
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
            onPress={() => setActiveTab("found")}
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
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  searchSection: { paddingHorizontal: 20, marginBottom: 10 },
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
  filterSection: { marginBottom: 15 },
  filterScroll: { paddingHorizontal: 20 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  filterChipText: { fontSize: 12, fontWeight: "500" },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 15 },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 15,
    borderWidth: 1,
  },
  cardImage: { width: "100%", height: 150, resizeMode: "cover" },
  noImageContainer: {
    width: "100%",
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { padding: 15 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  itemName: { fontSize: 18, fontWeight: "bold", flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeLost: { backgroundColor: "#FFEFEF" },
  badgeFound: { backgroundColor: "#EFFFF4" },
  badgeText: { fontSize: 12, fontWeight: "bold", color: "#000000" },
  itemCategory: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
    marginBottom: 10,
  },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  locationText: { fontSize: 14, marginLeft: 5 },
  dateRow: { flexDirection: "row", alignItems: "center" },
  dateText: { fontSize: 12, marginLeft: 5 },
});
