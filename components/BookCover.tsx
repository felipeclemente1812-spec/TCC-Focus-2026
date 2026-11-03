import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

type Props = {
  uri: string | null;
  title: string;
  width: number;
};

// Capa de livro com proporção 2:3; sem capa (ou se a imagem falhar),
// mostra um "livro" roxo com o título, para a estante nunca ter buracos
export default function BookCover({ uri, title, width }: Props) {
  const [failed, setFailed] = useState(false);
  const height = Math.round(width * 1.5);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.cover, { width, height }]}
        onError={() => setFailed(true)}
        accessibilityLabel={`Capa de ${title}`}
      />
    );
  }

  return (
    <View style={[styles.cover, styles.placeholder, { width, height }]}>
      <Ionicons name="book" style={styles.placeholderIcon} color="#DDD6FE" />
      <Text style={styles.placeholderTitle} numberOfLines={4}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderRadius: 8,
    backgroundColor: "#3B2A5A",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    borderWidth: 1,
    borderColor: "#5B21B6",
  },
  placeholderIcon: { fontSize: 22, marginBottom: 4 },
  placeholderTitle: { color: "#E9DFFF", fontSize: 10, textAlign: "center", fontWeight: "600" },
});
