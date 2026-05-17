import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React, { useEffect } from "react"; 
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/Colors";
import * as Notifications from "expo-notifications";

// [FITUR BARU] Mesin utama biar HP lu GETER dan BUNYI pas notif masuk
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // Kunci utama buat bunyi & geter
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function CustomTabBarButton({ children, onPress }: any) {
  return (
    <TouchableOpacity style={styles.customButtonContainer} onPress={onPress}>
      <View style={styles.customButton}>{children}</View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  // Listener buat nangkap klik notifikasi
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const urlTujuan = response.notification.request.content.data?.url;
      
      if (urlTujuan) {
        // Otomatis loncat ke halaman detail barang pas notif dipencet
        router.push(urlTujuan as any);
      }
    });

    // Bersihin memori pas komponen ditutup
    return () => subscription.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarButton: (props) => (
            <CustomTabBarButton {...props}>
              <Ionicons name="add" size={32} color={Colors.primary} />
            </CustomTabBarButton>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            router.push("/report");
          },
        })}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: Colors.cardBackground,
  },
  customButtonContainer: {
    top: -30,
    justifyContent: "center",
    alignItems: "center",
  },
  customButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
});