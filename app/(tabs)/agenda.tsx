import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useContext, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { CardTitle, formatDay, maskTime, ScreenShell, ui } from "@/components/ScreenShell";
import { dayKey } from "@/constants/gamification";
import { DAY_SHORT } from "@/context/HabitsContext";
import { AgendaKind, PlannerContext } from "@/context/PlannerContext";
import { KIND_INFO, useAgenda } from "@/hooks/useAgenda";
import { confirmAction } from "@/utils/feedback";
import { UsageMeter } from "@/components/PremiumGate";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const KINDS: AgendaKind[] = ["compromisso", "prova", "prazo"];

// Agenda simples, no jeito da agenda do celular: mês, dia e compromissos.
// Encontros marcados nos grupos aparecem aqui sozinhos.
export default function Agenda() {
  const planner = useContext(PlannerContext);
  const items = useAgenda();
  const today = dayKey();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [kind, setKind] = useState<AgendaKind>("compromisso");
  const [note, setNote] = useState("");
  const [remind, setRemind] = useState(true);
  const [error, setError] = useState("");

  if (!planner) return null;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // segunda primeiro
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const keyOf = (d: number) => dayKey(new Date(year, month, d));
  const itemsOn = (day: string) => items.filter((i) => i.day === day);
  const dayItems = itemsOn(selected);
  const upcoming = items.filter((i) => i.day >= today).slice(0, 6);

  const reset = () => {
    setEditing(null);
    setTitle("");
    setTime("");
    setKind("compromisso");
    setNote("");
    setRemind(true);
  };

  const save = () => {
    const err = planner.saveEvent({ id: editing ?? undefined, title, day: selected, time: time || null, kind, note, remind });
    setError(err ?? "");
    if (!err) reset();
  };

  const move = (delta: number) => setCursor(new Date(year, month + delta, 1));

  return (
    <ScreenShell title="Agenda">
      <UsageMeter limit="agendaMes" label="Compromissos criados este mês" />

      {/* CALENDÁRIO DO MÊS */}
      <View style={ui.card}>
        <View style={ui.rowBetween}>
          <TouchableOpacity onPress={() => move(-1)} hitSlop={10} accessibilityLabel="Mês anterior">
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={ui.cardTitle}>
            {MONTHS[month]} {year}
          </Text>
          <TouchableOpacity onPress={() => move(1)} hitSlop={10} accessibilityLabel="Próximo mês">
            <Ionicons name="chevron-forward" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <Text key={d} style={{ flex: 1, textAlign: "center", color: "#9E94AB", fontSize: 11 }}>
              {DAY_SHORT[d]}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <View key={`v${i}`} style={{ width: `${100 / 7}%`, height: 42 }} />;
            const k = keyOf(d);
            const list = itemsOn(k);
            const isSel = k === selected;
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setSelected(k)}
                style={{ width: `${100 / 7}%`, height: 42, alignItems: "center", justifyContent: "center" }}
                accessibilityRole="button"
                accessibilityLabel={`${d} de ${MONTHS[month]}${list.length ? `, ${list.length} compromisso(s)` : ""}`}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isSel ? "#7C3AED" : "transparent",
                    borderWidth: k === today ? 1 : 0,
                    borderColor: "#A78BFA",
                  }}
                >
                  <Text style={{ color: "#FFF", fontSize: 13, fontWeight: k === today ? "700" : "400" }}>{d}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 2, height: 5 }}>
                  {list.slice(0, 3).map((it) => (
                    <View key={it.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: KIND_INFO[it.kind].color }} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* DIA ESCOLHIDO */}
      <View style={ui.card}>
        <CardTitle icon="today-outline">{selected === today ? "Hoje" : formatDay(selected)}</CardTitle>
        {dayItems.length === 0 ? <Text style={ui.hint}>Nada marcado neste dia.</Text> : null}
        {dayItems.map((it) => (
          <View key={it.id} style={ui.listRow}>
            <Ionicons name={KIND_INFO[it.kind].icon} size={18} color={KIND_INFO[it.kind].color} />
            <View style={{ flex: 1 }}>
              <Text style={ui.listText}>{it.title}</Text>
              <Text style={ui.listSub}>
                {it.time ?? "dia todo"} · {KIND_INFO[it.kind].label}
                {it.groupName ? ` · grupo ${it.groupName}` : ""}
                {it.note ? ` · ${it.note}` : ""}
                {it.remind ? "" : " · sem aviso"}
              </Text>
            </View>
            {it.groupId ? (
              <TouchableOpacity onPress={() => router.push({ pathname: "/group", params: { id: it.groupId as string } })} hitSlop={8} accessibilityLabel="Abrir grupo">
                <Ionicons name="open-outline" size={17} color="#DDD6FE" />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  hitSlop={8}
                  accessibilityLabel={`Editar ${it.title}`}
                  onPress={() => {
                    setEditing(it.id);
                    setTitle(it.title);
                    setTime(it.time ?? "");
                    setKind(it.kind);
                    setNote(it.note);
                    setRemind(it.remind);
                  }}
                >
                  <Ionicons name="create-outline" size={17} color="#DDD6FE" />
                </TouchableOpacity>
                <TouchableOpacity
                  hitSlop={8}
                  accessibilityLabel={`Apagar ${it.title}`}
                  onPress={async () => {
                    if (await confirmAction("Apagar compromisso?", `"${it.title}" sai da agenda.`, "Apagar")) planner.removeEvent(it.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#9E94AB" />
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}

        <Text style={ui.subTitle}>{editing ? "Editar compromisso" : "Novo compromisso neste dia"}</Text>
        <TextInput style={ui.input} value={title} onChangeText={setTitle} placeholder="Ex.: prova de Química" placeholderTextColor="#9E94AB" />
        <View style={ui.chips}>
          {KINDS.map((k) => (
            <TouchableOpacity key={k} style={[ui.chipSmall, kind === k && ui.chipActive]} onPress={() => setKind(k)}>
              <Text style={ui.chipText}>{KIND_INFO[k].label}</Text>
            </TouchableOpacity>
          ))}
          <TextInput style={ui.timeInput} value={time} onChangeText={(t) => setTime(maskTime(t))} placeholder="hh:mm" placeholderTextColor="#9E94AB" keyboardType="number-pad" maxLength={5} />
        </View>
        <TextInput style={ui.input} value={note} onChangeText={setNote} placeholder="Observação (opcional)" placeholderTextColor="#9E94AB" />
        <View style={ui.rowBetween}>
          <Text style={[ui.desc, { marginTop: 0 }]}>Avisar 30 min antes</Text>
          <TouchableOpacity style={[ui.toggle, remind && ui.toggleOn]} onPress={() => setRemind(!remind)} accessibilityRole="switch" aria-checked={remind}>
            <Text style={ui.toggleText}>{remind ? "Sim" : "Não"}</Text>
          </TouchableOpacity>
        </View>
        <View style={ui.row}>
          <TouchableOpacity style={ui.smallButton} onPress={save}>
            <Text style={ui.smallButtonText}>{editing ? "Salvar alterações" : "Adicionar"}</Text>
          </TouchableOpacity>
          {editing ? (
            <TouchableOpacity onPress={reset} style={{ marginTop: 8 }}>
              <Text style={ui.link}>Cancelar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {error ? <Text style={ui.error}>{error}</Text> : null}
      </View>

      {/* PRÓXIMOS */}
      <View style={ui.card}>
        <CardTitle icon="list-outline">Próximos</CardTitle>
        {upcoming.length === 0 ? <Text style={ui.hint}>Sem compromissos futuros.</Text> : null}
        {upcoming.map((it) => (
          <TouchableOpacity key={it.id} style={ui.listRow} onPress={() => setSelected(it.day)}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: KIND_INFO[it.kind].color }} />
            <Text style={ui.listText}>{it.title}</Text>
            <Text style={ui.listSub}>
              {formatDay(it.day)}
              {it.time ? ` ${it.time}` : ""}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={ui.hint}>Encontros que você confirmou nos grupos entram aqui sozinhos.</Text>
      </View>
    </ScreenShell>
  );
}
