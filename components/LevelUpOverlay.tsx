import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";

import { levelTitle, XP_PER_LEVEL } from "@/constants/gamification";
import { XPContext } from "@/context/XPContext";

// Aviso de "LEVEL UP" para qualquer tela das abas
// (Desafios, Foco, Grupos...), não só onde o XP foi ganho.
export default function LevelUpOverlay() {
  const xpContext = useContext(XPContext);
  const level = xpContext?.level ?? 1;

  const prevLevelRef = useRef(level);
  const [shownLevel, setShownLevel] = useState<number | null>(null);
  const [anim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setShownLevel(level);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
    }
    prevLevelRef.current = level;
  }, [level, anim]);

  useEffect(() => {
    if (shownLevel === null) return;
    const timer = setTimeout(() => setShownLevel(null), 3500);
    return () => clearTimeout(timer);
  }, [shownLevel]);

  if (shownLevel === null) return null;

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={() => setShownLevel(null)}
      accessibilityRole="alert"
      accessibilityLabel={`Subiu de nível! Você chegou ao nível ${shownLevel}`}
    >
      <Animated.View
        style={[
          styles.card,
          {
            opacity: anim,
            transform: [
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
            ],
          },
        ]}
      >
        <Ionicons name="rocket" style={styles.emoji} color="#FCD34D" />
        <Text style={styles.title}>LEVEL UP</Text>
        <Text style={styles.text}>
          Nível {shownLevel} — {levelTitle(shownLevel).title}
        </Text>
        {/* Só mostra a frase quando o nível abre uma nova etapa (título novo) */}
        {levelTitle(shownLevel).level === shownLevel ? (
          <Text style={styles.quote}>“{levelTitle(shownLevel).description}”</Text>
        ) : null}
        <Text style={styles.hint}>
          Próximo nível em mais {XP_PER_LEVEL} XP · toque para continuar
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,10,35,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
    zIndex: 100,
  },

  card: {
    backgroundColor: "#5B21B6",
    borderRadius: 20,
    paddingHorizontal: 35,
    paddingVertical: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A78BFA",
  },

  emoji: { fontSize: 44, marginBottom: 4 },

  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "900" },

  text: { color: "#DDD6FE", fontSize: 15, marginTop: 6 },

  quote: {
    color: "#F5F3FF",
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
    maxWidth: 260,
  },

  hint: { color: "#C7BADB", fontSize: 12, marginTop: 10, textAlign: "center" },
});
