import { Ionicons } from "@expo/vector-icons";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useContext, useEffect, useRef } from "react";
import { Linking, Modal, StyleSheet, Text, TouchableOpacity } from "react-native";

import { TaskExtrasContext } from "@/context/TaskExtrasContext";

const DEFAULT_TONE = require("../assets/sounds/alarme.wav");

// Tela do despertador: aparece no horário de acordar com o app aberto e toca
// a música escolhida em repetição. Com o app fechado, quem avisa é a
// notificação agendada (som do sistema).
export default function AlarmOverlay() {
  const extras = useContext(TaskExtrasContext);
  const player = useRef<AudioPlayer | null>(null);
  const ringing = !!extras?.alarmRinging;
  const sound = extras?.alarm.soundUri ?? null;

  useEffect(() => {
    if (!ringing) return;
    try {
      const p = createAudioPlayer(sound ? { uri: sound } : DEFAULT_TONE);
      p.loop = true;
      p.volume = 1;
      p.play();
      player.current = p;
    } catch {
      // Sem áudio disponível: a tela continua aparecendo
    }
    return () => {
      try {
        player.current?.pause();
        player.current?.remove();
      } catch {
        // já liberado
      }
      player.current = null;
    };
  }, [ringing, sound]);

  if (!extras || !ringing) return null;

  const wake = extras.sleep?.wake ?? "";
  const playlist = extras.alarm.playlistUrl;

  return (
    <Modal visible transparent animationType="fade">
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.screen}>
        <Ionicons name="alarm" size={72} color="#FCD34D" />
        <Text style={styles.time}>{wake}</Text>
        <Text style={styles.title}>Bom dia! Hora de acordar.</Text>
        <Text style={styles.sub}>{extras.alarm.soundName ? `Tocando: ${extras.alarm.soundName}` : "Toque do Focus"}</Text>

        <TouchableOpacity style={styles.stop} onPress={extras.stopAlarm} accessibilityRole="button">
          <Text style={styles.stopText}>Estou de pé</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.snooze} onPress={extras.snoozeAlarm} accessibilityRole="button">
          <Text style={styles.snoozeText}>Soneca de {extras.alarm.snoozeMin} min</Text>
        </TouchableOpacity>
        {playlist ? (
          <TouchableOpacity
            onPress={() => {
              extras.stopAlarm();
              Linking.openURL(playlist).catch(() => {});
            }}
            style={{ marginTop: 18 }}
          >
            <Text style={styles.link}>
              <Ionicons name="musical-notes" /> Parar e abrir minha playlist
            </Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.note}>“Estou de pé” conclui “Acordar no horário planejado”.</Text>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  time: { color: "#FFF", fontSize: 56, fontWeight: "700", marginTop: 10, fontVariant: ["tabular-nums"] },
  title: { color: "#FFF", fontSize: 20, fontWeight: "600", marginTop: 6 },
  sub: { color: "#DDD6FE", fontSize: 13, marginTop: 6 },
  stop: {
    marginTop: 34,
    backgroundColor: "#15A638",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  stopText: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  snooze: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#A78BFA",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 34,
  },
  snoozeText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  link: { color: "#DDD6FE", fontSize: 14, textDecorationLine: "underline" },
  note: { color: "#C7BADB", fontSize: 11, marginTop: 28, textAlign: "center" },
});
