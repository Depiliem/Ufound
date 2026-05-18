import { useAppContext } from "@/context/AppContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/Colors";

function CustomTabBarButton({ children, onPress }: any) {
  const { currentTheme } = useAppContext();
  return (
    <TouchableOpacity style={styles.customButtonContainer} onPress={onPress}>
      <View style={[styles.customButton,
          {
            backgroundColor: currentTheme.cardBackground,
            borderColor: currentTheme.border,
          },
        ]}>{children}</View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { currentTheme } = useAppContext();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: currentTheme.cardBackground }],
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: currentTheme.textSecondary,
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