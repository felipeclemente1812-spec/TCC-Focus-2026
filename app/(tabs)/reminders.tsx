import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useContext, useState } from "react";
import { Platform, Text, TextInput, TouchableOpacity, View } from "react-native";

import { CardTitle, maskTime, ScreenShell, ui } from "@/components/ScreenShell";
import { DAY_SHORT, WEEK_ORDER } from "@/context/HabitsContext";
import { RoutineContext } from "@/context/RoutineContext";
import { DigestSettings, TaskExtrasContext } from "@/context/TaskExtrasContext";
import { UsageMeter } from "@/components/PremiumGate";

// Central de lembretes: o que chega na barra de notificações.
// Diárias: uma notificação por tarefa (no horário dela) + resumo da manhã
// e aviso do que falta à noite. Semanais e mensais: só "reveja seus objetivos".
export default function Reminders() {
  const extras = useContext(TaskExtrasContext);
  const routine = useContext(RoutineContext);
  const [draft, setDraft] = useState<DigestSettings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  if (!extras || !routine) return null;

  const digest = draft ?? extras.digest;
  const daily = routine.tasks.filter((t) => t.frequency === "daily");
  const longer = routine.tasks.filter((t) => t.frequency !== "daily");

  const change = (patch: Partial<DigestSettings>) => {
    setSaved("");
    setDraft({ ...digest, ...patch });
  };

  const save = async (next: DigestSettings) => {
    const err = await extras.setDigest(next);
    setError(err ?? "");
    if (!err) {
      setDraft(null);
      setSaved(next.on ? "Lembretes gerais salvos." : "Lembretes gerais desligados.");
    }
  };

  const optionalTime = (
    label: string,
    value: string | null,
    fallback: string,
    onChange: (v: string | null) => void,
  ) => (
    <View style={[ui.rowBetween, { marginTop: 10 }]}>
      <Text style={[ui.desc, { marginTop: 0, flex: 1 }]}>{label}</Text>
      {value !== null ? (
        <TextInput
          value={value}
          onChangeText={(t) => onChange(maskTime(t))}
          keyboardType="number-pad"
          maxLength={5}
          style={ui.timeInput}
          accessibilityLabel={`Horário: ${label}`}
        />
      ) : null}
      <TouchableOpacity
        style={[ui.toggle, value !== null && ui.toggleOn]}
        onPress={() => onChange(value === null ? fallback : null)}
        accessibilityRole="switch"
        aria-checked={value !== null}
        accessibilityLabel={label}
      >
        <Text style={ui.toggleText}>{value !== null ? "Sim" : "Não"}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenShell title="Central de lembretes">
      <UsageMeter limit="lembretes" label="Desafios com lembrete ligado" />

      {/* LEMBRETES GERAIS */}
      <View style={ui.card}>
        <View style={ui.rowBetween}>
          <CardTitle icon="notifications-outline">Lembretes gerais</CardTitle>
          <TouchableOpacity
            style={[ui.toggle, digest.on && ui.toggleOn]}
            onPress={() => save({ ...digest, on: !digest.on })}
            accessibilityRole="switch"
            aria-checked={digest.on}
            accessibilityLabel="Lembretes gerais"
          >
            <Text style={ui.toggleText}>{digest.on ? "Ligado" : "Desligado"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={ui.hint}>
          Para você não esquecer de abrir o Focus: o resumo das tarefas de hoje, um aviso à noite se ainda faltar
          alguma, e o “reveja seus objetivos” das semanais e mensais.
        </Text>

        {optionalTime("Resumo do dia de manhã", digest.morning, "08:00", (v) => change({ morning: v }))}
        {optionalTime("À noite, se faltar tarefa", digest.evening, "20:00", (v) => change({ evening: v }))}

        <Text style={ui.subTitle}>“Reveja seus objetivos” (semanais)</Text>
        <View style={ui.chips}>
          {WEEK_ORDER.map((d) => (
            <TouchableOpacity
              key={d}
              style={[ui.chipSmall, digest.weeklyDay === d && ui.chipActive]}
              onPress={() => change({ weeklyDay: d })}
              accessibilityRole="radio"
              aria-checked={digest.weeklyDay === d}
            >
              <Text style={ui.chipText}>{DAY_SHORT[d]}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            value={digest.weeklyTime}
            onChangeText={(t) => change({ weeklyTime: maskTime(t) })}
            keyboardType="number-pad"
            maxLength={5}
            style={ui.timeInput}
            accessibilityLabel="Horário do lembrete semanal"
          />
        </View>

        <View style={[ui.rowBetween, { marginTop: 12 }]}>
          <Text style={[ui.desc, { marginTop: 0, flex: 1 }]}>Metas do mês (dia 1 e dia 20)</Text>
          <TouchableOpacity
            style={[ui.toggle, digest.monthly && ui.toggleOn]}
            onPress={() => change({ monthly: !digest.monthly })}
            accessibilityRole="switch"
            aria-checked={digest.monthly}
          >
            <Text style={ui.toggleText}>{digest.monthly ? "Sim" : "Não"}</Text>
          </TouchableOpacity>
        </View>

        {draft ? (
          <TouchableOpacity style={ui.smallButton} onPress={() => save({ ...digest, on: true })}>
            <Text style={ui.smallButtonText}>Salvar e ligar</Text>
          </TouchableOpacity>
        ) : null}
        {error ? <Text style={ui.error}>{error}</Text> : null}
        {saved ? <Text style={ui.ok}>{saved}</Text> : null}
      </View>

      {/* DIÁRIAS */}
      <View style={ui.card}>
        <CardTitle icon="today-outline">Tarefas diárias na barra</CardTitle>
        <Text style={ui.hint}>Cada diária pode tocar no próprio horário. Toque para mudar.</Text>
        {daily.length === 0 ? <Text style={[ui.muted, { marginTop: 8 }]}>Nenhuma diária na rotina.</Text> : null}
        {daily.map((t) => {
          const on = !!extras.reminders[t.id]?.on;
          const time = extras.reminderTime(t.id);
          return (
            <TouchableOpacity
              key={t.id}
              style={ui.listRow}
              onPress={() => router.push({ pathname: "/task", params: { id: t.id } })}
              accessibilityRole="button"
            >
              <Ionicons
                name={on ? "notifications" : "notifications-off-outline"}
                size={18}
                color={on ? "#A78BFA" : "#6B5A85"}
              />
              <View style={{ flex: 1 }}>
                <Text style={ui.listText}>{t.title}</Text>
                <Text style={ui.listSub}>{on && time ? `Toca às ${time}` : "Sem lembrete"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9E94AB" />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SEMANAIS E MENSAIS */}
      <View style={ui.card}>
        <CardTitle icon="flag-outline">Semanais e mensais</CardTitle>
        <Text style={ui.hint}>
          Essas não tocam uma a uma na barra. Elas entram no “reveja seus objetivos” acima
          {longer.length ? ` (${longer.length} na sua rotina)` : ""}.
        </Text>
      </View>

      <Text style={[ui.muted, { fontSize: 11 }]}>
        {Platform.OS === "web"
          ? "No navegador, os avisos só aparecem com o Focus aberto. No celular chegam mesmo com o app fechado."
          : "Os avisos chegam mesmo com o app fechado."}
      </Text>
    </ScreenShell>
  );
}
