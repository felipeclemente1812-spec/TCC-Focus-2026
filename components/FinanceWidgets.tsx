import { Ionicons } from "@expo/vector-icons";
import { useContext, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { formatMoney, parseMoney } from "@/constants/finance";
import { dayKey } from "@/constants/gamification";
import {
  dailySeries,
  FinanceContext,
  goalSaved,
  monthlySeries,
  savedSeries,
  SavingsGoal,
  Transaction,
} from "@/context/FinanceContext";

// Peças de finanças usadas fora de "Minhas finanças" (tela da tarefa, grupos)
// e nos gráficos novos do resumo e dos cofrinhos.

const INCOME = "#22C55E";
const EXPENSE = "#B832E5";
const SAVE = "#0EA5E9";

// ---------- Guardar dinheiro (sem sair da tela) ----------

export function QuickSave({ onSaved }: { onSaved?: (value: number) => void }) {
  const fin = useContext(FinanceContext);
  const ongoing = fin ? fin.goals.filter((g) => goalSaved(g) < g.target) : [];
  const [goalId, setGoalId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  if (!fin) return null;

  const selected = ongoing.find((g) => g.id === goalId) ?? ongoing[0];

  const save = () => {
    const v = parseMoney(value);
    if (!v) return setError("Digite quanto guardou (ex.: 20).");
    if (selected) {
      fin.deposit(selected.id, v);
      setMsg(`${formatMoney(v)} guardado em “${selected.name}”.`);
    } else {
      const t = parseMoney(target);
      if (!t) return setError("Digite a meta do cofrinho (ex.: 300).");
      const err = fin.quickGoal(name, t, v);
      if (err) return setError(err);
      setMsg(`Cofrinho “${name.trim()}” criado com ${formatMoney(v)}.`);
      setName("");
      setTarget("");
    }
    setError("");
    setValue("");
    onSaved?.(v);
  };

  return (
    <View>
      {ongoing.length > 0 ? (
        <>
          <Text style={s.label}>Em qual cofrinho?</Text>
          <View style={s.chips}>
            {ongoing.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[s.chip, selected?.id === g.id && { backgroundColor: g.color, borderColor: g.color }]}
                onPress={() => setGoalId(g.id)}
                accessibilityRole="radio"
                aria-checked={selected?.id === g.id}
              >
                <Text style={s.chipText} numberOfLines={1}>
                  {g.name} · {formatMoney(goalSaved(g))}/{formatMoney(g.target)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={s.label}>Você ainda não tem cofrinho. Crie um agora:</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Para quê? (ex.: Viagem)"
            placeholderTextColor="#9E94AB"
            style={s.input}
            maxLength={40}
          />
          <TextInput
            value={target}
            onChangeText={setTarget}
            placeholder="Meta do cofrinho (R$)"
            placeholderTextColor="#9E94AB"
            keyboardType="decimal-pad"
            style={s.input}
          />
        </>
      )}
      <View style={s.row}>
        <TextInput
          value={value}
          onChangeText={(t) => {
            setValue(t);
            setMsg("");
          }}
          onSubmitEditing={save}
          placeholder="Quanto guardou? (R$)"
          placeholderTextColor="#9E94AB"
          keyboardType="decimal-pad"
          style={[s.input, { flex: 1, marginTop: 0 }]}
          accessibilityLabel="Valor guardado"
        />
        <TouchableOpacity style={s.button} onPress={save} accessibilityRole="button">
          <Text style={s.buttonText}>
            <Ionicons name="add-circle-outline" /> Guardar
          </Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      {msg ? (
        <Text style={s.ok}>
          <Ionicons name="checkmark-circle" /> {msg}
        </Text>
      ) : null}
    </View>
  );
}

// ---------- Gráficos ----------

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View style={[s.row, { marginTop: 8, flexWrap: "wrap" }]}>
      {items.map((i) => (
        <View key={i.label} style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: i.color }]} />
          <Text style={s.legendText}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

// Receitas x despesas nos últimos 6 meses (barras lado a lado)
export function MonthCompareChart({ transactions }: { transactions: Transaction[] }) {
  const data = monthlySeries(transactions);
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const sel = data.find((d) => d.month === selected);
  return (
    <View>
      <View style={s.chart}>
        {data.map((d) => (
          <TouchableOpacity
            key={d.month}
            style={[s.col, selected === d.month && s.colActive]}
            onPress={() => setSelected(selected === d.month ? null : d.month)}
            accessibilityLabel={`${d.label}: receitas ${formatMoney(d.income)}, despesas ${formatMoney(d.expense)}`}
          >
            <View style={s.pair}>
              <View style={[s.bar, { height: d.income ? Math.max(4, (d.income / max) * 110) : 2, backgroundColor: INCOME }]} />
              <View style={[s.bar, { height: d.expense ? Math.max(4, (d.expense / max) * 110) : 2, backgroundColor: EXPENSE }]} />
            </View>
            <Text style={s.colLabel}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Legend items={[{ color: INCOME, label: "Receitas" }, { color: EXPENSE, label: "Despesas" }]} />
      <Text style={s.hint}>
        {sel
          ? `${sel.label}: +${formatMoney(sel.income)} · -${formatMoney(sel.expense)} · saldo ${formatMoney(sel.income - sel.expense)}`
          : "Toque num mês para ver os valores."}
      </Text>
    </View>
  );
}

// Quanto foi guardado por mês + como o total está dividido entre os cofrinhos
export function SavedChart({ goals }: { goals: SavingsGoal[] }) {
  const data = savedSeries(goals);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = goals.reduce((sum, g) => sum + goalSaved(g), 0);
  const parts = goals.filter((g) => goalSaved(g) > 0);
  return (
    <View>
      <View style={s.chart}>
        {data.map((d) => (
          <View key={d.month} style={s.col} accessibilityLabel={`${d.label}: ${formatMoney(d.value)}`}>
            {d.value ? <Text style={s.barValue}>{Math.round(d.value)}</Text> : null}
            <View style={[s.bar, s.barWide, { height: d.value ? Math.max(4, (d.value / max) * 100) : 2, backgroundColor: SAVE }]} />
            <Text style={s.colLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
      {parts.length > 0 ? (
        <>
          <Text style={s.label}>Divisão entre os cofrinhos ({formatMoney(total)})</Text>
          <View style={s.stack}>
            {parts.map((g) => (
              <View key={g.id} style={{ flex: goalSaved(g), backgroundColor: g.color }} />
            ))}
          </View>
          <Legend items={parts.map((g) => ({ color: g.color, label: `${g.name} ${Math.round((goalSaved(g) / total) * 100)}%` }))} />
        </>
      ) : (
        <Text style={s.hint}>Guarde um valor num cofrinho para o gráfico aparecer.</Text>
      )}
    </View>
  );
}

// Gastos da semana (seg a dom), versão compacta para a tela da tarefa
export function WeekMiniChart({ transactions }: { transactions: Transaction[] }) {
  const data = dailySeries(transactions, "expense", "week");
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <View>
      <View style={[s.chart, { height: 90 }]}>
        {data.map((d) => (
          <View key={d.day} style={s.col} accessibilityLabel={`${d.day}: ${formatMoney(d.value)}`}>
            <View
              style={[
                s.bar,
                s.barWide,
                { height: d.value ? Math.max(4, (d.value / max) * 70) : 2, backgroundColor: EXPENSE },
                d.day === dayKey() && s.barToday,
              ]}
            />
            <Text style={s.colLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
      <Text style={s.hint}>Gastos desta semana: {formatMoney(total)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: "#FFF", fontSize: 13, fontWeight: "600", marginTop: 12 },
  hint: { color: "#C7BADB", fontSize: 12, marginTop: 6, lineHeight: 17 },
  error: { color: "#FCA5A5", fontSize: 13, marginTop: 8 },
  ok: { color: "#86EFAC", fontSize: 13, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { borderRadius: 14, borderWidth: 1, borderColor: "#5B21B6", paddingHorizontal: 10, paddingVertical: 6, maxWidth: "100%" },
  chipText: { color: "#FFF", fontSize: 12 },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFF",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  button: { backgroundColor: "#7C3AED", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  buttonText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  chart: { flexDirection: "row", alignItems: "flex-end", height: 140, marginTop: 12, gap: 4 },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%", borderRadius: 6, paddingBottom: 2 },
  colActive: { backgroundColor: "rgba(255,255,255,0.06)" },
  pair: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  bar: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barWide: { width: "60%", maxWidth: 26 },
  barToday: { borderWidth: 1, borderColor: "#FFF" },
  barValue: { color: "#DDD6FE", fontSize: 9, marginBottom: 2 },
  colLabel: { color: "#9E94AB", fontSize: 10, marginTop: 4, height: 13 },
  stack: { flexDirection: "row", height: 14, borderRadius: 8, overflow: "hidden", marginTop: 8, backgroundColor: "#57356F" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: "#DDD6FE", fontSize: 12 },
});
