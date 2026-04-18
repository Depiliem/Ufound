import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { darkTheme, lightTheme } from "../../constants/Colors";

export default function Home() {
  const [activeTab, setActiveTab] = useState("lost");
  const [isDark, setIsDark] = useState(false);

  const currentTheme = isDark ? darkTheme : lightTheme;
  const styles = getStyles(currentTheme);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LOST N FOUND</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setIsDark(!isDark)}>
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={24}
              color={currentTheme.primaryText}
              style={styles.iconMargin}
            />
          </TouchableOpacity>
          <Ionicons
            name="bar-chart-outline"
            size={24}
            color={currentTheme.primaryText}
            style={styles.iconMargin}
          />
          <Ionicons
            name="notifications-outline"
            size={24}
            color={currentTheme.primaryText}
          />
        </View>
      </View>

      <View style={styles.topTabs}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "lost" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("lost")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "lost" && styles.activeTabText,
            ]}
          >
            Lost Items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "found" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("found")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "found" && styles.activeTabText,
            ]}
          >
            Found Items
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search lost item"
            placeholderTextColor={currentTheme.textMuted}
          />
          <Ionicons name="search" size={20} color={currentTheme.textMuted} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          <TouchableOpacity style={styles.filterChipActive}>
            <Text style={styles.filterChipTextActive}>Semua</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Gedung C</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Gedung D</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Gedung B</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.card}>
          <View style={styles.imagePlaceholder}>
            <Ionicons
              name="image-outline"
              size={48}
              color={currentTheme.iconPlaceholder}
            />
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.cardTitle}>Barang Hilang A</Text>
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={currentTheme.textSecondary}
              />
              <Text style={styles.locationText}>Gedung C</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.imagePlaceholder}>
            <Ionicons
              name="image-outline"
              size={48}
              color={currentTheme.iconPlaceholder}
            />
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.cardTitle}>Barang Hilang B</Text>
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={currentTheme.textSecondary}
              />
              <Text style={styles.locationText}>Gedung D</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.primary,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    headerTitle: {
      color: theme.primaryText,
      fontSize: 18,
      fontWeight: "bold",
    },
    headerIcons: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconMargin: {
      marginRight: 15,
    },
    topTabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 15,
      alignItems: "center",
    },
    activeTabButton: {
      borderBottomWidth: 2,
      borderBottomColor: theme.borderActive,
    },
    tabText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    activeTabText: {
      fontWeight: "bold",
      color: theme.textMain,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.cardBackground,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 25,
      paddingHorizontal: 15,
      paddingVertical: 10,
      marginBottom: 15,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.textMain,
    },
    filterContainer: {
      flexDirection: "row",
      marginBottom: 20,
    },
    filterChipActive: {
      backgroundColor: theme.chipActive,
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
    },
    filterChipTextActive: {
      color: theme.textMain,
      fontWeight: "bold",
    },
    filterChip: {
      backgroundColor: theme.cardBackground,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
    },
    filterChipText: {
      color: theme.textSecondary,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      marginBottom: 20,
      overflow: "hidden",
    },
    imagePlaceholder: {
      height: 180,
      backgroundColor: theme.background,
      justifyContent: "center",
      alignItems: "center",
    },
    cardDetails: {
      padding: 15,
      backgroundColor: theme.cardBackground,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.textMain,
      marginBottom: 5,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    locationText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 5,
    },
  });
