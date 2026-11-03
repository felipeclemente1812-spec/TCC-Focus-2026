import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

// Endereço que não existe (ex.: link antigo para uma tela removida)
export default function NotFound() {
  return (
    <LinearGradient colors={["#5B21B6", "#1E1B4B"]} style={styles.container}>
      <Ionicons name="compass-outline" style={styles.icon} color="#DDD6FE" />
      <Text style={styles.title}>Página não encontrada</Text>
      <Text style={styles.text}>
        Esse endereço não existe ou foi removido do Focus.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/")}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Voltar ao início</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  icon: { fontSize: 44, marginBottom: 10 },

  title: { color: "#FFF", fontSize: 22, fontWeight: "700", marginBottom: 6 },

  text: { color: "#CFC4E8", fontSize: 14, textAlign: "center", marginBottom: 20 },

  button: {
    backgroundColor: "#7C3AED",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },

  buttonText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
