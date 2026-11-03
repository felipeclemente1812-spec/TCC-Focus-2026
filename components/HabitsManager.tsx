import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  HABIT_XP,
  PUNCTUALITY_BONUS,
  PUNCTUALITY_WINDOW_MIN,
} from "@/constants/gamification";
import {
  ALL_DAYS,
  DAY_SHORT,
  describeDays,
  Habit,
  HabitsContext,
  MAX_HABITS,
  WEEK_ORDER,
} from "@/context/HabitsContext";
import { confirmAction } from "@/utils/feedback";

// Criar, editar e excluir hábitos (dias e horário opcionais).
// Marcar como feito fica em Desafios › "Hábitos de hoje".
export default function HabitsManager() {
  const ctx = useContext(HabitsContext);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!ctx) throw new Error("HabitsContext não encontrado");
  const { habits, addHabit, updateHabit, removeHabit, habitStreak } = ctx;

  const clear = () => {
    setEditingId(null);
    setTitle("");
    setDays(ALL_DAYS);
    setTime("");
    setError("");
  };

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  // Aceita "19", "1930", "19:30", "19h", "19h30"
  const normalizeTime = (raw: string) => {
    const t = raw.trim().toLowerCase().replace("h", ":");
    if (!t) return null;
    const m = t.match(/^(\d{1,2})(?::?(\d{2}))?:?$/);
    if (!m) return t; // validação devolve a mensagem
    return `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
  };

  const submit = (useDaily = false) => {
    const chosenDays = useDaily ? ALL_DAYS : days;
    const parsedTime = normalizeTime(time);
    const result = editingId
      ? updateHabit(editingId, title, chosenDays, parsedTime)
      : addHabit(title, chosenDays, parsedTime);
    if (result) {
      setError(result);
      return;
    }
    setMessage(editingId ? "Hábito atualizado." : "Hábito criado! Ele aparece em Desafios nos dias escolhidos.");
    clear();
  };

  const startEdit = (h: Habit) => {
    setEditingId(h.id);
    setTitle(h.title);
    setDays(h.days);
    setTime(h.time ?? "");
    setError("");
    setMessage("");
  };

  const handleRemove = async (h: Habit) => {
    const ok = await confirmAction(
      "Excluir hábito",
      `Excluir "${h.title}"? O XP já ganho continua no seu histórico.`,
      "Excluir",
    );
    if (!ok) return;
    if (editingId === h.id) clear();
    removeHabit(h.id);
    setMessage("Hábito excluído.");
  };

  const isFull = habits.length >= MAX_HABITS && !editingId;

  return (
    <View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Meus hábitos</Text>
        <Text style={styles.infoText}>
          Cada hábito vale +{HABIT_XP} XP nos dias programados. Com horário,
          concluir até {PUNCTUALITY_WINDOW_MIN} min antes ou depois dá +{PUNCTUALITY_BONUS}{" "}
          XP de pontualidade (informado por você).
        </Text>
        {habits.length > 0 ? (
          <Text style={styles.streak}>
            <Ionicons name="shield-checkmark-outline" /> Sequência de hábitos: {habitStreak}{" "}
            {habitStreak === 1 ? "dia programado" : "dias programados"}
          </Text>
        ) : null}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {habits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Nenhum hábito ainda. Crie o primeiro abaixo, por exemplo “Estudar
            matemática”.
          </Text>
        </View>
      ) : (
        habits.map((h) => (
          <View key={h.id} style={[styles.row, editingId === h.id && styles.rowEditing]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{h.title}</Text>
              <Text style={styles.rowMeta}>
                {describeDays(h.days)}
                {h.time ? ` · ${h.time}` : ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => startEdit(h)}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${h.title}`}
            >
              <Ionicons name="create-outline" style={styles.iconText} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleRemove(h)}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={`Excluir ${h.title}`}
            >
              <Ionicons name="close" style={[styles.iconText, styles.removeText]} />
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* FORMULÁRIO CURTO */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? "Editar hábito" : "Novo hábito"}</Text>
        <TextInput
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (error) setError("");
          }}
          placeholder="Ex.: Estudar matemática"
          placeholderTextColor="#9E94AB"
          style={styles.input}
          maxLength={40}
          editable={!isFull}
          accessibilityLabel="Nome do hábito"
        />

        <View style={styles.daysHeader}>
          <Text style={styles.label}>Dias</Text>
          <TouchableOpacity onPress={() => setDays(ALL_DAYS)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>Todos os dias</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.days}>
          {WEEK_ORDER.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.day, days.includes(d) && styles.dayActive]}
              onPress={() => toggleDay(d)}
              accessibilityRole="checkbox"
              aria-checked={days.includes(d)}
              accessibilityLabel={DAY_SHORT[d]}
            >
              <Text style={styles.dayText}>{DAY_SHORT[d]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Horário (opcional)</Text>
        <TextInput
          value={time}
          onChangeText={(t) => {
            setTime(t);
            if (error) setError("");
          }}
          placeholder="Ex.: 19:00 — deixe vazio se não quiser"
          placeholderTextColor="#9E94AB"
          style={styles.input}
          maxLength={5}
          accessibilityLabel="Horário do hábito"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primary, (isFull || !title.trim()) && styles.disabled]}
          onPress={() => submit(false)}
          disabled={isFull || !title.trim()}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>{editingId ? "Salvar alterações" : "Criar hábito"}</Text>
        </TouchableOpacity>

        {!editingId ? (
          <TouchableOpacity
            style={styles.skip}
            onPress={() => submit(true)}
            disabled={isFull || !title.trim()}
            accessibilityRole="button"
          >
            <Text style={[styles.link, (isFull || !title.trim()) && styles.disabled]}>
              Pular — usar diariamente
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.skip} onPress={clear} accessibilityRole="button">
            <Text style={styles.link}>Cancelar edição</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.limit}>
          {isFull ? `Limite de ${MAX_HABITS} hábitos.` : `${habits.length} de ${MAX_HABITS} hábitos`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoCard: { backgroundColor: "#25193A", borderRadius: 8, padding: 12, marginBottom: 10 },
  infoTitle: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  infoText: { color: "#C7BADB", fontSize: 12, marginTop: 6, lineHeight: 17 },
  streak: { color: "#DDD6FE", fontSize: 13, fontWeight: "600", marginTop: 8 },

  message: { color: "#86EFAC", fontSize: 13, textAlign: "center", marginBottom: 10 },

  empty: { backgroundColor: "#25193A", borderRadius: 8, padding: 16, marginBottom: 8 },
  emptyText: { color: "#C7BADB", fontSize: 13, textAlign: "center" },

  row: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 10,
    marginBottom: 7,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowEditing: { borderColor: "#A78BFA" },
  rowTitle: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  rowMeta: { color: "#C7BADB", fontSize: 12, marginTop: 2 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  iconText: { color: "#DDD6FE", fontSize: 17 },
  removeText: { color: "#f87171" },

  formCard: { backgroundColor: "#25193A", borderRadius: 8, padding: 14, marginTop: 8 },
  formTitle: { color: "#FFF", fontSize: 15, fontWeight: "600", marginBottom: 10 },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFF",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: { color: "#C7BADB", fontSize: 12, marginTop: 12, marginBottom: 6 },
  daysHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  days: { flexDirection: "row", gap: 5 },
  day: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5B21B6",
    paddingVertical: 8,
    alignItems: "center",
  },
  dayActive: { backgroundColor: "#5B21B6", borderColor: "#A78BFA" },
  dayText: { color: "#FFF", fontSize: 11, fontWeight: "600" },

  error: { color: "#FCA5A5", fontSize: 13, marginTop: 10 },
  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
    minHeight: 46,
  },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  skip: { alignItems: "center", paddingVertical: 10 },
  link: { color: "#DDD6FE", fontSize: 13, textDecorationLine: "underline" },
  limit: { color: "#C7BADB", fontSize: 12, textAlign: "center" },
});
