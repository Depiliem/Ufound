import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { useAppContext } from "../../context/AppContext";

const STUDENT_NAME = "Rifqi Aldino Amin";
const STUDENT_NIM = "00000093743";
const PROFILE_IMAGE = { uri: "https://randomuser.me/api/portraits/men/9.jpg" };

export default function ProfileScreen() {
  const { isDarkMode, toggleTheme, currentTheme } = useAppContext();
  const [isNotif, setIsNotif] = React.useState(true);

  // Map currentTheme keys (dari AppContext) ke nama yang dipakai di profile
  const theme = {
    bg: currentTheme.background,
    card: currentTheme.cardBackground,
    border: currentTheme.border,
    text: currentTheme.textMain,
    subtext: currentTheme.textSecondary,
    primary: currentTheme.chipActive,
    primaryLight: isDarkMode ? "#2D1F4A" : "#EDE7F6",
    accent: currentTheme.searchBackground,
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.topHeader}>
          <Text style={styles.topHeaderTitle}>Profile</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="stats-chart" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Profile Card ── */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.avatarWrap, { borderColor: theme.primary }]}>
            <Image source={PROFILE_IMAGE} style={styles.avatar} />
          </View>

          <Text style={[styles.profileName, { color: theme.text }]}>{STUDENT_NAME}</Text>
          <Text style={[styles.profileNim, { color: theme.subtext }]}>{STUDENT_NIM}</Text>

          <View style={[styles.nimChip, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
            <Text style={[styles.nimChipText, { color: theme.primary }]}>🎓 Mahasiswa UMN</Text>
          </View>
        </View>

        {/* ── Settings ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Pengaturan</Text>
        <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Dark Mode Row */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>{isDarkMode ? "🌙" : "🌞"}</Text>
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {isDarkMode ? "Dark Mode" : "Light Mode"}
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  Tema tampilan aplikasi
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.accent, true: theme.primary }}
              thumbColor={"#fff"}
            />
          </TouchableOpacity>

          {/* Notifications Row */}
          <TouchableOpacity
            onPress={() => setIsNotif((prev) => !prev)}
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>{isNotif ? "🔔" : "🔕"}</Text>
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Notifikasi</Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  {isNotif ? "Notifikasi aktif" : "Notifikasi dimatikan"}
                </Text>
              </View>
            </View>
            <Switch
              value={isNotif}
              onValueChange={setIsNotif}
              trackColor={{ false: theme.accent, true: theme.primary }}
              thumbColor={"#fff"}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
            onPress={() => router.replace("/login")}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingEmoji}>🚪</Text>
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Log Out</Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>Keluar Akun</Text>
              </View>
            </View>
          </TouchableOpacity>
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  navbar: {
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  topHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12, // DI SINI: Padding dirampingkan
      backgroundColor: Colors.primary,
    },
    topHeaderTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#FFFFFF",
      letterSpacing: 1,
    },
    headerIcons: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconButton: {
      marginLeft: 15,
    },
  scroll: {
    padding: 16,
  },

  // Profile Card
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    padding: 24,
    marginBottom: 24,
  },
  avatarWrap: {
    borderWidth: 3,
    borderRadius: 60,
    padding: 3,
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileNim: {
    fontSize: 14,
    marginBottom: 12,
  },
  nimChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  nimChipText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Section title
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    marginLeft: 4,
  },

  // Settings Card
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingEmoji: {
    fontSize: 22,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});