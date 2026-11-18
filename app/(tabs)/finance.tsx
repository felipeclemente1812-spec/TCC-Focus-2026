import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  ARTICLES,
  categoryOf,
  EXPENSE_CATEGORIES,
  formatMoney,
  GOAL_COLORS,
  INCOME_CATEGORIES,
  MoneyType,
  parseMoney,
} from "@/constants/finance";
import { MonthCompareChart, SavedChart } from "@/components/FinanceWidgets";
import { dayKey, daysLeftInMonth, monthKey } from "@/constants/gamification";
import { confirmAction } from "@/utils/feedback";
import { UsageMeter } from "@/components/PremiumGate";
import {
  byCategory,
  dailySeries,
  FinanceContext,
  goalSaved,
  inPeriod,
  Period,
  PERIOD_LABEL,
  SavingsGoal,
  totals,
  Transaction,
} from "@/context/FinanceContext";

// Minhas finanças: funções do Squill (gastos, receitas, gráficos, metas e
// educação financeira) com o visual do Focus. Tudo salvo neste aparelho.

type Tab = "resumo" | "lancamentos" | "cofrinhos" | "aprender";
const TABS: { key: Tab; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "lancamentos", label: "Lançamentos" },
  { key: "cofrinhos", label: "Cofrinhos" },
  { key: "aprender", label: "Aprender" },
];

const pad = (n: number) => String(n).padStart(2, "0");
// "2026-10-29" -> "29/10/26"
const showDay = (day: string) => {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};
// "29/10" ou "29/10/26" -> "2026-10-29" (null se inválida)
const parseDay = (text: string) => {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  if (!match) return null;
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = match[3] ? (match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3])) : new Date().getFullYear();
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
};
const maskDate = (t: string) => {
  const digits = t.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};
const todayText = () => {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
};
const monthName = (ref: Date) => ref.toLocaleString("pt-BR", { month: "long", year: "numeric" });

export default function Finance() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>("resumo");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (params.tab && TABS.some((t) => t.key === params.tab)) setTab(params.tab as Tab);
  }, [params.tab]);

  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("FinanceContext não encontrado");

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <ScrollView keyboardDismissMode="on-drag" ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/challenges"))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" style={styles.back} />
            </TouchableOpacity>
            <Text style={styles.title}><Ionicons name="wallet-outline" /> Minhas finanças</Text>
            <View style={{ width: 25 }} />
          </View>

          <View style={styles.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={tab === t.key ? styles.activeTab : styles.tab}
                onPress={() => setTab(t.key)}
                accessibilityRole="tab"
                aria-selected={tab === t.key}
              >
                <Text style={styles.tabText} numberOfLines={1}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === "resumo" ? <Summary /> : null}
          {tab === "lancamentos" ? <Entries onEdit={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} /> : null}
          {tab === "cofrinhos" ? <Goals onEdit={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} /> : null}
          {tab === "aprender" ? <Learn /> : null}

          <Text style={styles.note}>Seus dados de finanças ficam salvos só neste aparelho.</Text>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

// ---------- RESUMO (gráficos) ----------

function Summary() {
  const ctx = useContext(FinanceContext)!;
  const [period, setPeriod] = useState<Period>("week");
  const [type, setType] = useState<MoneyType>("expense");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [limitText, setLimitText] = useState(ctx.monthlyLimit ? String(ctx.monthlyLimit).replace(".", ",") : "");
  const [msg, setMsg] = useState("");

  const inRange = ctx.transactions.filter((t) => inPeriod(t.day, period));
  const sum = totals(inRange);
  const cats = byCategory(inRange, type);
  const series = period === "day" ? [] : dailySeries(ctx.transactions, type, period);
  const max = Math.max(1, ...series.map((s) => s.value));
  const listed = inRange
    .filter((t) => t.type === type && (!selectedCat || t.category === selectedCat))
    .sort((a, b) => (a.day < b.day ? 1 : -1));

  // Meta de consumo (limite do mês)
  const spentMonth = totals(ctx.transactions.filter((t) => inPeriod(t.day, "month"))).expense;
  const limit = ctx.monthlyLimit;
  const usedPct = limit ? Math.min(100, (spentMonth / limit) * 100) : 0;
  const leftPerDay = limit ? Math.max(0, limit - spentMonth) / daysLeftInMonth() : 0;
  const monthClosed = ctx.closedMonths.includes(monthKey());

  const saveLimit = () => {
    if (!limitText.trim()) {
      ctx.setMonthlyLimit(null);
      return;
    }
    const v = parseMoney(limitText);
    if (v) ctx.setMonthlyLimit(v);
  };

  return (
    <>
      <View style={styles.chips}>
        {(["day", "week", "month"] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, period === p && styles.chipActive]}
            onPress={() => {
              setPeriod(p);
              setSelectedDay(null);
              setSelectedCat(null);
            }}
            accessibilityRole="radio"
            aria-checked={period === p}
          >
            <Text style={styles.chipText}>{PERIOD_LABEL[p]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <UsageMeter limit="lancamentosMes" label="Lançamentos este mês" />

      {/* TOTAIS */}
      <View style={styles.totalsRow}>
        <View style={[styles.totalCard, styles.totalIncome]}>
          <Text style={styles.totalLabel}>Receitas</Text>
          <Text style={styles.totalValue}>{formatMoney(sum.income)}</Text>
        </View>
        <View style={[styles.totalCard, styles.totalExpense]}>
          <Text style={styles.totalLabel}>Despesas</Text>
          <Text style={styles.totalValue}>{formatMoney(sum.expense)}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saldo ({PERIOD_LABEL[period].toLowerCase()})</Text>
        <Text style={[styles.balance, sum.balance < 0 && styles.negative]}>{formatMoney(sum.balance)}</Text>
      </View>

      {/* GRÁFICOS */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}><Ionicons name="pie-chart-outline" /> {type === "expense" ? "Despesas" : "Receitas"}</Text>
          <TouchableOpacity
            onPress={() => {
              setType(type === "expense" ? "income" : "expense");
              setSelectedCat(null);
              setSelectedDay(null);
            }}
            style={styles.toggle}
            accessibilityRole="button"
          >
            <Text style={styles.toggleText}><Ionicons name="swap-vertical" /> ver {type === "expense" ? "receitas" : "despesas"}</Text>
          </TouchableOpacity>
        </View>

        {period !== "day" ? (
          <>
            <View style={styles.barChart}>
              {series.map((s) => {
                const h = s.value > 0 ? Math.max(4, (s.value / max) * 110) : 2;
                const active = selectedDay === s.day;
                return (
                  <TouchableOpacity
                    key={s.day}
                    style={styles.barCol}
                    onPress={() => setSelectedDay(active ? null : s.day)}
                    accessibilityLabel={`${showDay(s.day)}: ${formatMoney(s.value)}`}
                  >
                    <GrowBar height={h} active={active} today={s.day === dayKey()} income={type === "income"} />
                    <Text style={styles.barLabel}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {selectedDay
                ? `${showDay(selectedDay)}: ${formatMoney(series.find((s) => s.day === selectedDay)?.value ?? 0)}`
                : "Toque numa barra para ver o valor do dia."}
            </Text>
          </>
        ) : null}

        <Text style={styles.subTitle}>Por categoria</Text>
        {cats.length === 0 ? (
          <Text style={styles.hint}>Nada registrado neste período.</Text>
        ) : (
          cats.map((c) => {
            const info = categoryOf(type, c.category);
            const active = selectedCat === c.category;
            return (
              <TouchableOpacity
                key={c.category}
                onPress={() => setSelectedCat(active ? null : c.category)}
                style={[styles.catRow, active && styles.catRowActive]}
                accessibilityRole="button"
                aria-selected={active}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.catLabel}>
                    <Ionicons name={info.icon} /> {info.label}
                  </Text>
                  <Text style={styles.catValue}>
                    {formatMoney(c.value)} · {Math.round(c.pct)}%
                  </Text>
                </View>
                <View style={styles.catBar}>
                  <View style={[styles.catFill, { width: `${c.pct}%`, backgroundColor: info.color }]} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {listed.length > 0 ? (
          <Text style={styles.subTitle}>
            {selectedCat ? `${categoryOf(type, selectedCat).label}` : "Lançamentos"} ({listed.length})
          </Text>
        ) : null}
        {listed.slice(0, 15).map((t) => (
          <TransactionRow key={t.id} t={t} />
        ))}
      </View>

      {/* COMPARAÇÃO MÊS A MÊS */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="bar-chart-outline" /> Receitas x despesas (6 meses)</Text>
        <MonthCompareChart transactions={ctx.transactions} />
      </View>

      {/* META DE CONSUMO */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="speedometer-outline" /> Limite de gastos do mês</Text>
        <Text style={styles.hint}>Quanto você quer gastar no máximo neste mês (meta de consumo).</Text>
        <View style={styles.chips}>
          <TextInput
            value={limitText}
            onChangeText={setLimitText}
            onBlur={saveLimit}
            onSubmitEditing={saveLimit}
            placeholder="Ex.: 500"
            placeholderTextColor="#9E94AB"
            keyboardType="decimal-pad"
            style={[styles.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
            accessibilityLabel="Limite de gastos do mês"
          />
          <TouchableOpacity style={styles.smallButton} onPress={saveLimit}>
            <Text style={styles.smallButtonText}>Salvar</Text>
          </TouchableOpacity>
        </View>
        {limit ? (
          <>
            <Text style={styles.desc}>
              {formatMoney(spentMonth)} de {formatMoney(limit)}
            </Text>
            <View style={styles.bar}>
              <View
                style={[
                  styles.barFill,
                  { width: `${usedPct}%` },
                  usedPct >= 100 ? styles.barDanger : usedPct >= 80 ? styles.barWarn : null,
                ]}
              />
            </View>
            <Text style={[styles.hint, usedPct >= 80 && styles.warnText]}>
              {spentMonth > limit
                ? `Passou ${formatMoney(spentMonth - limit)} do limite.`
                : usedPct >= 80
                  ? `Atenção: já usou ${Math.round(usedPct)}% do limite.`
                  : `Dá para gastar ${formatMoney(leftPerDay)} por dia até o fim do mês.`}
            </Text>
          </>
        ) : null}
      </View>

      {/* DESAFIOS DA ROTINA */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="checkmark-done-outline" /> Revisão</Text>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={() => {
            ctx.reviewBudget();
            setMsg("Orçamento da semana revisado.");
          }}
        >
          <Text style={styles.smallButtonText}>Revisei o orçamento da semana</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallButton, monthClosed && styles.disabled]}
          disabled={monthClosed}
          onPress={() => {
            ctx.closeMonth();
            setMsg(`Planilha de ${monthName(new Date())} fechada.`);
          }}
        >
          <Text style={styles.smallButtonText}>
            {monthClosed ? `${monthName(new Date())} fechado` : `Fechar a planilha de ${monthName(new Date())}`}
          </Text>
        </TouchableOpacity>
        {msg ? <Text style={styles.hint}>{msg}</Text> : null}
        <Text style={styles.hint}>
          Cumprem “Revisar o orçamento” e “Fechar a planilha de gastos do mês” se estiverem na sua rotina.
        </Text>
      </View>
    </>
  );
}

// Barra que cresce ao aparecer
function GrowBar({ height, active, today, income }: { height: number; active: boolean; today: boolean; income: boolean }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, { toValue: height, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anim, height]);
  return (
    <Animated.View
      style={[
        styles.barItem,
        { height: anim },
        income ? styles.barIncome : null,
        today ? styles.barToday : null,
        active ? styles.barActive : null,
      ]}
    />
  );
}

function TransactionRow({ t, onPress }: { t: Transaction; onPress?: () => void }) {
  const info = categoryOf(t.type, t.category);
  return (
    <TouchableOpacity
      style={styles.txRow}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${t.name}, ${formatMoney(t.amount)}${onPress ? ". Toque para editar" : ""}`}
    >
      <View style={[styles.txIcon, { backgroundColor: info.color }]}>
        <Ionicons name={info.icon} size={16} color="#FFF" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.txName} numberOfLines={1}>
          {t.name}
        </Text>
        <Text style={styles.txMeta}>
          {info.label} · {showDay(t.day)}
        </Text>
      </View>
      <Text style={[styles.txAmount, t.type === "income" ? styles.incomeText : styles.expenseText]}>
        {t.type === "income" ? "+" : "-"}
        {formatMoney(t.amount)}
      </Text>
      {onPress ? <Ionicons name="create-outline" style={styles.txEdit} color="#DDD6FE" /> : null}
    </TouchableOpacity>
  );
}

// ---------- LANÇAMENTOS ----------

function TransactionForm({ editing, onDone }: { editing?: Transaction | null; onDone?: () => void }) {
  const ctx = useContext(FinanceContext)!;
  const [type, setType] = useState<MoneyType>(editing?.type ?? "expense");
  const [name, setName] = useState(editing?.name ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount).replace(".", ",") : "");
  const [date, setDate] = useState(editing ? showDay(editing.day) : todayText());
  const [category, setCategory] = useState(editing?.category ?? "quest");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setType(editing?.type ?? "expense");
    setName(editing?.name ?? "");
    setAmount(editing ? String(editing.amount).replace(".", ",") : "");
    setDate(editing ? showDay(editing.day) : todayText());
    setCategory(editing?.category ?? "quest");
    setError("");
  }, [editing]);

  const cats = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const save = () => {
    const value = parseMoney(amount);
    const day = parseDay(date);
    if (!value) return setError("Digite um valor válido (ex.: 12,50).");
    if (!day) return setError("Data inválida. Use dd/mm ou dd/mm/aa.");
    const input = { type, name, amount: value, category, day };
    const err = editing ? ctx.updateTransaction(editing.id, input) : ctx.addTransaction(input);
    setError(err ?? "");
    if (err) return;
    setOk(editing ? "Alterações salvas." : `${type === "expense" ? "Despesa" : "Receita"} registrada!`);
    setName("");
    setAmount("");
    setDate(todayText());
    onDone?.();
  };

  return (
    <View style={[styles.card, editing && styles.editingCard]}>
      <Text style={styles.cardTitle}><Ionicons name={editing ? "create-outline" : "add-circle-outline"} /> {editing ? "Editar lançamento" : "Novo lançamento"}</Text>
      <View style={styles.chips}>
        {(["expense", "income"] as MoneyType[]).map((tp) => (
          <TouchableOpacity
            key={tp}
            style={[styles.chip, type === tp && (tp === "expense" ? styles.chipExpense : styles.chipIncome)]}
            onPress={() => {
              setType(tp);
              setCategory(tp === "expense" ? "quest" : "other");
            }}
            accessibilityRole="radio"
            aria-checked={type === tp}
          >
            <Text style={styles.chipText}>{tp === "expense" ? "Despesa" : "Receita"}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        value={name}
        onChangeText={(t) => {
          setName(t);
          setOk("");
        }}
        placeholder={type === "expense" ? "Com o quê? (ex.: Lanche)" : "De onde? (ex.: Mesada)"}
        placeholderTextColor="#9E94AB"
        style={styles.input}
        maxLength={40}
        accessibilityLabel="Nome do lançamento"
      />
      <View style={styles.chips}>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Valor (R$)"
          placeholderTextColor="#9E94AB"
          keyboardType="decimal-pad"
          style={[styles.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
          accessibilityLabel="Valor"
        />
        <TextInput
          value={date}
          onChangeText={(t) => setDate(maskDate(t))}
          placeholder="dd/mm/aa"
          placeholderTextColor="#9E94AB"
          keyboardType="number-pad"
          style={[styles.input, { width: 100, marginTop: 0, marginBottom: 0 }]}
          maxLength={8}
          accessibilityLabel="Data"
        />
      </View>
      <View style={styles.chips}>
        {cats.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.catChip, category === c.key && { backgroundColor: c.color, borderColor: c.color }]}
            onPress={() => setCategory(c.key)}
            accessibilityRole="radio"
            aria-checked={category === c.key}
          >
            <Text style={styles.chipText}>
              <Ionicons name={c.icon} /> {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {ok ? <Text style={styles.okText}><Ionicons name="checkmark-circle" /> {ok}</Text> : null}
      <View style={styles.chips}>
        <TouchableOpacity style={[styles.primary, { flex: 1 }]} onPress={save} accessibilityRole="button">
          <Text style={styles.primaryText}>{editing ? "Salvar alterações" : "Registrar"}</Text>
        </TouchableOpacity>
      </View>
      {editing ? (
        <View style={[styles.chips, { justifyContent: "center" }]}>
          <TouchableOpacity onPress={onDone} hitSlop={8}>
            <Text style={styles.link}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              if (!(await confirmAction("Excluir lançamento?", `"${editing.name}" sai da sua lista.`, "Excluir"))) return;
              ctx.removeTransaction(editing.id);
              onDone?.();
            }}
            hitSlop={8}
          >
            <Text style={[styles.link, styles.expenseText]}>Excluir</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function Entries({ onEdit }: { onEdit: () => void }) {
  const ctx = useContext(FinanceContext)!;
  const [editing, setEditing] = useState<Transaction | null>(null);
  // Últimos 3 meses, como no Squill
  const months = [0, 1, 2].map((i) => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - i, 1);
  });
  const [monthIndex, setMonthIndex] = useState(0);
  const ref = months[monthIndex];
  const list = ctx.transactions
    .filter((t) => monthKey(new Date(`${t.day}T12:00:00`)) === monthKey(ref))
    .sort((a, b) => (a.day === b.day ? b.createdAt - a.createdAt : a.day < b.day ? 1 : -1));
  const sum = totals(list);
  const noSpendToday = ctx.noSpendDays.includes(dayKey());

  return (
    <>
      <TransactionForm editing={editing} onDone={() => setEditing(null)} />

      {!editing ? (
        <TouchableOpacity
          style={[styles.secondary, noSpendToday && styles.disabled]}
          onPress={ctx.markNoSpendToday}
          disabled={noSpendToday}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}><Ionicons name={noSpendToday ? "checkmark-circle" : "happy-outline"} /> {noSpendToday ? "Hoje sem gastos" : "Hoje não gastei nada"}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.card}>
        <View style={styles.chips}>
          {months.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, monthIndex === i && styles.chipActive]}
              onPress={() => setMonthIndex(i)}
              accessibilityRole="radio"
              aria-checked={monthIndex === i}
            >
              <Text style={styles.chipText}>{m.toLocaleString("pt-BR", { month: "short" })}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.desc}>
          {monthName(ref)}: <Text style={styles.incomeText}>+{formatMoney(sum.income)}</Text> ·{" "}
          <Text style={styles.expenseText}>-{formatMoney(sum.expense)}</Text>
        </Text>
        {list.length === 0 ? (
          <Text style={styles.hint}>Nenhum lançamento neste mês.</Text>
        ) : (
          <Text style={styles.hint}>Toque num lançamento para editar ou excluir.</Text>
        )}
        {list.map((t) => (
          <TransactionRow
            key={t.id}
            t={t}
            onPress={() => {
              setEditing(t);
              onEdit();
            }}
          />
        ))}
      </View>
    </>
  );
}

// ---------- COFRINHOS (metas do Squill) ----------

function timeLeft(deadline: string) {
  const target = new Date(`${deadline}T23:59:59`);
  const days = Math.ceil((target.getTime() - Date.now()) / 86400000);
  if (days <= 0) return { days: 0, text: "Prazo encerrado" };
  const months = Math.floor(days / 30);
  const rest = days % 30;
  const parts = [];
  if (months) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
  if (rest) parts.push(`${rest} ${rest === 1 ? "dia" : "dias"}`);
  return { days, text: `Faltam ${parts.join(" e ")}` };
}

function Goals({ onEdit }: { onEdit: () => void }) {
  const ctx = useContext(FinanceContext)!;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [error, setError] = useState("");
  const [monthText, setMonthText] = useState(ctx.monthlySavings ? String(ctx.monthlySavings).replace(".", ",") : "");

  const ongoing = ctx.goals.filter((g) => goalSaved(g) < g.target);
  const done = ctx.goals.filter((g) => goalSaved(g) >= g.target);

  const openForm = (g: SavingsGoal | null) => {
    setEditing(g);
    setName(g?.name ?? "");
    setDescription(g?.description ?? "");
    setTarget(g ? String(g.target).replace(".", ",") : "");
    setDeadline(g ? showDay(g.deadline) : "");
    setColor(g?.color ?? GOAL_COLORS[0]);
    setError("");
    setShowForm(true);
    onEdit();
  };

  const save = () => {
    const value = parseMoney(target);
    const day = parseDay(deadline);
    if (!value) return setError("Digite quanto quer juntar (ex.: 300).");
    if (!day) return setError("Prazo inválido. Use dd/mm/aa.");
    const err = ctx.saveGoal({ name, description, target: value, deadline: day, color }, editing?.id);
    setError(err ?? "");
    if (!err) setShowForm(false);
  };

  const saveMonthGoal = () => {
    if (!monthText.trim()) return ctx.setMonthlySavings(null);
    const v = parseMoney(monthText);
    if (v) ctx.setMonthlySavings(v);
  };

  const monthPct = ctx.monthlySavings ? Math.min(100, (ctx.savedThisMonth / ctx.monthlySavings) * 100) : 0;

  return (
    <>
      {showForm ? (
        <View style={[styles.card, styles.editingCard]}>
          <Text style={styles.cardTitle}><Ionicons name={editing ? "create-outline" : "add-circle-outline"} /> {editing ? "Editar cofrinho" : "Novo cofrinho"}</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Nome (ex.: Fone novo)" placeholderTextColor="#9E94AB" style={styles.input} maxLength={40} />
          <TextInput value={description} onChangeText={setDescription} placeholder="Descrição (opcional)" placeholderTextColor="#9E94AB" style={styles.input} maxLength={120} />
          <View style={styles.chips}>
            <TextInput
              value={target}
              onChangeText={setTarget}
              placeholder="Valor-alvo (R$)"
              placeholderTextColor="#9E94AB"
              keyboardType="decimal-pad"
              style={[styles.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
            />
            <TextInput
              value={deadline}
              onChangeText={(t) => setDeadline(maskDate(t))}
              placeholder="Prazo dd/mm/aa"
              placeholderTextColor="#9E94AB"
              keyboardType="number-pad"
              maxLength={8}
              style={[styles.input, { width: 130, marginTop: 0, marginBottom: 0 }]}
            />
          </View>
          <View style={styles.chips}>
            {GOAL_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                accessibilityRole="radio"
                aria-checked={color === c}
                accessibilityLabel={`Cor ${c}`}
              />
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.primary} onPress={save}>
            <Text style={styles.primaryText}>Salvar</Text>
          </TouchableOpacity>
          <View style={[styles.chips, { justifyContent: "center" }]}>
            <TouchableOpacity onPress={() => setShowForm(false)} hitSlop={8}>
              <Text style={styles.link}>Cancelar</Text>
            </TouchableOpacity>
            {editing ? (
              <TouchableOpacity
                onPress={async () => {
                  if (!(await confirmAction("Excluir cofrinho?", `"${editing.name}" e o que foi guardado nele saem da lista.`, "Excluir"))) return;
                  ctx.removeGoal(editing.id);
                  setShowForm(false);
                }}
                hitSlop={8}
              >
                <Text style={[styles.link, styles.expenseText]}>Excluir</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.primary} onPress={() => openForm(null)} accessibilityRole="button">
          <Text style={styles.primaryText}><Ionicons name="add-circle-outline" /> Novo cofrinho</Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="calendar-outline" /> Meta de economia do mês</Text>
        <View style={styles.chips}>
          <TextInput
            value={monthText}
            onChangeText={setMonthText}
            onBlur={saveMonthGoal}
            onSubmitEditing={saveMonthGoal}
            placeholder="Quanto guardar no mês (R$)"
            placeholderTextColor="#9E94AB"
            keyboardType="decimal-pad"
            style={[styles.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
          />
          <TouchableOpacity style={styles.smallButton} onPress={saveMonthGoal}>
            <Text style={styles.smallButtonText}>Salvar</Text>
          </TouchableOpacity>
        </View>
        {ctx.monthlySavings ? (
          <>
            <Text style={styles.desc}>
              Guardado em {monthName(new Date())}: {formatMoney(ctx.savedThisMonth)} de {formatMoney(ctx.monthlySavings)}
              {monthPct >= 100 ? " · batida" : ""}
            </Text>
            <View style={styles.bar}>
              <View style={[styles.barFill, styles.barSave, { width: `${monthPct}%` }]} />
            </View>
          </>
        ) : (
          <Text style={styles.hint}>O que você guardar nos cofrinhos conta para essa meta.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="trending-up-outline" /> Quanto você guardou (6 meses)</Text>
        <SavedChart goals={ctx.goals} />
      </View>

      {ongoing.length === 0 && done.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.hint}>Você ainda não tem cofrinhos. Crie um para juntar dinheiro para algo.</Text>
        </View>
      ) : null}

      {ongoing.map((g) => (
        <GoalCard key={g.id} goal={g} onEdit={() => openForm(g)} />
      ))}

      {done.length > 0 ? <Text style={styles.sectionTitle}><Ionicons name="trophy-outline" /> Concluídos</Text> : null}
      {done.map((g) => (
        <GoalCard key={g.id} goal={g} onEdit={() => openForm(g)} />
      ))}
    </>
  );
}

function GoalCard({ goal, onEdit }: { goal: SavingsGoal; onEdit: () => void }) {
  const ctx = useContext(FinanceContext)!;
  const saved = goalSaved(goal);
  const pct = Math.min(100, (saved / goal.target) * 100);
  const finished = saved >= goal.target;
  const left = timeLeft(goal.deadline);
  const missing = Math.max(0, goal.target - saved);
  const [mode, setMode] = useState<"mes" | "dia">("mes");
  const perTime = mode === "mes" ? missing / Math.max(1, left.days / 30) : missing / Math.max(1, left.days);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  // Barra animada e entrada "pop" (como no Squill)
  const [width] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(width, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct, width]);
  useEffect(() => {
    Animated.timing(pop, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [pop]);

  const add = () => {
    const v = parseMoney(value);
    if (!v) return;
    ctx.deposit(goal.id, v);
    setValue("");
    setAdding(false);
  };

  return (
    <Animated.View
      style={[
        styles.goalCard,
        { backgroundColor: goal.color, opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
      ]}
    >
      {finished ? <Text style={styles.doneBadge}>META CONCLUÍDA</Text> : null}
      <View style={styles.rowBetween}>
        <Text style={styles.goalTitle} numberOfLines={1}>
          {goal.name}
        </Text>
        <View style={styles.chips}>
          {!finished ? (
            <TouchableOpacity onPress={() => setAdding((a) => !a)} style={styles.goalButton} accessibilityLabel="Guardar valor">
              <Text style={styles.goalButtonText}>＋ Guardar</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onEdit} style={styles.goalButton} accessibilityLabel="Editar cofrinho">
            <Ionicons name="create-outline" style={styles.goalButtonText} />
          </TouchableOpacity>
        </View>
      </View>
      {!finished ? <Text style={styles.goalMeta}>{left.text}</Text> : null}
      {goal.description ? <Text style={styles.goalMeta}>{goal.description}</Text> : null}
      {!finished && left.days > 0 ? (
        <TouchableOpacity onPress={() => setMode(mode === "mes" ? "dia" : "mes")} accessibilityRole="button">
          <Text style={styles.goalMeta}>
            Guarde {formatMoney(perTime)} por {mode === "mes" ? "mês" : "dia"} <Ionicons name="swap-horizontal" />
          </Text>
        </TouchableOpacity>
      ) : null}
      <View style={styles.goalBar}>
        <Animated.View
          style={[styles.goalFill, { width: width.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]}
        />
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.goalMeta}>{formatMoney(saved)}</Text>
        <Text style={styles.goalMeta}>{formatMoney(goal.target)}</Text>
      </View>
      {adding ? (
        <View style={styles.chips}>
          <TextInput
            value={value}
            onChangeText={setValue}
            onSubmitEditing={add}
            placeholder="Quanto guardou? (R$)"
            placeholderTextColor="#DDD6FE"
            keyboardType="decimal-pad"
            style={[styles.input, styles.goalInput]}
            autoFocus
          />
          <TouchableOpacity style={styles.goalButton} onPress={add}>
            <Text style={styles.goalButtonText}>Adicionar</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </Animated.View>
  );
}

// ---------- APRENDER (educação financeira do Squill) ----------

function Learn() {
  const ctx = useContext(FinanceContext)!;
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <Text style={styles.hint}>Leia um texto para cumprir “Aprender algo sobre finanças”.</Text>
      {ARTICLES.map((a) => {
        const isOpen = open === a.id;
        const read = ctx.readArticles.includes(a.id);
        return (
          <View key={a.id} style={styles.card}>
            <TouchableOpacity
              onPress={() => {
                setOpen(isOpen ? null : a.id);
                if (!isOpen) ctx.markArticleRead(a.id);
              }}
              accessibilityRole="button"
              aria-expanded={isOpen}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.cardTitle, { flex: 1 }]}><Ionicons name="book-outline" /> {a.title}</Text>
                <Text style={styles.hint}>{read ? <><Ionicons name="checkmark" /> lido</> : isOpen ? <Ionicons name="chevron-up" /> : <><Ionicons name="chevron-down" /> ler</>}</Text>
              </View>
              <Text style={styles.desc}>{a.description}</Text>
            </TouchableOpacity>
            {isOpen
              ? a.topics.map((t) => (
                  <View key={t.subtitle} style={styles.topic}>
                    <Text style={styles.topicTitle}>{t.subtitle}</Text>
                    <Text style={styles.topicText}>{t.content}</Text>
                  </View>
                ))
              : null}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  content: { padding: 15, paddingBottom: 110 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  back: { color: "#FFF", fontSize: 25 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "600" },

  tabs: { flexDirection: "row", backgroundColor: "#25193A", borderRadius: 8, padding: 4, marginBottom: 10 },
  // Largura pelo texto: "Lançamentos" cabe inteiro em telas de 320 px
  activeTab: { flexGrow: 1, backgroundColor: "#5B21B6", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 6, alignItems: "center" },
  tab: { flexGrow: 1, paddingVertical: 8, paddingHorizontal: 6, alignItems: "center" },
  tabText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

  card: { backgroundColor: "#25193A", borderRadius: 10, padding: 12, marginBottom: 12 },
  editingCard: { borderWidth: 1, borderColor: "#A78BFA" },
  cardTitle: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  subTitle: { color: "#FFF", fontSize: 13, fontWeight: "600", marginTop: 14, marginBottom: 4 },
  sectionTitle: { color: "#FFF", fontSize: 16, fontWeight: "700", marginBottom: 8, marginTop: 4 },
  desc: { color: "#DDD6FE", fontSize: 13, marginTop: 6, lineHeight: 18 },
  hint: { color: "#C7BADB", fontSize: 12, marginTop: 6, lineHeight: 17 },
  warnText: { color: "#FCD34D" },
  note: { color: "#C7BADB", fontSize: 11, textAlign: "center", marginTop: 8, lineHeight: 16 },
  error: { color: "#FCA5A5", fontSize: 13, marginTop: 8 },
  okText: { color: "#86EFAC", fontSize: 13, marginTop: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" },
  chip: { borderRadius: 14, borderWidth: 1, borderColor: "#5B21B6", paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: "#5B21B6", borderColor: "#A78BFA" },
  chipExpense: { backgroundColor: "#BE185D", borderColor: "#F472B6" },
  chipIncome: { backgroundColor: "#15803D", borderColor: "#36D35B" },
  chipText: { color: "#FFF", fontSize: 13 },
  catChip: { borderRadius: 12, borderWidth: 1, borderColor: "#57356F", paddingHorizontal: 9, paddingVertical: 5 },

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
    marginBottom: 0,
  },

  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 12,
    minHeight: 46,
  },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  secondary: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A78BFA",
    paddingVertical: 11,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  smallButton: {
    alignSelf: "flex-start",
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 8,
  },
  smallButtonText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  link: { color: "#DDD6FE", fontSize: 13, textDecorationLine: "underline" },
  toggle: { borderRadius: 12, borderWidth: 1, borderColor: "#5B21B6", paddingHorizontal: 10, paddingVertical: 4 },
  toggleText: { color: "#FFF", fontSize: 12 },

  totalsRow: { flexDirection: "row", gap: 10, marginTop: 10, marginBottom: 10 },
  totalCard: { flex: 1, borderRadius: 10, padding: 12 },
  totalIncome: { backgroundColor: "#15803D" },
  totalExpense: { backgroundColor: "#9D174D" },
  totalLabel: { color: "#FFF", fontSize: 12, opacity: 0.9 },
  totalValue: { color: "#FFF", fontSize: 18, fontWeight: "700", marginTop: 4 },
  balance: { color: "#B83CE5", fontSize: 26, fontWeight: "700", marginTop: 4 },
  negative: { color: "#FCA5A5" },
  incomeText: { color: "#86EFAC" },
  expenseText: { color: "#F9A8D4" },

  barChart: { flexDirection: "row", alignItems: "flex-end", height: 130, marginTop: 12, gap: 2 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  barItem: { width: "70%", maxWidth: 26, backgroundColor: "#B832E5", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barIncome: { backgroundColor: "#22C55E" },
  barToday: { borderWidth: 1, borderColor: "#FFF" },
  barActive: { backgroundColor: "#F0ABFC" },
  barLabel: { color: "#9E94AB", fontSize: 10, marginTop: 4, height: 13 },

  catRow: { paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8 },
  catRowActive: { backgroundColor: "rgba(255,255,255,0.06)" },
  catLabel: { color: "#FFF", fontSize: 13, flexShrink: 1 },
  catValue: { color: "#DDD6FE", fontSize: 12 },
  catBar: { height: 7, backgroundColor: "#57356F", borderRadius: 7, marginTop: 5, overflow: "hidden" },
  catFill: { height: "100%", borderRadius: 7 },

  bar: { height: 8, backgroundColor: "#57356F", borderRadius: 8, marginTop: 8, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#B832E5" },
  barWarn: { backgroundColor: "#F59E0B" },
  barDanger: { backgroundColor: "#EF4444" },
  barSave: { backgroundColor: "#22C55E" },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  txIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  txName: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  txMeta: { color: "#9E94AB", fontSize: 11, marginTop: 1 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  txEdit: { fontSize: 12, opacity: 0.8 },

  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "transparent" },
  colorDotActive: { borderColor: "#FFF" },

  goalCard: { borderRadius: 12, padding: 12, marginBottom: 12 },
  goalTitle: { color: "#FFF", fontSize: 16, fontWeight: "700", flexShrink: 1 },
  goalMeta: { color: "#FFF", fontSize: 13, marginTop: 4, opacity: 0.95 },
  goalButton: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  goalButtonText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  goalBar: { height: 14, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 10, overflow: "hidden", marginTop: 8 },
  goalFill: { height: "100%", backgroundColor: "#FFF" },
  goalInput: { flex: 1, marginTop: 0, backgroundColor: "rgba(0,0,0,0.2)" },
  doneBadge: {
    alignSelf: "center",
    color: "#1E1B4B",
    backgroundColor: "#FCD34D",
    fontSize: 11,
    fontWeight: "800",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 6,
    overflow: "hidden",
  },

  topic: { marginTop: 10, borderLeftWidth: 3, borderLeftColor: "#B832E5", paddingLeft: 10 },
  topicTitle: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  topicText: { color: "#DDD6FE", fontSize: 13, marginTop: 3, lineHeight: 18 },
});
