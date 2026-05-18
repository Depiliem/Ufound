import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/Colors";

// Menentukan tipe data properti (props) yang bisa diterima oleh Header
type HeaderProps = {
    title: string;
};

export default function Header({ title }: HeaderProps) {
    return (
        <View style={styles.topHeader}>
            <Text style={styles.topHeaderTitle}>{title}</Text>
            <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="stats-chart" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => router.push("/history")}
                >
                    <Ionicons name="time-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
    headerIcons: {
        flexDirection: "row",
        alignItems: "center"
    },
    iconButton: {
        marginLeft: 15
    },
});