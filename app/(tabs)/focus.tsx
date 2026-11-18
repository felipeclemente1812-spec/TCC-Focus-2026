import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useContext, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  FOCUS_DAILY_XP_CAP,
  FOCUS_SESSIONS_PER_SET,
  focusXp,
} from "@/constants/gamification";
import {
  FOCUS_PRESETS,
  FocusContext,
  formatTimer,
  PHASE_LABEL,
} from "@/context/FocusContext";
import { confirmAction } from "@/utils/feedback";
import { openDoNotDisturb } from "@/utils/focusMode";
import { openPremium, useLimitReached, UsageMeter } from "@/components/PremiumGate";

export default function Focus() {
  // Plano grátis: 10 ciclos de foco profundo (50 / 10) por mês
  const deepLimit = useLimitReached("focoProfundoMes");
  const focus = useContext(FocusContext);
  const [dndMsg, setDndMsg] = useState("");
  if (!focus) throw new Error("FocusContext não encontrado");

  const {
    presetId,
    phase,
    status,
    remainingMs,
    durationMs,
    setInSet,
    sessionsToday,
    xpToday,
    sessionXp,
    lastEvent,
    setPreset,
    start,
    pause,
    reset,
    skip,
  } = focus;

  const isBreak = phase !== "focus";
  const elapsed = 1 - remainingMs / durationMs;

  const primaryLabel =
    status === "running"
      ? "Pausar"
      : status === "paused"
        ? "Continuar"
        : phase === "focus"
          ? `Iniciar foco · +${sessionXp} XP`
          : "Iniciar pausa";

  const handleReset = async () => {
    if (status === "idle") return;
    const ok = await confirmAction(
      "Reiniciar sessão",
      "O tempo desta sessão será perdido. Deseja reiniciar?",
      "Reiniciar",
    );
    if (ok) reset();
  };

  const handleSkip = async () => {
    if (phase === "focus") {
      const ok = await confirmAction(
        "Pular foco",
        "Pular a sessão de foco não dá XP. Deseja pular para a pausa?",
        "Pular",
      );
      if (!ok) return;
    }
    skip();
  };

  // Mensagem do último fim de fase (só se for recente)
  const eventMessage =
    lastEvent && Date.now() - lastEvent.at < 10 * 60 * 1000 && status === "idle"
      ? lastEvent.kind === "focus-done"
        ? lastEvent.xp > 0
          ? `Sessão concluída! +${lastEvent.xp} XP. Hora de descansar.`
          : "Sessão concluída! Limite diário de XP de foco atingido."
        : "Pausa encerrada. Pronto para mais um foco?"
      : "";

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/challenges")
              }
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" style={styles.back} />
            </TouchableOpacity>

            <Text style={styles.title}>Ciclo de foco</Text>

            <View style={{ width: 25 }} />
          </View>

          {/* Cota do foco profundo no plano grátis */}
          <UsageMeter limit="focoProfundoMes" label="Ciclos 50 / 10 este mês" compact />

          {/* PRESETS */}
          <View style={styles.presets}>
            {FOCUS_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.preset,
                  presetId === p.id && styles.presetActive,
                  status === "running" && presetId !== p.id && styles.disabled,
                ]}
                onPress={() => (p.id === "profundo" && deepLimit ? openPremium() : setPreset(p.id))}
                disabled={status === "running"}
                accessibilityRole="radio"
                aria-checked={presetId === p.id}
                accessibilityLabel={`${p.focus} minutos de foco e ${p.short} de pausa`}
              >
                <Text style={styles.presetText}>
                  {p.id === "profundo" && deepLimit ? "🔒 " : ""}
                  {p.label} min
                </Text>
                <Text style={styles.presetXp}>+{focusXp(p.focus)} XP</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TIMER */}
          <View style={styles.timerCard}>
            <View style={[styles.phaseChip, isBreak && styles.phaseChipBreak]}>
              <Text style={styles.phaseText}>
                <Ionicons name={isBreak ? "cafe-outline" : "locate-outline"} /> {PHASE_LABEL[phase]}
              </Text>
            </View>

            <View
              style={[styles.circle, isBreak && styles.circleBreak]}
              accessible
              accessibilityRole="timer"
              accessibilityLabel={`${PHASE_LABEL[phase]}: ${formatTimer(remainingMs)} restantes`}
            >
              <Text style={styles.time}>{formatTimer(remainingMs)}</Text>
              <Text style={styles.timeLabel}>
                {status === "running"
                  ? "em andamento"
                  : status === "paused"
                    ? "pausado"
                    : "pronto"}
              </Text>
            </View>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progress,
                  isBreak && styles.progressBreak,
                  { width: `${Math.round(elapsed * 100)}%` },
                ]}
              />
            </View>

            {/* Sessões do conjunto atual */}
            <View style={styles.dots} accessible accessibilityLabel={`${setInSet} de ${FOCUS_SESSIONS_PER_SET} focos até a pausa longa`}>
              {Array.from({ length: FOCUS_SESSIONS_PER_SET }).map((_, i) => (
                <View key={i} style={[styles.dot, i < setInSet && styles.dotDone]} />
              ))}
            </View>
            <Text style={styles.dotsLabel}>
              {setInSet} de {FOCUS_SESSIONS_PER_SET} focos até a pausa longa
            </Text>

            {eventMessage ? (
              <View style={styles.eventBox} accessibilityLiveRegion="polite">
                <Text style={styles.eventText}>{eventMessage}</Text>
              </View>
            ) : null}

            {/* CONTROLES */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={
                status === "running"
                  ? pause
                  : // Cota do foco profundo acabou: não começa outro ciclo 50 / 10
                    presetId === "profundo" && phase === "focus" && status === "idle" && deepLimit
                    ? openPremium
                    : start
              }
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </TouchableOpacity>

            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, status === "idle" && styles.disabled]}
                onPress={handleReset}
                disabled={status === "idle"}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}><Ionicons name="refresh" /> Reiniciar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSkip}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>
                  <Ionicons name="play-skip-forward" /> {isBreak ? "Pular pausa" : "Pular foco"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* MODO FOCO = NÃO PERTURBE + TEMPORIZADOR */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              <Ionicons name="notifications-off-outline" /> Modo foco
            </Text>
            <Text style={styles.infoText}>
              Ligue o “Não perturbe” do celular e comece o timer. Enquanto conta, o Focus fica na barra de
              notificações com a hora de terminar.
            </Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 10, alignSelf: "flex-start" }]}
              onPress={async () => {
                setDndMsg((await openDoNotDisturb()) ?? "");
              }}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Abrir “Não perturbe”</Text>
            </TouchableOpacity>
            {dndMsg ? <Text style={[styles.infoText, { marginTop: 6 }]}>{dndMsg}</Text> : null}
          </View>

          {/* HOJE */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{sessionsToday}</Text>
              <Text style={styles.statLabel}>focos hoje</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>+{xpToday}</Text>
              <Text style={styles.statLabel}>XP de foco hoje</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Como funciona</Text>
            <Text style={styles.infoText}>
              O XP é proporcional à duração: 25 min valem +{focusXp(25)} XP e
              50 min valem +{focusXp(50)} XP (até {FOCUS_DAILY_XP_CAP} XP de foco
              por dia). Depois de cada foco vem uma pausa curta; a cada{" "}
              {FOCUS_SESSIONS_PER_SET} focos, uma pausa longa. O timer continua
              mesmo se você sair desta tela.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },

  content: {
    padding: 15,
    paddingBottom: 110,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  back: { color: "#FFF", fontSize: 25 },

  title: { color: "#FFF", fontSize: 20, fontWeight: "600" },

  presets: {
    flexDirection: "row",
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },

  preset: {
    flex: 1,
    padding: 9,
    alignItems: "center",
    borderRadius: 6,
  },

  presetActive: { backgroundColor: "#5B21B6" },

  presetText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  presetXp: { color: "#C7BADB", fontSize: 11, marginTop: 1 },

  disabled: { opacity: 0.4 },

  timerCard: {
    backgroundColor: "#25193A",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },

  phaseChip: {
    backgroundColor: "#5B21B6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },

  phaseChipBreak: { backgroundColor: "#15803D" },

  phaseText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  circle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 8,
    borderColor: "#B832E5",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91,33,182,0.25)",
  },

  circleBreak: {
    borderColor: "#36D35B",
    backgroundColor: "rgba(21,128,61,0.15)",
  },

  time: {
    color: "#FFF",
    fontSize: 52,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  timeLabel: { color: "#C7BADB", fontSize: 13, marginTop: 2 },

  progressBackground: {
    alignSelf: "stretch",
    height: 8,
    backgroundColor: "#57356F",
    borderRadius: 8,
    marginTop: 18,
    overflow: "hidden",
  },

  progress: { height: "100%", backgroundColor: "#B832E5" },

  progressBreak: { backgroundColor: "#36D35B" },

  dots: { flexDirection: "row", gap: 8, marginTop: 14 },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#A78BFA",
  },

  dotDone: { backgroundColor: "#A78BFA" },

  dotsLabel: { color: "#C7BADB", fontSize: 12, marginTop: 6 },

  eventBox: {
    alignSelf: "stretch",
    backgroundColor: "rgba(54,211,91,0.15)",
    borderWidth: 1,
    borderColor: "#36D35B",
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
  },

  eventText: { color: "#FFF", fontSize: 13, textAlign: "center" },

  primaryButton: {
    alignSelf: "stretch",
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
    minHeight: 48,
  },

  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  secondaryRow: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
    marginTop: 10,
  },

  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#5B21B6",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    minHeight: 44,
  },

  secondaryText: { color: "#DDD6FE", fontSize: 13, fontWeight: "600" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },

  statCard: {
    flex: 1,
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },

  statNumber: { color: "#B83CE5", fontSize: 22, fontWeight: "700" },

  statLabel: { color: "#C7BADB", fontSize: 12, marginTop: 2 },

  infoCard: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  infoTitle: { color: "#FFF", fontSize: 14, fontWeight: "600", marginBottom: 5 },

  infoText: { color: "#C7BADB", fontSize: 12, lineHeight: 18 },
});
