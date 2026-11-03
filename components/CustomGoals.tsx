import { Ionicons } from "@expo/vector-icons";
import { useContext, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { CardTitle, ui } from "@/components/ScreenShell";
import {
  CUSTOM_GOAL_MAX,
  CUSTOM_GOAL_MIN,
  CUSTOM_GOAL_XP,
  CustomGoal,
  PlannerContext,
} from "@/context/PlannerContext";
import { confirmAction } from "@/utils/feedback";

// Metas próprias semanais/mensais. O app não tem como conferir, então
// para não virar farm de XP: check-in 1x por dia (só hoje), mínimo de dias
// no período, até 3 por frequência e metade do XP do catálogo.
export default function CustomGoals({ manage = true }: { manage?: boolean }) {
  const planner = useContext(PlannerContext);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<CustomGoal["frequency"]>("weekly");
  const [target, setTarget] = useState(String(CUSTOM_GOAL_MIN.weekly));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  if (!planner) return null;
  const goals = planner.customGoals;
  if (!manage && goals.length === 0) return null;

  const create = () => {
    const err = planner.addCustomGoal(title, frequency, Number(target));
    setMsg(err ? { text: err, error: true } : { text: "Meta criada.", error: false });
    if (!err) setTitle("");
  };

  const checkIn = (g: CustomGoal) => {
    const res = planner.checkInCustomGoal(g.id, notes[g.id] ?? "");
    if (res.error) return setMsg({ text: res.error, error: true });
    setNotes((n) => ({ ...n, [g.id]: "" }));
    setMsg({ text: res.gained ? `Meta batida! +${res.gained} XP` : "Check-in feito.", error: false });
  };

  return (
    <View style={ui.card}>
      <CardTitle icon="flag-outline">Metas próprias</CardTitle>
      <Text style={ui.hint}>
        Semanais ou mensais criadas por você. Faça check-in no dia em que cumprir; ao chegar nos dias da meta você ganha
        +{CUSTOM_GOAL_XP.weekly} XP (semanal) ou +{CUSTOM_GOAL_XP.monthly} XP (mensal), metade de um desafio do catálogo.
      </Text>

      {goals.map((g) => {
        const { done, complete } = planner.customGoalProgress(g);
        const today = g.checkins.includes(planner.today);
        const pct = Math.min(100, Math.round((done / g.target) * 100));
        return (
          <View key={g.id} style={[ui.listRow, { flexDirection: "column", alignItems: "stretch" }]}>
            <View style={ui.rowBetween}>
              <Text style={ui.listText}>{g.title}</Text>
              {manage ? (
                <TouchableOpacity
                  hitSlop={8}
                  accessibilityLabel={`Apagar ${g.title}`}
                  onPress={async () => {
                    if (await confirmAction("Apagar meta?", `"${g.title}" e os check-ins saem do app.`, "Apagar")) planner.removeCustomGoal(g.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#9E94AB" />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={ui.listSub}>
              {g.frequency === "weekly" ? "Semanal" : "Mensal"} · {done}/{g.target} dias
              {complete ? " · meta batida" : ""}
            </Text>
            <View style={ui.bar}>
              <View style={[ui.barFill, { width: `${pct}%` }]} />
            </View>
            {!today && !complete ? (
              <>
                {g.frequency === "monthly" ? (
                  <TextInput
                    style={ui.input}
                    value={notes[g.id] ?? ""}
                    onChangeText={(t) => setNotes((n) => ({ ...n, [g.id]: t }))}
                    placeholder="O que você fez hoje? (obrigatório nas mensais)"
                    placeholderTextColor="#9E94AB"
                  />
                ) : null}
                <TouchableOpacity style={ui.smallButton} onPress={() => checkIn(g)}>
                  <Text style={ui.smallButtonText}>Fiz hoje</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={ui.ok}>{complete ? "Meta do período batida." : "Check-in de hoje feito."}</Text>
            )}
          </View>
        );
      })}

      {manage ? (
        <>
          <Text style={ui.subTitle}>Nova meta própria</Text>
          <TextInput style={ui.input} value={title} onChangeText={setTitle} placeholder="Ex.: Correr no parque" placeholderTextColor="#9E94AB" maxLength={50} />
          <View style={ui.chips}>
            {(["weekly", "monthly"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[ui.chipSmall, frequency === f && ui.chipActive]}
                onPress={() => {
                  setFrequency(f);
                  setTarget(String(CUSTOM_GOAL_MIN[f]));
                }}
              >
                <Text style={ui.chipText}>{f === "weekly" ? "Semanal" : "Mensal"}</Text>
              </TouchableOpacity>
            ))}
            <Text style={ui.meta}>dias:</Text>
            <TextInput style={ui.timeInput} value={target} onChangeText={(t) => setTarget(t.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={2} />
          </View>
          <Text style={ui.listSub}>
            Mínimo {CUSTOM_GOAL_MIN[frequency]} dias · até {CUSTOM_GOAL_MAX} metas {frequency === "weekly" ? "semanais" : "mensais"}
          </Text>
          <TouchableOpacity style={ui.smallButton} onPress={create}>
            <Text style={ui.smallButtonText}>Criar meta</Text>
          </TouchableOpacity>
        </>
      ) : null}
      {msg ? <Text style={msg.error ? ui.error : ui.ok}>{msg.text}</Text> : null}
    </View>
  );
}
