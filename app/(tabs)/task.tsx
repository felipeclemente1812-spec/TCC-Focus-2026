import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CATALOG_BY_ID,
  CATEGORY_BY_ID,
  FREQUENCY_LABEL,
} from "@/constants/challenges";
import { dayKey, monthKey, weekKey, XP_BY_FREQUENCY } from "@/constants/gamification";
import { EDITABLE_KINDS, featureOf, isAutoTask, TaskModule } from "@/constants/taskFeatures";
import { EXPENSE_CATEGORIES, formatMoney, parseMoney } from "@/constants/finance";
import { BooksContext } from "@/context/BooksContext";
import { accentOf, DIARY_MIN_CHARS, DiaryContext } from "@/context/DiaryContext";
import { FinanceContext, inPeriod, totals } from "@/context/FinanceContext";
import { DAY_SHORT, WEEK_ORDER } from "@/context/HabitsContext";
import { AlarmCard, StepsCard } from "@/components/DeviceModules";
import { QuickSave, SavedChart, WeekMiniChart } from "@/components/FinanceWidgets";
import { PlannerModule } from "@/components/PlannerModules";
import { ZoomablePhoto } from "@/components/PhotoViewer";
import { RoutineContext } from "@/context/RoutineContext";
import { confirmAction } from "@/utils/feedback";
import { openDoNotDisturb } from "@/utils/focusMode";
import { PHOTO_QUALITY } from "@/utils/files";
import {
  Attachment,
  Entry,
  Flashcard,
  sleepHours,
  TaskExtrasContext,
  TIME_RE,
  timerMinutes,
  topWords,
} from "@/context/TaskExtrasContext";

// Detalhe de um desafio da rotina: lembrete + o que a lista do grupo pediu
// para ele (cronômetro, anotações, gratidões, flashcards, pessoas etc.)

const pad = (n: number) => String(n).padStart(2, "0");

// Apagar sempre passa pela telinha de confirmação
const askRemove = async (title: string, remove: () => void) => {
  if (await confirmAction(title, "Isso não pode ser desfeito.", "Apagar")) remove();
};
const formatClock = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};
const formatDateTime = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const formatDay = (day: string) => {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
};
// "dd/mm" -> "aaaa-mm-dd" (ano atual)
const parseDue = (text: string) => {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const d = Number(match[1]);
  const m = Number(match[2]);
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;
  return `${new Date().getFullYear()}-${pad(m)}-${pad(d)}`;
};
const maskTime = (t: string) => {
  const digits = t.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

export default function TaskDetail() {
  const { id, edit } = useLocalSearchParams<{ id?: string; edit?: string }>();
  const taskId = typeof id === "string" ? id : "";
  // Veio do lápis em Desafios: rola até o que foi salvo
  const editMode = edit === "1";
  const scrollRef = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  const scrollToEditable = (y: number) => {
    if (!editMode || scrolled.current) return;
    scrolled.current = true;
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - 10), animated: true }), 50);
  };
  const extras = useContext(TaskExtrasContext);
  const routine = useContext(RoutineContext);
  const [banner, setBanner] = useState("");

  const item = CATALOG_BY_ID[taskId];
  const task = routine?.tasks.find((t) => t.id === taskId);
  const done = !!task && !!routine?.isDone(task);

  // Aviso quando a tarefa é concluída nesta tela
  const [wasDone, setWasDone] = useState(done);
  useEffect(() => {
    if (done && !wasDone) setBanner(`Desafio concluído! +${task?.xp ?? 0} XP`);
    setWasDone(done);
  }, [done, wasDone, task?.xp]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(""), 3500);
    return () => clearTimeout(t);
  }, [banner]);

  if (!extras || !routine) throw new Error("Contexto não encontrado");

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/challenges"));

  if (!item) {
    return (
      <Screen title="Desafio" onBack={goBack} scrollRef={scrollRef}>
        <Text style={styles.muted}>Desafio não encontrado.</Text>
      </Screen>
    );
  }

  const feature = featureOf(taskId);
  const auto = isAutoTask(taskId);
  const category = CATEGORY_BY_ID[item.category];

  return (
    <Screen title={task?.title ?? item.title} onBack={goBack} scrollRef={scrollRef}>
      <View style={styles.card}>
        <Text style={styles.meta}>
          <Ionicons name={category.icon} /> {category.label} · {FREQUENCY_LABEL[item.frequency]} · +{XP_BY_FREQUENCY[item.frequency]} XP
        </Text>
        <Text style={styles.desc}>{task?.description ?? item.description}</Text>
        {task ? <CustomizeBox taskId={taskId} title={task.title} description={task.description} customized={task.customized} original={item.title} /> : null}
        {!task ? (
          <Text style={styles.warn}>Esse desafio não está na sua rotina. Adicione em Minha rotina.</Text>
        ) : done ? (
          <Text style={styles.doneBadge}><Ionicons name="checkmark" /> feito neste período</Text>
        ) : null}
      </View>

      {banner ? (
        <View style={styles.banner} accessibilityLiveRegion="polite">
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}

      <ReminderCard taskId={taskId} weekly={item.frequency !== "daily"} />

      {feature.modules.map((m, i) => (
        <View
          key={`${m.kind}-${i}`}
          onLayout={
            EDITABLE_KINDS.includes(m.kind) ? (e) => scrollToEditable(e.nativeEvent.layout.y) : undefined
          }
        >
          {editMode && EDITABLE_KINDS.includes(m.kind) ? (
            <View style={styles.editHint}>
              <Text style={styles.editHintText}>
                <Ionicons name="create-outline" /> Toque num item salvo (“ver”) e depois em “Editar” para alterar.
              </Text>
            </View>
          ) : null}
          <ModuleView taskId={taskId} module={m} />
        </View>
      ))}

      {/* Semanais e mensais não têm checkbox solto (anti-farm de XP) */}
      {task && !auto && item.frequency === "daily" ? (
        <TouchableOpacity
          style={[styles.primary, done && styles.disabled]}
          onPress={() => extras.complete(taskId)}
          disabled={done}
          accessibilityRole="checkbox"
          aria-checked={done}
        >
          <Text style={styles.primaryText}>{done ? "Feito" : "Marcar como feito"}</Text>
        </TouchableOpacity>
      ) : task ? (
        <Text style={styles.note}>
          {auto
            ? "Esse desafio é marcado sozinho quando você cumpre o que está acima."
            : "Semanais e mensais concluem pelo registro acima, não por um clique."}
        </Text>
      ) : null}
    </Screen>
  );
}

function Screen({
  title,
  onBack,
  scrollRef,
  children,
}: {
  title: string;
  onBack: () => void;
  scrollRef: React.RefObject<ScrollView | null>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <ScrollView keyboardDismissMode="on-drag" ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" style={styles.back} />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <View style={{ width: 25 }} />
          </View>
          {children}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

// ---------- Ajustar um desafio pronto (como os hábitos criados) ----------

function CustomizeBox({
  taskId,
  title,
  description,
  customized,
  original,
}: {
  taskId: string;
  title: string;
  description: string;
  customized: boolean;
  original: string;
}) {
  const routine = useContext(RoutineContext)!;
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [newDesc, setNewDesc] = useState(description);
  const [error, setError] = useState("");

  if (!open) {
    return (
      <TouchableOpacity onPress={() => setOpen(true)} style={{ marginTop: 8 }} accessibilityRole="button">
        <Text style={styles.link}>
          <Ionicons name="options-outline" /> Ajustar nome e descrição{customized ? ` (original: ${original})` : ""}
        </Text>
      </TouchableOpacity>
    );
  }
  const save = () => {
    const err = routine.customizeTask(taskId, { title: newTitle, description: newDesc });
    setError(err ?? "");
    if (!err) setOpen(false);
  };
  return (
    <View style={{ marginTop: 8 }}>
      <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="Nome" placeholderTextColor="#9E94AB" maxLength={50} />
      <TextInput style={styles.input} value={newDesc} onChangeText={setNewDesc} placeholder="Descrição" placeholderTextColor="#9E94AB" maxLength={140} multiline />
      <View style={[styles.chips, { marginTop: 0 }]}>
        <TouchableOpacity style={styles.smallButton} onPress={save}>
          <Text style={styles.smallButtonText}>Salvar</Text>
        </TouchableOpacity>
        {customized ? (
          <TouchableOpacity
            onPress={() => {
              routine.resetTask(taskId);
              setOpen(false);
            }}
            style={{ marginTop: 8 }}
          >
            <Text style={styles.link}>Voltar ao original</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => setOpen(false)} style={{ marginTop: 8 }}>
          <Text style={styles.link}>Cancelar</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.hint}>O XP e a forma de concluir continuam os mesmos do desafio.</Text>
    </View>
  );
}

// ---------- Lembrete ----------

function ReminderCard({ taskId, weekly }: { taskId: string; weekly: boolean }) {
  if (weekly) return <GoalsReminderCard />;
  return <DailyReminderCard taskId={taskId} />;
}

// Semanais e mensais não tocam uma a uma: vão no "reveja seus objetivos"
function GoalsReminderCard() {
  const extras = useContext(TaskExtrasContext)!;
  const g = extras.digest;
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}><Ionicons name="notifications-outline" /> Lembrete</Text>
        <Text style={styles.meta}>{g.on ? `${DAY_SHORT[g.weeklyDay]} · ${g.weeklyTime}` : "Desligado"}</Text>
      </View>
      <Text style={styles.hint}>
        Tarefas semanais e mensais não aparecem uma a uma na barra de notificações. Você recebe o lembrete
        “Reveja seus objetivos” no dia escolhido{g.monthly ? " e, no mês, nos dias 1 e 20" : ""}.
      </Text>
      <TouchableOpacity onPress={() => router.push("/reminders")} style={styles.smallButton} accessibilityRole="button">
        <Text style={styles.smallButtonText}>Abrir Central de lembretes</Text>
      </TouchableOpacity>
    </View>
  );
}

function DailyReminderCard({ taskId }: { taskId: string }) {
  const weekly = false;
  const extras = useContext(TaskExtrasContext)!;
  const setting = extras.reminders[taskId];
  const fromSleep = featureOf(taskId).reminder === "sleep";
  const current = extras.reminderTime(taskId);
  const [time, setTime] = useState(setting?.time ?? current ?? "");
  const [weekday, setWeekday] = useState<number | undefined>(setting?.weekday ?? (weekly ? 1 : undefined));
  const [error, setError] = useState("");
  const on = !!setting?.on;

  const save = async (nextOn: boolean) => {
    const value = fromSleep ? current ?? "" : time;
    if (fromSleep && !current) {
      setError("Configure “Meu sono” abaixo primeiro.");
      return;
    }
    const err = await extras.setReminder(taskId, { on: nextOn, time: value, weekday: weekly ? weekday : undefined });
    setError(err ?? "");
  };

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}><Ionicons name="notifications-outline" /> Lembrete</Text>
        <TouchableOpacity
          style={[styles.toggle, on && styles.toggleOn]}
          onPress={() => save(!on)}
          accessibilityRole="switch"
          aria-checked={on}
          accessibilityLabel="Lembrete ligado"
        >
          <Text style={styles.toggleText}>{on ? "Ligado" : "Desligado"}</Text>
        </TouchableOpacity>
      </View>

      {fromSleep ? (
        <Text style={styles.hint}>
          {current ? `Horário calculado pelo seu sono: ${current}` : "O horário vem de “Meu sono” (abaixo)."}
        </Text>
      ) : (
        <>
          {weekly ? (
            <View style={styles.chips}>
              {WEEK_ORDER.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chipSmall, weekday === d && styles.chipActive]}
                  onPress={() => setWeekday(d)}
                  accessibilityRole="radio"
                  aria-checked={weekday === d}
                >
                  <Text style={styles.chipText}>{DAY_SHORT[d]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <View style={[styles.chips, { marginTop: 8 }]}>
            <TextInput
              value={time}
              onChangeText={(t) => setTime(maskTime(t))}
              placeholder="19:00"
              placeholderTextColor="#9E94AB"
              keyboardType="number-pad"
              maxLength={5}
              style={styles.timeInput}
              accessibilityLabel="Horário do lembrete"
            />
            <TouchableOpacity onPress={() => save(true)} style={styles.smallButton} accessibilityRole="button">
              <Text style={styles.smallButtonText}>Salvar horário</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.hint}>
        {Platform.OS === "web"
          ? "No navegador, o aviso só aparece com o Focus aberto. No celular chega mesmo com o app fechado."
          : "O aviso chega no horário, mesmo com o app fechado."}
      </Text>
    </View>
  );
}

// ---------- Ver e editar depois de feito ----------

// Anotação/resumo/gratidão: toque para abrir inteira, editar ou apagar
function EditableEntry({
  entry,
  withTitle,
  titlePlaceholder = "Título",
  children,
}: {
  entry: Entry;
  withTitle?: boolean;
  titlePlaceholder?: string;
  children?: React.ReactNode; // extra mostrado aberto (ex.: flashcards do resumo)
}) {
  const extras = useContext(TaskExtrasContext)!;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [text, setText] = useState(entry.text);
  const [error, setError] = useState("");

  const startEdit = () => {
    setTitle(entry.title);
    setText(entry.text);
    setError("");
    setEditing(true);
  };

  const save = () => {
    const err = extras.updateEntry(entry.id, title, text);
    setError(err ?? "");
    if (!err) setEditing(false);
  };

  return (
    <View style={[styles.entry, open && styles.entryOpen]}>
      <TouchableOpacity
        onPress={() => !editing && setOpen((o) => !o)}
        activeOpacity={0.8}
        accessibilityRole="button"
        aria-expanded={open}
        accessibilityLabel={`${entry.title || entry.text.slice(0, 30)}. ${open ? "Fechar" : "Abrir para ver ou editar"}`}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.entryDate}>
            {formatDateTime(entry.at)}
            {entry.editedAt ? " · editado" : ""}
          </Text>
          <Text style={styles.entryDate}>{open ? <Ionicons name="chevron-up" /> : <><Ionicons name="chevron-down" /> ver</>}</Text>
        </View>
        {!editing && entry.title ? <Text style={styles.entryTitle}>{entry.title}</Text> : null}
        {!editing ? (
          <Text style={styles.entryText} numberOfLines={open ? undefined : 2}>
            {entry.text}
          </Text>
        ) : null}
      </TouchableOpacity>

      {editing ? (
        <>
          {withTitle ? (
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={titlePlaceholder}
              placeholderTextColor="#9E94AB"
              style={styles.input}
              maxLength={120}
            />
          ) : null}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholderTextColor="#9E94AB"
            style={[styles.input, withTitle && styles.textArea]}
            multiline={withTitle}
            maxLength={4000}
            accessibilityLabel="Editar texto"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.chips}>
            <TouchableOpacity style={[styles.smallButton, { marginTop: 0 }]} onPress={save}>
              <Text style={styles.smallButtonText}>Salvar alterações</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(false)} hitSlop={8}>
              <Text style={styles.link}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : open ? (
        <View style={styles.chips}>
          <TouchableOpacity style={[styles.smallButton, { marginTop: 0 }]} onPress={startEdit}>
            <Text style={styles.smallButtonText}><Ionicons name="create-outline" /> Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => askRemove("Apagar anotação?", () => extras.removeEntry(entry.id))} hitSlop={8}>
            <Text style={styles.link}>Apagar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {open && !editing ? children : null}
    </View>
  );
}

// Flashcard: toque para ver a resposta, editar ou apagar
function EditableCard({ card }: { card: Flashcard }) {
  const extras = useContext(TaskExtrasContext)!;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [error, setError] = useState("");

  const startEdit = () => {
    setFront(card.front);
    setBack(card.back);
    setError("");
    setEditing(true);
  };

  const save = () => {
    const err = extras.updateCard(card.id, front, back);
    setError(err ?? "");
    if (!err) setEditing(false);
  };

  return (
    <View style={[styles.entry, open && styles.entryOpen]}>
      {editing ? (
        <>
          <TextInput
            value={front}
            onChangeText={setFront}
            placeholder="Pergunta"
            placeholderTextColor="#9E94AB"
            style={styles.input}
            maxLength={300}
            accessibilityLabel="Editar pergunta"
          />
          <TextInput
            value={back}
            onChangeText={setBack}
            placeholder="Resposta"
            placeholderTextColor="#9E94AB"
            style={styles.input}
            maxLength={600}
            accessibilityLabel="Editar resposta"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.chips}>
            <TouchableOpacity style={[styles.smallButton, { marginTop: 0 }]} onPress={save}>
              <Text style={styles.smallButtonText}>Salvar alterações</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(false)} hitSlop={8}>
              <Text style={styles.link}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <TouchableOpacity
            onPress={() => setOpen((o) => !o)}
            activeOpacity={0.8}
            accessibilityRole="button"
            aria-expanded={open}
            accessibilityLabel={`${card.front}. ${open ? "Fechar" : "Ver resposta ou editar"}`}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.entryTitle, { flex: 1 }]}><Ionicons name="albums-outline" /> {card.front}</Text>
              <Text style={styles.entryDate}>{open ? <Ionicons name="chevron-up" /> : <><Ionicons name="chevron-down" /> ver</>}</Text>
            </View>
            {open ? <Text style={styles.entryText}><Ionicons name="return-down-forward" /> {card.back}</Text> : null}
            {open && card.editedAt ? <Text style={styles.entryDate}>editado em {formatDateTime(card.editedAt)}</Text> : null}
          </TouchableOpacity>
          {open ? (
            <View style={styles.chips}>
              <TouchableOpacity style={[styles.smallButton, { marginTop: 0 }]} onPress={startEdit}>
                <Text style={styles.smallButtonText}><Ionicons name="create-outline" /> Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => askRemove("Apagar flashcard?", () => extras.removeCard(card.id))} hitSlop={8}>
                <Text style={styles.link}>Apagar</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

// ---------- Blocos ----------

function ModuleView({ taskId, module }: { taskId: string; module: TaskModule }) {
  switch (module.kind) {
    case "timer":
      return <TimerCard taskId={taskId} label={module.label} />;
    case "books":
      return <BooksCard pages={module.mode === "pages" ? module.pages : null} />;
    case "journal":
      return <JournalCard taskId={taskId} titleLabel={module.titleLabel} placeholder={module.placeholder} />;
    case "gratitude":
      return <GratitudeCard taskId={taskId} count={module.count} />;
    case "summary":
      return <SummaryCard taskId={taskId} />;
    case "flashcards":
      return <FlashcardsCard />;
    case "people":
      return <PeopleCard taskId={taskId} verb={module.verb} />;
    case "todo3":
      return <TodoCard />;
    case "backlog":
      return <BacklogCard />;
    case "sleep":
      return <SleepCard mode={module.mode} />;
    case "metric":
      return <MetricCard taskId={taskId} label={module.label} unit={module.unit} goal={module.goal} atMost={module.atMost} />;
    case "focusMode":
      return <FocusModeCard />;
    case "attachments":
      return <AttachmentsCard taskId={taskId} accept={module.accept} />;
    case "finance":
      return <FinanceCard tab={module.tab} />;
    case "planner":
      return <PlannerModule taskId={taskId} view={module.view} />;
    case "alarm":
      return <AlarmCard />;
    case "steps":
      return <StepsCard taskId={taskId} goal={module.goal} />;
    case "diary":
      return <DiaryCard />;
    case "soon":
      return (
        <View style={[styles.card, styles.soonCard]}>
          <Text style={styles.hint}><Ionicons name="construct-outline" /> {module.text}</Text>
        </View>
      );
  }
}

// Diário (telas da Angela): status de hoje + últimas anotações
function DiaryCard() {
  const diary = useContext(DiaryContext);
  if (!diary) return null;
  const recent = diary.entries.slice(0, 3);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="book-outline" /> Meu diário</Text>
      <Text style={styles.desc}>
        {diary.wroteToday
          ? "Você já escreveu hoje."
          : `Escreva como foi seu dia, com pelo menos ${DIARY_MIN_CHARS} letras, para concluir.`}
      </Text>
      <View style={styles.chips}>
        <TouchableOpacity style={styles.smallButton} onPress={() => router.push("/diary-entry")}>
          <Text style={styles.smallButtonText}><Ionicons name="create-outline" /> Escrever agora</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallButton, styles.outlineButton]} onPress={() => router.push("/diary")}>
          <Text style={styles.smallButtonText}>Abrir o diário ({diary.entries.length})</Text>
        </TouchableOpacity>
      </View>
      {recent.length > 0 ? <Text style={styles.subTitle}>Últimas anotações</Text> : null}
      {recent.map((e) => (
        <TouchableOpacity
          key={e.id}
          style={[styles.diaryRow, { borderLeftColor: accentOf(e.color) }]}
          onPress={() => router.push({ pathname: "/diary-entry", params: { id: e.id, mode: "view" } })}
        >
          <Text style={styles.diaryTitle} numberOfLines={1}>{e.title || "Sem título"}</Text>
          <Text style={styles.diaryDate}>{new Date(e.createdAt).toLocaleDateString("pt-BR")}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function TimerCard({ taskId, label }: { taskId: string; label: string }) {
  const extras = useContext(TaskExtrasContext)!;
  const minutes = timerMinutes(taskId) ?? 0;
  const elapsed = extras.timerElapsed(taskId);
  const target = minutes * 60000;
  const running = !!extras.timers[taskId]?.startedAt && extras.timers[taskId]?.day === extras.today;
  const pct = Math.min(100, Math.round((elapsed / target) * 100));

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="stopwatch-outline" /> {label}</Text>
      <Text style={styles.clock}>
        {formatClock(Math.min(elapsed, target))} <Text style={styles.clockGoal}>/ {formatClock(target)}</Text>
      </Text>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <View style={[styles.chips, { marginTop: 10 }]}>
        {pct >= 100 ? (
          <Text style={styles.doneBadge}><Ionicons name="checkmark" /> meta de {minutes} min cumprida</Text>
        ) : running ? (
          <TouchableOpacity style={styles.smallButton} onPress={() => extras.pauseTimer(taskId)}>
            <Text style={styles.smallButtonText}>Pausar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.smallButton} onPress={() => extras.startTimer(taskId)}>
            <Text style={styles.smallButtonText}>{elapsed > 0 ? "Continuar" : "Iniciar"}</Text>
          </TouchableOpacity>
        )}
        {elapsed > 0 && pct < 100 ? (
          <TouchableOpacity onPress={() => extras.resetTimer(taskId)} hitSlop={8}>
            <Text style={styles.link}>Zerar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.hint}>
        No celular, a contagem fica na barra de notificações e avisa quando terminar. O tempo continua contando mesmo
        se você sair desta tela.
      </Text>
    </View>
  );
}

function BooksCard({ pages }: { pages: number | null }) {
  const books = useContext(BooksContext);
  const reading = books?.books.filter((b) => b.status === "lendo") ?? [];
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="library-outline" /> Minha Estante</Text>
      {pages ? (
        <>
          <Text style={styles.desc}>
            Hoje: {books?.pagesToday ?? 0} de {pages} páginas
          </Text>
          <View style={styles.bar}>
            <View
              style={[styles.barFill, { width: `${Math.min(100, ((books?.pagesToday ?? 0) / pages) * 100)}%` }]}
            />
          </View>
          <Text style={styles.hint}>Registre as páginas no livro; ao chegar em {pages} o desafio é marcado.</Text>
        </>
      ) : (
        <Text style={styles.hint}>Use o cronômetro acima e depois registre as páginas que leu no livro.</Text>
      )}
      {reading.length > 0 ? (
        <Text style={styles.hint}>Lendo agora: {reading.map((b) => b.title).join(", ")}</Text>
      ) : null}
      <TouchableOpacity style={styles.smallButton} onPress={() => router.push("/bookshelf")}>
        <Text style={styles.smallButtonText}>Abrir Minha Estante</Text>
      </TouchableOpacity>
    </View>
  );
}

function JournalCard({ taskId, titleLabel, placeholder }: { taskId: string; titleLabel?: string; placeholder: string }) {
  const extras = useContext(TaskExtrasContext)!;
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const list = extras.entriesOf(taskId);

  const save = () => {
    const err = extras.addEntry(taskId, title, text);
    setError(err ?? "");
    if (!err) {
      setTitle("");
      setText("");
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="create-outline" /> Anotações</Text>
      {titleLabel ? (
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={titleLabel}
          placeholderTextColor="#9E94AB"
          style={styles.input}
          maxLength={120}
        />
      ) : null}
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor="#9E94AB"
        style={[styles.input, styles.textArea]}
        multiline
        maxLength={4000}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.smallButton} onPress={save}>
        <Text style={styles.smallButtonText}>Salvar (data e hora automáticas)</Text>
      </TouchableOpacity>
      {list.length > 0 ? (
        <Text style={styles.subTitle}>Histórico ({list.length}) · toque para ver ou editar</Text>
      ) : null}
      {list.slice(0, 20).map((e) => (
        <EditableEntry key={e.id} entry={e} withTitle titlePlaceholder={titleLabel} />
      ))}
    </View>
  );
}

function GratitudeCard({ taskId, count }: { taskId: string; count: number }) {
  const extras = useContext(TaskExtrasContext)!;
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const todayList = [...extras.entriesOf(taskId, extras.today)].reverse(); // ordem em que escreveu
  const month = monthKey();
  const monthTexts = extras
    .entriesOf(taskId)
    .filter((e) => monthKey(new Date(e.at)) === month)
    .map((e) => e.text);
  const top = topWords(monthTexts);
  const history = extras.entriesOf(taskId).filter((e) => dayKey(new Date(e.at)) !== extras.today);

  const add = () => {
    const err = extras.addEntry(taskId, "", text);
    setError(err ?? "");
    if (!err) setText("");
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        <Ionicons name="heart-outline" /> Gratidões de hoje ({Math.min(todayList.length, count)}/{count})
      </Text>
      {todayList.map((e) => (
        <EditableEntry key={e.id} entry={e} />
      ))}
      <View style={[styles.chips, { marginTop: 8 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={add}
          placeholder="Sou grato(a) por…"
          placeholderTextColor="#9E94AB"
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          maxLength={200}
        />
        <TouchableOpacity style={styles.smallButton} onPress={add}>
          <Text style={styles.smallButtonText}>Adicionar</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.subTitle}>Mais citadas no mês</Text>
      {top.length === 0 ? (
        <Text style={styles.hint}>Aparece aqui conforme você escreve.</Text>
      ) : (
        <View style={styles.chips}>
          {top.map((w) => (
            <Text key={w.word} style={styles.wordChip}>
              {w.word} · {w.n}
            </Text>
          ))}
        </View>
      )}

      {history.length > 0 ? <Text style={styles.subTitle}>Dias anteriores</Text> : null}
      {history.slice(0, 15).map((e) => (
        <EditableEntry key={e.id} entry={e} />
      ))}
    </View>
  );
}

function SummaryCard({ taskId }: { taskId: string }) {
  const extras = useContext(TaskExtrasContext)!;
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [error, setError] = useState("");
  const summaries = extras.entriesOf(taskId);
  const last = summaries[0];

  const save = () => {
    const err = extras.addEntry(taskId, title, text);
    setError(err ?? "");
    if (!err) {
      setTitle("");
      setText("");
    }
  };

  const addCard = () => {
    const err = extras.addCard(front, back, last?.id ?? null);
    setError(err ?? "");
    if (!err) {
      setFront("");
      setBack("");
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="document-text-outline" /> Resumo</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Tema / matéria"
        placeholderTextColor="#9E94AB"
        style={styles.input}
        maxLength={120}
      />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Escreva o resumo…"
        placeholderTextColor="#9E94AB"
        style={[styles.input, styles.textArea]}
        multiline
        maxLength={4000}
      />
      <TouchableOpacity style={styles.smallButton} onPress={save}>
        <Text style={styles.smallButtonText}>Salvar resumo</Text>
      </TouchableOpacity>

      <Text style={styles.subTitle}>Transformar em flashcards</Text>
      <Text style={styles.hint}>
        {last ? `Os cartões ficam ligados ao resumo “${last.title || "sem título"}”.` : "Salve um resumo para ligar os cartões a ele."}
      </Text>
      <TextInput
        value={front}
        onChangeText={setFront}
        placeholder="Pergunta (frente)"
        placeholderTextColor="#9E94AB"
        style={styles.input}
        maxLength={300}
      />
      <TextInput
        value={back}
        onChangeText={setBack}
        placeholder="Resposta (verso)"
        placeholderTextColor="#9E94AB"
        style={styles.input}
        maxLength={600}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.smallButton} onPress={addCard}>
        <Text style={styles.smallButtonText}>Criar flashcard</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Você tem {extras.cards.length} flashcards. Revise em “Revisar flashcards”.</Text>

      {summaries.length > 0 ? (
        <Text style={styles.subTitle}>Resumos salvos ({summaries.length}) · toque para ver ou editar</Text>
      ) : null}
      {summaries.slice(0, 10).map((e) => {
        const cards = extras.cards.filter((c) => c.summaryId === e.id);
        return (
          <EditableEntry key={e.id} entry={e} withTitle titlePlaceholder="Tema / matéria">
            <Text style={styles.subTitle}>Flashcards deste resumo ({cards.length})</Text>
            {cards.length === 0 ? <Text style={styles.hint}>Nenhum ainda.</Text> : null}
            {cards.map((c) => (
              <EditableCard key={c.id} card={c} />
            ))}
          </EditableEntry>
        );
      })}
    </View>
  );
}

function FlashcardsCard() {
  const extras = useContext(TaskExtrasContext)!;
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [error, setError] = useState("");
  const cards = extras.cards;
  const card = cards.length ? cards[index % cards.length] : null;
  const goal = Math.max(1, Math.min(5, cards.length));

  // Animação: 0 = pergunta, 1 = resposta (gira no eixo Y)
  const [flip] = useState(() => new Animated.Value(0));
  const [enter] = useState(() => new Animated.Value(1));
  const native = Platform.OS !== "web";
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  const turn = (toAnswer: boolean) => {
    setShow(toAnswer);
    Animated.timing(flip, {
      toValue: toAnswer ? 1 : 0,
      duration: 450,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: native,
    }).start();
  };

  const answer = (ok: boolean) => {
    if (!card) return;
    extras.reviewCard(card.id, ok);
    // Próximo cartão entra deslizando, já com a pergunta
    flip.setValue(0);
    enter.setValue(0);
    setShow(false);
    setIndex((i) => i + 1);
    Animated.timing(enter, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  };

  const addCard = () => {
    const err = extras.addCard(front, back);
    setError(err ?? "");
    if (!err) {
      setFront("");
      setBack("");
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        <Ionicons name="albums-outline" /> Revisão de hoje ({Math.min(extras.reviewsToday, goal)}/{goal})
      </Text>
      {!card ? (
        <Text style={styles.hint}>Nenhum flashcard ainda. Crie abaixo ou a partir de um resumo.</Text>
      ) : (
        <>
          {/* Cartão que vira (frente = pergunta, verso = resposta); tocar também vira */}
          <Animated.View style={{ opacity: enter, transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => turn(!show)}
              accessibilityRole="button"
              accessibilityLabel={show ? `Resposta: ${card.back}. Toque para ver a pergunta` : `Pergunta: ${card.front}. Toque para ver a resposta`}
            >
              <View style={styles.flipBox}>
                {/* Molde invisível: a altura acompanha o texto mais longo */}
                <View style={[styles.flashcard, { marginTop: 0, opacity: 0 }]} pointerEvents="none" aria-hidden>
                  <Text style={styles.flashLabel}>PERGUNTA</Text>
                  <Text style={styles.flashFront}>
                    {card.front.length > card.back.length ? card.front : card.back}
                  </Text>
                  <Text style={styles.flashTap}>toque para virar <Ionicons name="sync" /></Text>
                </View>
                <Animated.View
                  style={[
                    styles.flashcard,
                    styles.flashFace,
                    { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
                  ]}
                >
                  <Text style={styles.flashLabel}>PERGUNTA</Text>
                  <Text style={styles.flashFront}>{card.front}</Text>
                  <Text style={styles.flashTap}>toque para virar <Ionicons name="sync" /></Text>
                </Animated.View>
                <Animated.View
                  style={[
                    styles.flashcard,
                    styles.flashFace,
                    styles.flashBackFace,
                    { transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
                  ]}
                >
                  <Text style={styles.flashLabel}>RESPOSTA</Text>
                  <Text style={styles.flashBack}>{card.back}</Text>
                </Animated.View>
              </View>
            </TouchableOpacity>
          </Animated.View>
          {show ? (
            <View style={styles.chips}>
              <TouchableOpacity style={[styles.smallButton, styles.okButton]} onPress={() => answer(true)}>
                <Text style={styles.smallButtonText}>Acertei</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallButton, styles.badButton]} onPress={() => answer(false)}>
                <Text style={styles.smallButtonText}>Errei</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.smallButton} onPress={() => turn(true)}>
              <Text style={styles.smallButtonText}>Mostrar resposta</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.hint}>
            Cartão {(index % cards.length) + 1} de {cards.length}
          </Text>
        </>
      )}

      {cards.length > 0 ? (
        <Text style={styles.subTitle}>Meus flashcards ({cards.length}) · toque para ver ou editar</Text>
      ) : null}
      {cards.map((c) => (
        <EditableCard key={c.id} card={c} />
      ))}

      <Text style={styles.subTitle}>Novo flashcard</Text>
      <TextInput
        value={front}
        onChangeText={setFront}
        placeholder="Pergunta"
        placeholderTextColor="#9E94AB"
        style={styles.input}
        maxLength={300}
      />
      <TextInput
        value={back}
        onChangeText={setBack}
        placeholder="Resposta"
        placeholderTextColor="#9E94AB"
        style={styles.input}
        maxLength={600}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.smallButton} onPress={addCard}>
        <Text style={styles.smallButtonText}>Criar</Text>
      </TouchableOpacity>
    </View>
  );
}

function PeopleCard({ taskId, verb }: { taskId: string; verb: string }) {
  const extras = useContext(TaskExtrasContext)!;
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const add = () => {
    const err = extras.addPerson(name);
    setError(err ?? "");
    if (!err) setName("");
  };

  const lastFor = (personId: string) =>
    extras.personLogs.find((l) => l.taskId === taskId && l.personId === personId);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="people-outline" /> Minhas pessoas</Text>
      {extras.people.length === 0 ? (
        <Text style={styles.hint}>Adicione os nomes de quem você quer manter por perto.</Text>
      ) : null}
      {extras.people.map((p) => {
        const last = lastFor(p.id);
        const today = last?.day === extras.today;
        return (
          <View key={p.id} style={styles.personRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.entryTitle} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.entryDate}>{last ? `última vez: ${formatDateTime(last.at)}` : "ainda não"}</Text>
            </View>
            <TouchableOpacity
              style={[styles.smallButton, today && styles.disabled, { marginTop: 0 }]}
              onPress={() => extras.logPerson(taskId, p.id)}
              disabled={today}
              accessibilityLabel={`${verb} ${p.name}`}
            >
              <Text style={styles.smallButtonText}>{today ? "hoje" : "Feito"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => askRemove(`Remover ${p.name}?`, () => extras.removePerson(p.id))} hitSlop={8} accessibilityLabel={`Remover ${p.name}`}>
              <Ionicons name="close" style={styles.remove} />
            </TouchableOpacity>
          </View>
        );
      })}
      <View style={[styles.chips, { marginTop: 8 }]}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          placeholder="Nome"
          placeholderTextColor="#9E94AB"
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          maxLength={40}
        />
        <TouchableOpacity style={styles.smallButton} onPress={add}>
          <Text style={styles.smallButtonText}>Adicionar</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function TodoCard() {
  const extras = useContext(TaskExtrasContext)!;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="checkbox-outline" /> Suas 3 prioridades de hoje</Text>
      {extras.todosToday.map((t, i) => (
        <View key={i} style={styles.personRow}>
          <TouchableOpacity
            style={[styles.checkbox, t.done && styles.checkboxDone]}
            onPress={() => extras.toggleTodo(i)}
            accessibilityRole="checkbox"
            aria-checked={t.done}
            accessibilityLabel={`Prioridade ${i + 1}`}
          >
            {t.done ? <Ionicons name="checkmark" style={styles.check} /> : null}
          </TouchableOpacity>
          <TextInput
            value={t.text}
            onChangeText={(text) => extras.setTodoText(i, text)}
            placeholder={`Prioridade ${i + 1}`}
            placeholderTextColor="#9E94AB"
            style={[styles.input, { flex: 1, marginBottom: 0 }, t.done && styles.inputDone]}
            maxLength={60}
          />
        </View>
      ))}
      <Text style={styles.hint}>Concluir as três marca o desafio. Amanhã a lista começa vazia.</Text>
    </View>
  );
}

function BacklogCard() {
  const extras = useContext(TaskExtrasContext)!;
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");
  const pending = extras.backlog.filter((b) => !b.doneAt);
  const late = pending.filter((b) => b.due && b.due < extras.today);
  const onTime = pending.filter((b) => !b.due || b.due >= extras.today);
  const finished = extras.backlog.filter((b) => b.doneAt).slice(-5).reverse();

  const add = () => {
    const parsed = due.trim() ? parseDue(due) : null;
    if (due.trim() && !parsed) {
      setError("Prazo no formato dia/mês, ex.: 30/10.");
      return;
    }
    const err = extras.addBacklog(title, parsed);
    setError(err ?? "");
    if (!err) {
      setTitle("");
      setDue("");
    }
  };

  const Row = ({ b }: { b: (typeof pending)[number] }) => (
    <View style={styles.personRow}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => extras.finishBacklog(b.id)}
        accessibilityRole="checkbox"
        aria-checked={false}
        accessibilityLabel={`Concluir ${b.title}`}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.entryTitle}>{b.title}</Text>
        <Text style={styles.entryDate}>{b.due ? `prazo ${formatDay(b.due)}` : "sem prazo"}</Text>
      </View>
      <TouchableOpacity onPress={() => askRemove(`Apagar "${b.title}"?`, () => extras.removeBacklog(b.id))} hitSlop={8} accessibilityLabel={`Apagar ${b.title}`}>
        <Ionicons name="close" style={styles.remove} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="pin-outline" /> Tarefas pendentes</Text>
      {late.length > 0 ? (
        <View style={styles.lateBox}>
          <Text style={styles.lateTitle}><Ionicons name="warning-outline" /> Atrasadas ({late.length})</Text>
          {late.map((b) => (
            <Row key={b.id} b={b} />
          ))}
        </View>
      ) : null}
      {onTime.map((b) => (
        <Row key={b.id} b={b} />
      ))}
      {pending.length === 0 ? <Text style={styles.hint}>Nenhuma pendência. Anote o que está adiando.</Text> : null}
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Tarefa que está adiando"
        placeholderTextColor="#9E94AB"
        style={[styles.input, { marginTop: 8 }]}
        maxLength={60}
      />
      <View style={styles.chips}>
        <TextInput
          value={due}
          onChangeText={(t) => {
            const d = t.replace(/\D/g, "").slice(0, 4);
            setDue(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
          }}
          placeholder="Prazo dd/mm (opcional)"
          placeholderTextColor="#9E94AB"
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          keyboardType="number-pad"
          maxLength={5}
        />
        <TouchableOpacity style={styles.smallButton} onPress={add}>
          <Text style={styles.smallButtonText}>Adicionar</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {finished.length > 0 ? <Text style={styles.subTitle}>Concluídas recentemente</Text> : null}
      {finished.map((b) => (
        <Text key={b.id} style={styles.entryText}>
          <Ionicons name="checkmark" /> {b.title} <Text style={styles.entryDate}>· {formatDateTime(b.doneAt!)}</Text>
        </Text>
      ))}
    </View>
  );
}

function SleepCard({ mode }: { mode: "bedtime" | "duration" | "wake" | "screens" | "bed" }) {
  const extras = useContext(TaskExtrasContext)!;
  const [bedtime, setBedtime] = useState(extras.sleep?.bedtime ?? "23:00");
  const [wake, setWake] = useState(extras.sleep?.wake ?? "07:00");
  const [slept, setSlept] = useState(extras.sleep?.bedtime ?? "");
  const [woke, setWoke] = useState(extras.sleep?.wake ?? "");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const todayLog = extras.sleepLogs.find((l) => l.day === extras.today);

  const saveSettings = () => {
    const err = extras.setSleep({ bedtime, wake });
    setError(err ?? "");
    setMsg(err ? "" : "Horários salvos. Os lembretes de sono usam esses horários.");
  };

  const saveLog = () => {
    const err = extras.logSleep(slept, woke);
    setError(err ?? "");
  };

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="moon-outline" /> Meu sono</Text>
        <View style={styles.chips}>
          <Text style={styles.label}>Dormir</Text>
          <TextInput
            value={bedtime}
            onChangeText={(t) => setBedtime(maskTime(t))}
            keyboardType="number-pad"
            maxLength={5}
            style={styles.timeInput}
            accessibilityLabel="Horário de dormir"
          />
          <Text style={styles.label}>Acordar</Text>
          <TextInput
            value={wake}
            onChangeText={(t) => setWake(maskTime(t))}
            keyboardType="number-pad"
            maxLength={5}
            style={styles.timeInput}
            accessibilityLabel="Horário de acordar"
          />
        </View>
        <TouchableOpacity style={styles.smallButton} onPress={saveSettings}>
          <Text style={styles.smallButtonText}>Salvar horários</Text>
        </TouchableOpacity>
        {msg ? <Text style={styles.hint}>{msg}</Text> : null}
        {TIME_RE.test(bedtime) && TIME_RE.test(wake) ? (
          <Text style={styles.hint}>Planejado: {sleepHours(bedtime, wake)} h de sono.</Text>
        ) : null}
      </View>

      {mode === "bedtime" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}><Ionicons name="alarm-outline" /> Modo soneca</Text>
          <Text style={styles.hint}>Ainda não deu? Peça um novo aviso daqui a alguns minutos.</Text>
          <View style={styles.chips}>
            {[5, 10, 15].map((m) => (
              <TouchableOpacity
                key={m}
                style={styles.chip}
                onPress={() => {
                  extras.snooze(m);
                  setMsg(`Soneca: aviso em ${m} min.`);
                }}
              >
                <Text style={styles.chipText}>+{m} min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {mode === "duration" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}><Ionicons name="bed-outline" /> Como foi a noite</Text>
          <Text style={styles.hint}>
            Registre a que horas dormiu e acordou. Com 8 h ou mais o desafio é marcado.
          </Text>
          <View style={styles.chips}>
            <Text style={styles.label}>Dormi</Text>
            <TextInput
              value={slept}
              onChangeText={(t) => setSlept(maskTime(t))}
              placeholder="23:00"
              placeholderTextColor="#9E94AB"
              keyboardType="number-pad"
              maxLength={5}
              style={styles.timeInput}
            />
            <Text style={styles.label}>Acordei</Text>
            <TextInput
              value={woke}
              onChangeText={(t) => setWoke(maskTime(t))}
              placeholder="07:00"
              placeholderTextColor="#9E94AB"
              keyboardType="number-pad"
              maxLength={5}
              style={styles.timeInput}
            />
          </View>
          <TouchableOpacity style={styles.smallButton} onPress={saveLog}>
            <Text style={styles.smallButtonText}>Registrar</Text>
          </TouchableOpacity>
          {todayLog ? (
            <Text style={styles.desc}>
              Hoje: {todayLog.hours} h {todayLog.hours >= 8 ? "meta batida" : `· faltaram ${Math.round((8 - todayLog.hours) * 10) / 10} h`}
            </Text>
          ) : null}
          {extras.sleepLogs.length > 0 ? <Text style={styles.subTitle}>Últimas noites</Text> : null}
          <View style={styles.sleepBars}>
            {extras.sleepLogs
              .slice(0, 7)
              .reverse()
              .map((l) => (
                <View key={l.day} style={styles.sleepCol}>
                  <View style={[styles.sleepBar, { height: Math.min(80, l.hours * 8) }, l.hours >= 8 && styles.sleepBarOk]} />
                  <Text style={styles.entryDate}>{l.hours}h</Text>
                  <Text style={styles.entryDate}>{formatDay(l.day)}</Text>
                </View>
              ))}
          </View>
        </View>
      ) : null}

      {mode === "screens" ? (
        <Text style={styles.note}>O lembrete toca 30 min antes do seu horário de dormir.</Text>
      ) : null}
      {mode === "bed" ? (
        <Text style={styles.note}>O lembrete toca 30 min depois do seu horário de acordar.</Text>
      ) : null}
      {mode === "wake" ? <Text style={styles.note}>O lembrete toca no seu horário de acordar.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}

function MetricCard({
  taskId,
  label,
  unit,
  goal,
  atMost,
}: {
  taskId: string;
  label: string;
  unit: string;
  goal: number;
  atMost: boolean;
}) {
  const extras = useContext(TaskExtrasContext)!;
  const value = extras.metricToday(taskId);
  const [text, setText] = useState(value !== null ? String(value) : "");
  const history = extras.metrics.filter((m) => m.taskId === taskId).slice(0, 7);
  const met = (v: number) => (atMost ? v < goal : v >= goal);

  const save = () => {
    const n = Number(text.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return;
    extras.logMetric(taskId, n);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="bar-chart-outline" /> Medição de hoje</Text>
      <Text style={styles.hint}>{label}</Text>
      <View style={styles.chips}>
        <TextInput
          value={text}
          onChangeText={(t) => setText(t.replace(/[^\d.,]/g, ""))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#9E94AB"
          style={styles.timeInput}
          maxLength={6}
        />
        <Text style={styles.label}>{unit}</Text>
        <TouchableOpacity style={[styles.smallButton, { marginTop: 0 }]} onPress={save}>
          <Text style={styles.smallButtonText}>Salvar</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Meta: {atMost ? "menos de" : "pelo menos"} {goal.toLocaleString("pt-BR")} {unit}.
        {value !== null ? (met(value) ? " Cumprida hoje." : " Ainda não.") : ""}
      </Text>
      {history.length > 0 ? <Text style={styles.subTitle}>Últimos dias</Text> : null}
      {history.map((m) => (
        <Text key={m.day} style={styles.entryText}>
          {formatDay(m.day)}: {m.value.toLocaleString("pt-BR")} {unit} {met(m.value) ? "· cumprida" : ""}
        </Text>
      ))}
    </View>
  );
}

function FocusModeCard() {
  const [msg, setMsg] = useState("");
  const open = async () => setMsg((await openDoNotDisturb()) ?? "");

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="notifications-off-outline" /> Modo foco</Text>
      <Text style={styles.hint}>
        Ative o “Não perturbe” do celular antes de começar. Por segurança, o próprio sistema exige que você ligue.
      </Text>
      <TouchableOpacity style={styles.smallButton} onPress={open}>
        <Text style={styles.smallButtonText}>Abrir “Não perturbe”</Text>
      </TouchableOpacity>
      {msg ? <Text style={styles.hint}>{msg}</Text> : null}
    </View>
  );
}

// Finanças (funções do Squill): resumo do dia + lançamento rápido + atalho
function FinanceCard({ tab }: { tab: "resumo" | "lancamentos" | "cofrinhos" | "aprender" }) {
  const fin = useContext(FinanceContext);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("quest");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  if (!fin) return null;

  const today = fin.transactions.filter((t) => inPeriod(t.day, "day"));
  const sumToday = totals(today);
  const spentMonth = totals(fin.transactions.filter((t) => inPeriod(t.day, "month"))).expense;
  const noSpend = fin.noSpendDays.includes(dayKey());

  const add = () => {
    const value = parseMoney(amount);
    if (!value) return setError("Digite um valor válido (ex.: 12,50).");
    const err = fin.addTransaction({ type: "expense", name, amount: value, category, day: dayKey() });
    setError(err ?? "");
    if (err) return;
    setMsg(`Gasto de ${formatMoney(value)} anotado.`);
    setName("");
    setAmount("");
  };

  const openTab = (t: typeof tab) => router.push({ pathname: "/finance", params: { tab: t } });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name="wallet-outline" /> Minhas finanças</Text>
      <Text style={styles.desc}>
        Hoje: gastou {formatMoney(sumToday.expense)}
        {sumToday.income ? ` · recebeu ${formatMoney(sumToday.income)}` : ""}
      </Text>
      {fin.monthlyLimit ? (
        <Text style={[styles.hint, spentMonth >= fin.monthlyLimit * 0.8 && styles.warn]}>
          Mês: {formatMoney(spentMonth)} de {formatMoney(fin.monthlyLimit)} do limite
        </Text>
      ) : null}

      {tab === "resumo" || tab === "lancamentos" ? <WeekMiniChart transactions={fin.transactions} /> : null}

      {tab === "cofrinhos" ? (
        <>
          <Text style={styles.subTitle}>Guardar dinheiro</Text>
          <QuickSave />
          <Text style={styles.subTitle}>Quanto você guardou</Text>
          <SavedChart goals={fin.goals} />
        </>
      ) : null}

      {tab === "lancamentos" ? (
        <>
          <Text style={styles.subTitle}>Anotar um gasto de hoje</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Com o quê? (ex.: Lanche)"
            placeholderTextColor="#9E94AB"
            style={styles.input}
            maxLength={40}
          />
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Valor (R$)"
            placeholderTextColor="#9E94AB"
            keyboardType="decimal-pad"
            style={[styles.input, { marginTop: 0 }]}
          />
          <View style={styles.chips}>
            {EXPENSE_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[styles.chipSmall, category === c.key && { backgroundColor: c.color, borderColor: c.color }]}
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
          {msg ? <Text style={styles.hint}><Ionicons name="checkmark-circle" /> {msg}</Text> : null}
          <View style={styles.chips}>
            <TouchableOpacity style={[styles.smallButton, { marginTop: 0 }]} onPress={add}>
              <Text style={styles.smallButtonText}>Anotar gasto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallButton, styles.outlineButton, { marginTop: 0 }, noSpend && styles.disabled]}
              onPress={fin.markNoSpendToday}
              disabled={noSpend}
            >
              <Text style={styles.smallButtonText}>{noSpend ? "Hoje sem gastos" : "Não gastei nada"}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      <View style={styles.chips}>
        <TouchableOpacity style={styles.smallButton} onPress={() => openTab(tab)}>
          <Text style={styles.smallButtonText}>
            {tab === "resumo"
              ? "Ver resumo e gráficos"
              : tab === "cofrinhos"
                ? "Abrir cofrinhos"
                : tab === "aprender"
                  ? "Ler um texto"
                  : "Abrir Minhas finanças"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Receitas, gráficos (dia, semana e mês), limite de gastos, cofrinhos e educação financeira ficam em Minhas
        finanças.
      </Text>
    </View>
  );
}

function AttachmentsCard({ taskId, accept }: { taskId: string; accept: "image" | "document" }) {
  const extras = useContext(TaskExtrasContext)!;
  const [error, setError] = useState("");
  const list = extras.attachments.filter((a) => a.taskId === taskId);
  const week = weekKey();
  const month = monthKey();
  const inWeek = list.filter((a) => weekKey(new Date(a.at)) === week).length;
  const inMonth = list.filter((a) => monthKey(new Date(a.at)) === month).length;

  const pick = async () => {
    setError("");
    try {
      if (accept === "image") {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: PHOTO_QUALITY,
          base64: Platform.OS === "web",
        });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        const uri = Platform.OS === "web" && asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setError(extras.addAttachment(taskId, uri, asset.fileName ?? "desenho", "image") ?? "");
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
          ],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        setError(extras.addAttachment(taskId, asset.uri, asset.name, "document") ?? "");
      }
    } catch {
      setError("Não foi possível abrir o arquivo.");
    }
  };

  const openDoc = (a: Attachment) => Linking.openURL(a.uri).catch(() => setError("Não foi possível abrir."));

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}><Ionicons name={accept === "image" ? "images-outline" : "attach-outline"} /> {accept === "image" ? "Meus desenhos" : "Documentos (PDF, Word, TXT)"}</Text>
      <Text style={styles.hint}>
        Esta semana: {inWeek} · Este mês: {inMonth} · Total: {list.length}
      </Text>
      <TouchableOpacity style={styles.smallButton} onPress={pick}>
        <Text style={styles.smallButtonText}>{accept === "image" ? "Anexar imagem" : "Anexar documento"}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {accept === "image" ? (
        <View style={styles.gallery}>
          {list.map((a) => (
            <View key={a.id} style={styles.galleryItem}>
              <ZoomablePhoto uri={a.uri} style={styles.galleryImage} label={a.name} />
              <Text style={styles.entryDate}>{formatDateTime(a.at)}</Text>
              <TouchableOpacity onPress={() => askRemove("Remover anexo?", () => extras.removeAttachment(a.id))} hitSlop={8} accessibilityLabel="Remover imagem">
                <Ionicons name="close" style={styles.remove} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        list.map((a) => (
          <View key={a.id} style={styles.personRow}>
            <TouchableOpacity style={{ flex: 1, minWidth: 0 }} onPress={() => openDoc(a)}>
              <Text style={styles.entryTitle} numberOfLines={1}>
                <Ionicons name="document-text-outline" /> {a.name}
              </Text>
              <Text style={styles.entryDate}>{formatDateTime(a.at)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => askRemove("Remover anexo?", () => extras.removeAttachment(a.id))} hitSlop={8} accessibilityLabel="Remover documento">
              <Ionicons name="close" style={styles.remove} />
            </TouchableOpacity>
          </View>
        ))
      )}
      {accept === "document" && Platform.OS === "web" ? (
        <Text style={styles.hint}>No navegador o documento só abre até recarregar a página; no celular fica salvo.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  content: { padding: 15, paddingBottom: 110 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 },
  back: { color: "#FFF", fontSize: 25 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "600", flex: 1, textAlign: "center" },

  card: { backgroundColor: "#25193A", borderRadius: 10, padding: 12, marginBottom: 12 },
  soonCard: { borderWidth: 1, borderColor: "#5B21B6", borderStyle: "dashed" },
  editHint: {
    backgroundColor: "#5B21B6",
    borderWidth: 1,
    borderColor: "#A78BFA",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  editHintText: { color: "#FFF", fontSize: 13, fontWeight: "600", textAlign: "center" },
  cardTitle: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  subTitle: { color: "#FFF", fontSize: 13, fontWeight: "600", marginTop: 14, marginBottom: 4 },
  meta: { color: "#C7BADB", fontSize: 12 },
  desc: { color: "#DDD6FE", fontSize: 13, marginTop: 6 },
  hint: { color: "#C7BADB", fontSize: 12, marginTop: 6, lineHeight: 17 },
  muted: { color: "#C7BADB", fontSize: 13, textAlign: "center" },
  warn: { color: "#FCD34D", fontSize: 12, marginTop: 8 },
  outlineButton: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#A78BFA" },
  label: { color: "#DDD6FE", fontSize: 13 },
  note: { color: "#C7BADB", fontSize: 11, textAlign: "center", marginTop: 4, marginBottom: 12, lineHeight: 16 },
  error: { color: "#FCA5A5", fontSize: 13, marginTop: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  doneBadge: {
    alignSelf: "flex-start",
    color: "#FFF",
    backgroundColor: "#15A638",
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  banner: {
    backgroundColor: "#15803D",
    borderWidth: 1,
    borderColor: "#36D35B",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  bannerText: { color: "#FFF", fontWeight: "600", textAlign: "center" },

  toggle: { borderRadius: 14, borderWidth: 1, borderColor: "#5B21B6", paddingHorizontal: 12, paddingVertical: 5 },
  toggleOn: { backgroundColor: "#15A638", borderColor: "#36D35B" },
  toggleText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" },
  chip: { borderRadius: 14, borderWidth: 1, borderColor: "#5B21B6", paddingHorizontal: 12, paddingVertical: 6 },
  chipSmall: { borderRadius: 12, borderWidth: 1, borderColor: "#5B21B6", paddingHorizontal: 8, paddingVertical: 5 },
  chipActive: { backgroundColor: "#5B21B6", borderColor: "#A78BFA" },
  chipText: { color: "#FFF", fontSize: 13 },
  wordChip: {
    color: "#FFF",
    backgroundColor: "#5B21B6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    overflow: "hidden",
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFF",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    marginTop: 8,
  },
  inputDone: { textDecorationLine: "line-through", color: "#9E94AB" },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  timeInput: {
    width: 72,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    color: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: "center",
  },

  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
    minHeight: 46,
  },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  smallButton: {
    alignSelf: "flex-start",
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 8,
  },
  smallButtonText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  okButton: { backgroundColor: "#15A638" },
  badButton: { backgroundColor: "#B91C1C" },
  link: { color: "#DDD6FE", fontSize: 13, textDecorationLine: "underline" },
  remove: { color: "#9E94AB", fontSize: 14, paddingHorizontal: 4 },

  clock: { color: "#FFF", fontSize: 34, fontWeight: "700", marginTop: 8, fontVariant: ["tabular-nums"] },
  clockGoal: { color: "#9E94AB", fontSize: 16, fontWeight: "500" },
  bar: { height: 8, backgroundColor: "#57356F", borderRadius: 8, marginTop: 8, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#B832E5" },

  entry: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingVertical: 8 },
  entryOpen: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    paddingHorizontal: 8,
    borderTopColor: "transparent",
  },
  entryDate: { color: "#9E94AB", fontSize: 11 },
  entryTitle: { color: "#FFF", fontSize: 13, fontWeight: "600", marginTop: 2 },
  entryText: { color: "#DDD6FE", fontSize: 13, marginTop: 4, lineHeight: 18 },

  personRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#E5E0EC",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxDone: { backgroundColor: "#7C3AED", borderColor: "#A78BFA" },
  check: { color: "#FFF", fontWeight: "bold", fontSize: 16 },

  lateBox: { borderWidth: 1, borderColor: "#B91C1C", borderRadius: 8, padding: 8, marginTop: 8 },
  lateTitle: { color: "#FCA5A5", fontSize: 13, fontWeight: "700" },

  flashcard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5B21B6",
    padding: 16,
    marginTop: 10,
    minHeight: 90,
    justifyContent: "center",
  },
  flashFront: { color: "#FFF", fontSize: 16, fontWeight: "600", textAlign: "center" },
  flashBack: { color: "#FFF", fontSize: 16, fontWeight: "600", textAlign: "center" },
  flipBox: { marginTop: 10 },
  flashFace: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, marginTop: 0, backfaceVisibility: "hidden" },
  flashBackFace: { backgroundColor: "#5B21B6", borderColor: "#A78BFA" },
  flashLabel: { color: "#C7BADB", fontSize: 10, fontWeight: "700", letterSpacing: 1, textAlign: "center", marginBottom: 8 },
  flashTap: { color: "#9E94AB", fontSize: 11, textAlign: "center", marginTop: 10 },

  sleepBars: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 6 },
  sleepCol: { alignItems: "center" },
  sleepBar: { width: 18, backgroundColor: "#57356F", borderRadius: 4 },
  sleepBarOk: { backgroundColor: "#B832E5" },

  gallery: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  galleryItem: { width: 96, alignItems: "flex-start" },
  galleryImage: { width: 140, height: 140, borderRadius: 10, backgroundColor: "#57356F" },
  diaryRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, borderLeftWidth: 4, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 10, paddingVertical: 9, marginTop: 8 },
  diaryTitle: { flex: 1, color: "#FFF", fontSize: 14, fontWeight: "600" },
  diaryDate: { color: "#9E94AB", fontSize: 11 },
});
