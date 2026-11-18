import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useContext, useState } from "react";
import { Linking, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ZoomablePhoto } from "@/components/PhotoViewer";
import { CardTitle, formatDay, ui } from "@/components/ScreenShell";
import { CATALOG_BY_ID } from "@/constants/challenges";
import { dayKey, monthKey } from "@/constants/gamification";
import type { PlannerView } from "@/constants/taskFeatures";
import { BooksContext } from "@/context/BooksContext";
import { GroupsContext } from "@/context/GroupsContext";
import { DAY_SHORT, WEEK_ORDER } from "@/context/HabitsContext";
import {
  bedtimeSpread,
  DAY_COUNT_TASKS,
  FileRef,
  KIND_LABEL,
  MEAL_SLOTS,
  MealSlot,
  PLAN_SLOTS,
  PlannerContext,
  PROJECT_MIN_DAYS,
  projectProgressDays,
  RUN_MONTH_TASK,
  TRAINING_MONTH_TASK,
  weekDays,
} from "@/context/PlannerContext";
import { TaskExtrasContext } from "@/context/TaskExtrasContext";
import { confirmAction } from "@/utils/feedback";
import { openFile, pickDocument, pickImage, shareContent } from "@/utils/files";

// Blocos das tarefas semanais e mensais (tela /task). Cada um conclui o
// desafio sozinho quando o registro cumpre a regra — sem checkbox solto.

const askRemove = async (title: string, remove: () => void) => {
  if (await confirmAction(title, "Isso não pode ser desfeito.", "Apagar")) remove();
};

const Err = ({ text }: { text: string }) => (text ? <Text style={ui.error}>{text}</Text> : null);

const Rule = ({ children }: { children: React.ReactNode }) => (
  <View style={[ui.row, { marginTop: 6, alignItems: "flex-start" }]}>
    <Ionicons name="shield-checkmark-outline" size={14} color="#A78BFA" style={{ marginTop: 2 }} />
    <Text style={[ui.hint, { marginTop: 0, flex: 1 }]}>{children}</Text>
  </View>
);

const Progress = ({ value, goal, label }: { value: number; goal: number; label: string }) => {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={ui.meta}>
        {value}/{goal} {label} · {pct}%
      </Text>
      <View style={ui.bar}>
        <View style={[ui.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
};

const Remove = ({ onPress, label }: { onPress: () => void; label: string }) => (
  <TouchableOpacity onPress={onPress} hitSlop={8} accessibilityLabel={label}>
    <Ionicons name="trash-outline" size={16} color="#9E94AB" />
  </TouchableOpacity>
);

const num = (t: string) => Number(t.replace(",", "."));

export function PlannerModule({ taskId, view }: { taskId: string; view: PlannerView }) {
  switch (view.type) {
    case "simulado":
      return <SimuladoCard />;
    case "weekReview":
      return <WeekReviewCard />;
    case "mindmap":
      return <MindMapCard taskId={taskId} scope={view.scope} />;
    case "videos":
      return <VideosCard />;
    case "chapter":
      return <ChapterCard />;
    case "bookNote":
      return <BookNoteCard />;
    case "bookMonth":
      return <BookMonthCard />;
    case "review":
      return <ReviewCard />;
    case "library":
      return <LibraryCard />;
    case "meals":
      return <MealsCard />;
    case "training":
      return <TrainingCard />;
    case "trainingMonth":
      return <TrainingMonthCard />;
    case "hobbies":
      return <HobbiesCard />;
    case "weekPlan":
      return <WeekPlanCard />;
    case "agenda":
      return <AgendaLinkCard />;
    case "goalCards":
      return <GoalCardsCard nextMonth={view.nextMonth} />;
    case "sleepCompare":
      return <SleepCompareCard scope={view.scope} />;
    case "dayCount":
      return <DayCountCard taskId={taskId} />;
    case "runs":
      return <RunsCard />;
    case "projects":
      return <ProjectsLinkCard kind={view.kind} weekly={CATALOG_BY_ID[taskId]?.frequency === "weekly"} />;
    case "meetup":
      return <MeetupCard />;
    case "proof":
      return <ProofCard taskId={taskId} />;
  }
}

// ---------- Estudos ----------

function SimuladoCard() {
  const p = useContext(PlannerContext)!;
  const [title, setTitle] = useState("");
  const [correct, setCorrect] = useState("");
  const [total, setTotal] = useState("");
  const [error, setError] = useState("");
  const save = () => {
    const err = p.addSimulado(title, Number(correct), Number(total));
    setError(err ?? "");
    if (!err) {
      setTitle("");
      setCorrect("");
      setTotal("");
    }
  };
  return (
    <View style={ui.card}>
      <CardTitle icon="document-text-outline">Registrar simulado</CardTitle>
      <TextInput style={ui.input} value={title} onChangeText={setTitle} placeholder="Nome (ex.: ENEM 2023 — dia 1)" placeholderTextColor="#9E94AB" />
      <View style={ui.row}>
        <TextInput style={[ui.input, { flex: 1 }]} value={correct} onChangeText={(t) => setCorrect(t.replace(/\D/g, ""))} placeholder="Acertos" placeholderTextColor="#9E94AB" keyboardType="number-pad" />
        <TextInput style={[ui.input, { flex: 1 }]} value={total} onChangeText={(t) => setTotal(t.replace(/\D/g, ""))} placeholder="Questões" placeholderTextColor="#9E94AB" keyboardType="number-pad" />
      </View>
      <TouchableOpacity style={ui.smallButton} onPress={save}>
        <Text style={ui.smallButtonText}>Salvar resultado</Text>
      </TouchableOpacity>
      <Err text={error} />
      <Rule>Conclui quando você salva o resultado (mínimo de 5 questões).</Rule>
      {p.simulados.slice(0, 6).map((s) => (
        <View key={s.id} style={ui.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={ui.listText}>{s.title}</Text>
            <Text style={ui.listSub}>
              {formatDay(s.day)} · {s.correct}/{s.total} · {Math.round((s.correct / s.total) * 100)}%
            </Text>
          </View>
          <Remove label={`Apagar ${s.title}`} onPress={() => askRemove("Apagar simulado?", () => p.removeSimulado(s.id))} />
        </View>
      ))}
    </View>
  );
}

function Keywords({ words }: { words: { word: string; n: number }[] }) {
  if (words.length === 0) return <Text style={ui.hint}>Ainda sem palavras: salve resumos, artigos e flashcards.</Text>;
  const max = words[0].n;
  return (
    <View style={ui.chips}>
      {words.map((w) => (
        <Text
          key={w.word}
          style={[ui.wordChip, { fontSize: 11 + Math.round((w.n / max) * 7), opacity: 0.6 + (w.n / max) * 0.4 }]}
        >
          {w.word} · {w.n}
        </Text>
      ))}
    </View>
  );
}

function WeekReviewCard() {
  const p = useContext(PlannerContext)!;
  const items = p.studyItems("week");
  const reviewed = p.weekReviewed[p.week] ?? [];
  const goal = Math.min(3, items.length);
  const [open, setOpen] = useState<string | null>(null);

  // Conclui ao revisar 3 itens (ou todos, se houver menos)
  const toggle = (id: string) => p.toggleReviewed(id);
  const done = items.filter((i) => reviewed.includes(i.id)).length;

  return (
    <View style={ui.card}>
      <CardTitle icon="albums-outline">O que você estudou nesta semana</CardTitle>
      <Text style={ui.subTitle}>Palavras mais importantes</Text>
      <Keywords words={p.keywords("week")} />
      <Text style={ui.subTitle}>Revise cada item</Text>
      {items.length === 0 ? (
        <Text style={ui.hint}>Nada registrado ainda. Use Resumo, Ler um artigo, Flashcards, Simulado ou Videoaula durante a semana.</Text>
      ) : null}
      {items.map((i) => {
        const ok = reviewed.includes(i.id);
        return (
          <View key={i.id} style={ui.listRow}>
            <TouchableOpacity onPress={() => toggle(i.id)} accessibilityRole="checkbox" aria-checked={ok} hitSlop={6}>
              <Ionicons name={ok ? "checkbox" : "square-outline"} size={20} color={ok ? "#36D35B" : "#A78BFA"} />
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setOpen(open === i.id ? null : i.id)}>
              <Text style={ui.listText}>{i.title}</Text>
              <Text style={ui.listSub}>{i.source} · {formatDay(dayKey(new Date(i.at)))}</Text>
              {open === i.id ? <Text style={[ui.desc, { marginTop: 4 }]}>{i.text}</Text> : null}
            </TouchableOpacity>
          </View>
        );
      })}
      {items.length ? <Progress value={done} goal={goal} label="revisados" /> : null}
      <Rule>Conclui quando você revisa {goal || 3} itens do que estudou na semana.</Rule>
      <WeekReviewAutoComplete done={done} goal={goal} has={items.length > 0} />
    </View>
  );
}

// Fecha o desafio quando a revisão bate a meta (fora do render)
function WeekReviewAutoComplete({ done, goal, has }: { done: number; goal: number; has: boolean }) {
  const extras = useContext(TaskExtrasContext);
  React.useEffect(() => {
    if (has && goal > 0 && done >= goal) extras?.complete("est-revisao-semana");
  }, [done, goal, has, extras]);
  return null;
}

function AttachRow({ files, onAdd, onRemove }: { files: FileRef[]; onAdd: (f: FileRef) => void; onRemove: (uri: string) => void }) {
  return (
    <>
      <View style={ui.chips}>
        <TouchableOpacity style={ui.chip} onPress={async () => { const f = await pickImage(); if (f) onAdd(f); }}>
          <Text style={ui.chipText}>Anexar foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ui.chip} onPress={async () => { const f = await pickDocument(); if (f) onAdd(f); }}>
          <Text style={ui.chipText}>Anexar PDF/Word</Text>
        </TouchableOpacity>
      </View>
      {files.map((f) => (
        <View key={f.uri} style={ui.listRow}>
          {f.kind === "image" ? (
            <ZoomablePhoto uri={f.uri} style={{ width: 96, height: 96, borderRadius: 8 }} label={f.name} />
          ) : (
            <Ionicons name="document-attach-outline" size={22} color="#DDD6FE" />
          )}
          <TouchableOpacity style={{ flex: 1 }} onPress={() => openFile(f.uri)}>
            <Text style={ui.listText} numberOfLines={1}>{f.name}</Text>
          </TouchableOpacity>
          <Remove label="Remover anexo" onPress={() => onRemove(f.uri)} />
        </View>
      ))}
    </>
  );
}

function MindMapCard({ taskId, scope }: { taskId: string; scope: "week" | "month" }) {
  const p = useContext(PlannerContext)!;
  const words = p.keywords(scope);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [files, setFiles] = useState<FileRef[]>([]);
  const [error, setError] = useState("");
  const mine = p.mindmaps.filter((m) => m.taskId === taskId);

  const reset = () => {
    setEditing(null);
    setTitle("");
    setText("");
    setPicked([]);
    setFiles([]);
  };
  const save = () => {
    const err = p.saveMindMap(taskId, { id: editing ?? undefined, title, text, keywords: picked, files });
    setError(err ?? "");
    if (!err) reset();
  };
  const toggleWord = (w: string) => setPicked((l) => (l.includes(w) ? l.filter((x) => x !== w) : [...l, w]));

  return (
    <View style={ui.card}>
      <CardTitle icon="git-network-outline">{scope === "week" ? "Mapa mental da semana" : "Revisão do mês"}</CardTitle>
      <Text style={ui.hint}>
        Palavras-chave geradas do que você estudou {scope === "week" ? "na semana" : "no mês"}. Toque para usar como tópicos.
      </Text>
      {words.length === 0 ? <Keywords words={[]} /> : null}
      <View style={ui.chips}>
        {words.map((w) => (
          <TouchableOpacity key={w.word} style={[ui.chipSmall, picked.includes(w.word) && ui.chipActive]} onPress={() => toggleWord(w.word)}>
            <Text style={ui.chipText}>
              {w.word} · {w.n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={ui.input} value={title} onChangeText={setTitle} placeholder="Título (para revisar depois)" placeholderTextColor="#9E94AB" />
      <TextInput
        style={[ui.input, ui.textArea]}
        value={text}
        onChangeText={setText}
        multiline
        placeholder={scope === "week" ? "Tópicos do mapa: ideia central → ramos…" : "Anotações da revisão do mês…"}
        placeholderTextColor="#9E94AB"
      />
      <AttachRow files={files} onAdd={(f) => setFiles((l) => [f, ...l])} onRemove={(uri) => setFiles((l) => l.filter((f) => f.uri !== uri))} />
      <View style={ui.row}>
        <TouchableOpacity style={ui.smallButton} onPress={save}>
          <Text style={ui.smallButtonText}>{editing ? "Salvar alterações" : "Salvar"}</Text>
        </TouchableOpacity>
        {editing ? (
          <TouchableOpacity onPress={reset} style={{ marginTop: 8 }}>
            <Text style={ui.link}>Cancelar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Err text={error} />
      <Rule>Conclui ao salvar com título e conteúdo (tópicos, anexo ou 3 palavras-chave).</Rule>

      {mine.length ? <Text style={ui.subTitle}>Salvos</Text> : null}
      {mine.map((m) => (
        <View key={m.id} style={ui.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={ui.listText}>{m.title}</Text>
            <Text style={ui.listSub}>
              {formatDay(dayKey(new Date(m.at)))}
              {m.keywords.length ? ` · ${m.keywords.join(", ")}` : ""}
              {m.files.length ? ` · ${m.files.length} anexo(s)` : ""}
              {m.editedAt ? " · editado" : ""}
            </Text>
          </View>
          <TouchableOpacity
            hitSlop={8}
            accessibilityLabel={`Editar ${m.title}`}
            onPress={() => {
              setEditing(m.id);
              setTitle(m.title);
              setText(m.text);
              setPicked(m.keywords);
              setFiles(m.files);
            }}
          >
            <Ionicons name="create-outline" size={17} color="#DDD6FE" />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8} accessibilityLabel="Compartilhar" onPress={() => shareContent(m.title, m.text, m.files[0])}>
            <Ionicons name="share-social-outline" size={17} color="#DDD6FE" />
          </TouchableOpacity>
          <Remove label={`Apagar ${m.title}`} onPress={() => askRemove("Apagar mapa?", () => p.removeMindMap(m.id))} />
        </View>
      ))}
    </View>
  );
}

function VideosCard() {
  const p = useContext(PlannerContext)!;
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const pending = p.videos.filter((v) => !v.watchedAt);
  const watched = p.videos.filter((v) => v.watchedAt).sort((a, b) => (b.watchedAt ?? 0) - (a.watchedAt ?? 0));
  const add = () => {
    const err = p.addVideo(title, link);
    setError(err ?? "");
    if (!err) {
      setTitle("");
      setLink("");
    }
  };
  return (
    <View style={ui.card}>
      <CardTitle icon="play-circle-outline">Videoaulas</CardTitle>
      <TextInput style={ui.input} value={title} onChangeText={setTitle} placeholder="Título da aula" placeholderTextColor="#9E94AB" />
      <TextInput style={ui.input} value={link} onChangeText={setLink} placeholder="Link (opcional)" placeholderTextColor="#9E94AB" autoCapitalize="none" keyboardType="url" />
      <TouchableOpacity style={ui.smallButton} onPress={add}>
        <Text style={ui.smallButtonText}>Guardar para assistir</Text>
      </TouchableOpacity>
      <Err text={error} />
      <Rule>Conclui quando você marca uma aula como assistida.</Rule>
      {pending.length ? <Text style={ui.subTitle}>Para assistir</Text> : null}
      {pending.map((v) => (
        <View key={v.id} style={ui.listRow}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => v.link && Linking.openURL(v.link)} disabled={!v.link}>
            <Text style={ui.listText}>{v.title}</Text>
            {v.link ? <Text style={ui.listSub} numberOfLines={1}>{v.link}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity style={ui.chipSmall} onPress={() => p.watchVideo(v.id)}>
            <Text style={ui.chipText}>Assisti</Text>
          </TouchableOpacity>
          <Remove label={`Apagar ${v.title}`} onPress={() => askRemove("Apagar videoaula?", () => p.removeVideo(v.id))} />
        </View>
      ))}
      {watched.length ? <Text style={ui.subTitle}>Já vistas</Text> : null}
      {watched.slice(0, 10).map((v) => (
        <View key={v.id} style={ui.listRow}>
          <Ionicons name="checkmark-circle" size={18} color="#36D35B" />
          <Text style={[ui.listText, { color: "#C7BADB" }]}>{v.title}</Text>
          <Text style={ui.listSub}>{formatDay(dayKey(new Date(v.watchedAt as number)))}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------- Leitura ----------

function BookPicker({ value, onChange, status }: { value: string | null; onChange: (id: string) => void; status: ("lendo" | "concluido" | "quero")[] }) {
  const books = (useContext(BooksContext)?.books ?? []).filter((b) => status.includes(b.status));
  if (books.length === 0) {
    return (
      <TouchableOpacity onPress={() => router.push("/bookshelf")} style={{ marginTop: 8 }}>
        <Text style={ui.link}>Nenhum livro aqui ainda. Abrir Minha Estante</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={ui.chips}>
      {books.map((b) => (
        <TouchableOpacity key={b.id} style={[ui.chipSmall, value === b.id && ui.chipActive]} onPress={() => onChange(b.id)}>
          <Text style={ui.chipText} numberOfLines={1}>{b.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ChapterCard() {
  const p = useContext(PlannerContext)!;
  const books = useContext(BooksContext)?.books ?? [];
  const [bookId, setBookId] = useState<string | null>(null);
  const [chapter, setChapter] = useState("");
  const [error, setError] = useState("");
  const save = () => {
    if (!bookId) return setError("Escolha o livro.");
    const err = p.addChapter(bookId, Number(chapter));
    setError(err ?? "");
    if (!err) setChapter("");
  };
  return (
    <View style={ui.card}>
      <CardTitle icon="bookmark-outline">Terminei um capítulo</CardTitle>
      <BookPicker value={bookId} onChange={setBookId} status={["lendo"]} />
      <View style={ui.row}>
        <TextInput style={[ui.input, { flex: 1 }]} value={chapter} onChangeText={(t) => setChapter(t.replace(/\D/g, ""))} placeholder="Nº do capítulo" placeholderTextColor="#9E94AB" keyboardType="number-pad" />
        <TouchableOpacity style={[ui.smallButton, { marginTop: 0 }]} onPress={save}>
          <Text style={ui.smallButtonText}>Registrar</Text>
        </TouchableOpacity>
      </View>
      <Err text={error} />
      <Rule>Verificação: o livro precisa ter páginas registradas na Minha Estante nesta semana.</Rule>
      {p.chapters.slice(0, 6).map((c) => (
        <Text key={c.id} style={ui.listSub}>
          {formatDay(c.day)} · Cap. {c.chapter} · {books.find((b) => b.id === c.bookId)?.title ?? "livro removido"}
        </Text>
      ))}
    </View>
  );
}

function BookNoteCard() {
  const p = useContext(PlannerContext)!;
  const books = useContext(BooksContext)?.books ?? [];
  const [bookId, setBookId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const save = () => {
    if (!bookId) return setError("Escolha o livro.");
    const err = p.addBookNote(bookId, text);
    setError(err ?? "");
    if (!err) setText("");
  };
  return (
    <View style={ui.card}>
      <CardTitle icon="create-outline">O que aprendi na leitura</CardTitle>
      <BookPicker value={bookId} onChange={setBookId} status={["lendo", "concluido"]} />
      <TextInput style={[ui.input, ui.textArea]} value={text} onChangeText={setText} multiline placeholder="As ideias principais…" placeholderTextColor="#9E94AB" />
      <TouchableOpacity style={ui.smallButton} onPress={save}>
        <Text style={ui.smallButtonText}>Salvar anotação</Text>
      </TouchableOpacity>
      <Err text={error} />
      <Rule>Conclui ao salvar uma anotação de pelo menos 30 letras.</Rule>
      {p.bookNotes.slice(0, 5).map((n) => (
        <View key={n.id} style={ui.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={ui.listSub}>{formatDay(n.day)} · {books.find((b) => b.id === n.bookId)?.title ?? "livro"}</Text>
            <Text style={ui.desc}>{n.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const thisMonthFinished = (finishedAt: number | null, month: string) =>
  !!finishedAt && monthKey(new Date(finishedAt)) === month;

function BookMonthCard() {
  const p = useContext(PlannerContext)!;
  const books = useContext(BooksContext)?.books ?? [];
  const done = books.filter((b) => b.status === "concluido" && thisMonthFinished(b.finishedAt, p.month));
  const reading = books.filter((b) => b.status === "lendo");
  return (
    <View style={ui.card}>
      <CardTitle icon="book-outline">Livro do mês</CardTitle>
      {done.length ? (
        done.map((b) => (
          <Text key={b.id} style={ui.ok}>
            Terminado: {b.title}
          </Text>
        ))
      ) : (
        <Text style={ui.hint}>Nenhum livro terminado neste mês ainda.</Text>
      )}
      {reading.map((b) => (
        <Progress key={b.id} value={b.currentPage} goal={b.pages ?? Math.max(b.currentPage, 1)} label={`pág. · ${b.title}`} />
      ))}
      <TouchableOpacity style={ui.smallButton} onPress={() => router.push("/bookshelf")}>
        <Text style={ui.smallButtonText}>Abrir Minha Estante</Text>
      </TouchableOpacity>
      <Rule>Só conclui quando a estante tem um livro terminado no mês, com leitura registrada.</Rule>
    </View>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={[ui.row, { marginTop: 8 }]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} accessibilityLabel={`${n} estrelas`} hitSlop={4}>
          <Ionicons name={n <= value ? "star" : "star-outline"} size={22} color="#FCD34D" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReviewCard() {
  const p = useContext(PlannerContext)!;
  const books = useContext(BooksContext)?.books ?? [];
  const [bookId, setBookId] = useState<string | null>(null);
  const existing = p.reviews.find((r) => r.bookId === bookId);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const choose = (id: string) => {
    setBookId(id);
    const r = p.reviews.find((x) => x.bookId === id);
    setText(r?.text ?? "");
    setRating(r?.rating ?? 0);
    setIsPublic(r?.isPublic ?? true);
    setSaved("");
  };
  const save = () => {
    if (!bookId) return setError("Escolha um livro terminado.");
    const err = p.saveReview(bookId, text, rating, isPublic);
    setError(err ?? "");
    if (!err) setSaved(isPublic ? "Resenha salva e visível no seu perfil para os amigos." : "Resenha salva (só para você).");
  };
  return (
    <View style={ui.card}>
      <CardTitle icon="chatbox-ellipses-outline">Resenha</CardTitle>
      <BookPicker value={bookId} onChange={choose} status={["concluido"]} />
      {bookId ? (
        <>
          <Stars value={rating} onChange={setRating} />
          <TextInput style={[ui.input, ui.textArea]} value={text} onChangeText={setText} multiline placeholder="O que achou? Para quem você recomenda?" placeholderTextColor="#9E94AB" />
          <Text style={ui.listSub}>{text.trim().length}/100 letras no mínimo</Text>
          <View style={[ui.rowBetween, { marginTop: 8 }]}>
            <Text style={[ui.desc, { marginTop: 0 }]}>Pública para os amigos</Text>
            <TouchableOpacity style={[ui.toggle, isPublic && ui.toggleOn]} onPress={() => setIsPublic(!isPublic)} accessibilityRole="switch" aria-checked={isPublic}>
              <Text style={ui.toggleText}>{isPublic ? "Sim" : "Não"}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={ui.smallButton} onPress={save}>
            <Text style={ui.smallButtonText}>{existing ? "Salvar alterações" : "Publicar resenha"}</Text>
          </TouchableOpacity>
        </>
      ) : null}
      <Err text={error} />
      {saved ? <Text style={ui.ok}>{saved}</Text> : null}
      <Rule>Conclui com uma resenha de 100+ letras de um livro que você terminou.</Rule>
      {p.reviews.slice(0, 4).map((r) => (
        <Text key={r.id} style={ui.listSub}>
          {r.rating}/5 estrelas · {books.find((b) => b.id === r.bookId)?.title ?? "livro"} · {r.isPublic ? "pública" : "privada"}
        </Text>
      ))}
    </View>
  );
}

function LibraryCard() {
  const p = useContext(PlannerContext)!;
  const books = useContext(BooksContext);
  const [place, setPlace] = useState("");
  const [bookId, setBookId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const visit = p.library.find((v) => v.month === p.month);
  const chosen = books?.books.find((b) => b.id === visit?.bookId);

  const save = () => {
    let id = bookId;
    if (!id && newTitle.trim() && books) {
      const res = books.addBook({ title: newTitle, status: "quero" });
      if (res.error) return setError(res.error);
      id = res.id ?? null;
    }
    const err = p.visitLibrary(place, id);
    setError(err ?? "");
  };

  if (visit) {
    return (
      <View style={ui.card}>
        <CardTitle icon="library-outline">Visita do mês</CardTitle>
        <Text style={ui.ok}>
          {visit.place} · livro do mês: {chosen?.title ?? "—"}
        </Text>
        {chosen ? (
          <Progress value={chosen.currentPage} goal={chosen.pages ?? Math.max(1, chosen.currentPage)} label="páginas" />
        ) : null}
        <Text style={ui.hint}>Agora é ler e terminar até o fim do mês.</Text>
      </View>
    );
  }
  return (
    <View style={ui.card}>
      <CardTitle icon="library-outline">Visitar uma biblioteca ou livraria</CardTitle>
      <TextInput style={ui.input} value={place} onChangeText={setPlace} placeholder="Onde você foi?" placeholderTextColor="#9E94AB" />
      <Text style={ui.subTitle}>Livro escolhido para o mês</Text>
      <BookPicker value={bookId} onChange={setBookId} status={["quero", "lendo"]} />
      <TextInput style={ui.input} value={newTitle} onChangeText={setNewTitle} placeholder="…ou escreva o título de um livro novo" placeholderTextColor="#9E94AB" />
      <TouchableOpacity style={ui.smallButton} onPress={save}>
        <Text style={ui.smallButtonText}>Registrar visita</Text>
      </TouchableOpacity>
      <Err text={error} />
      <Rule>Conclui ao registrar o lugar e o livro do mês (ele entra na sua estante).</Rule>
    </View>
  );
}

// ---------- Saúde e atividade ----------

function MealsCard() {
  const p = useContext(PlannerContext)!;
  const todayIndex = new Date().getDay();
  const [day, setDay] = useState(todayIndex);
  const [slot, setSlot] = useState<MealSlot>("almoco");
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [goal, setGoal] = useState(p.kcalGoal ? String(p.kcalGoal) : "");
  const [error, setError] = useState("");

  const kcalOf = (d: number) => p.mealsOf(d).reduce((s, m) => s + m.kcal, 0);
  const weekTotal = WEEK_ORDER.reduce((s, d) => s + kcalOf(d), 0);
  const planned = WEEK_ORDER.filter((d) => p.mealsOf(d).length >= 2).length;

  const add = () => {
    const err = p.addMeal(day, slot, name, kcal ? num(kcal) : 0);
    setError(err ?? "");
    if (!err) {
      setName("");
      setKcal("");
    }
  };

  return (
    <View style={ui.card}>
      <CardTitle icon="restaurant-outline">Plano de refeições da semana</CardTitle>
      {/* Quadro estilo planilha: dias x refeições */}
      <View style={{ marginTop: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 8, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", backgroundColor: "#5B21B6" }}>
          <Text style={[gridCell, { flex: 0.8, fontWeight: "700" }]}>Dia</Text>
          {MEAL_SLOTS.map((s) => (
            <Text key={s.id} style={[gridCell, { fontWeight: "700" }]}>{s.label}</Text>
          ))}
          <Text style={[gridCell, { flex: 0.8, fontWeight: "700" }]}>kcal</Text>
        </View>
        {WEEK_ORDER.map((d) => (
          <TouchableOpacity key={d} onPress={() => setDay(d)} style={{ flexDirection: "row", backgroundColor: d === day ? "rgba(124,58,237,0.25)" : "transparent" }}>
            <Text style={[gridCell, { flex: 0.8, fontWeight: d === todayIndex ? "700" : "400" }]}>{DAY_SHORT[d]}</Text>
            {MEAL_SLOTS.map((s) => (
              <Text key={s.id} style={gridCell} numberOfLines={2}>
                {p.mealsOf(d).filter((m) => m.slot === s.id).map((m) => m.name).join(", ") || "—"}
              </Text>
            ))}
            <Text style={[gridCell, { flex: 0.8 }]}>{kcalOf(d) || "—"}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={ui.meta}>
        Semana: {weekTotal} kcal{p.kcalGoal ? ` · meta ${p.kcalGoal}/dia` : ""} · {planned}/5 dias planejados
      </Text>

      <Text style={ui.subTitle}>Adicionar em {DAY_SHORT[day]}</Text>
      <View style={ui.chips}>
        {MEAL_SLOTS.map((s) => (
          <TouchableOpacity key={s.id} style={[ui.chipSmall, slot === s.id && ui.chipActive]} onPress={() => setSlot(s.id)}>
            <Text style={ui.chipText}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={ui.row}>
        <TextInput style={[ui.input, { flex: 2 }]} value={name} onChangeText={setName} placeholder="O que vai comer" placeholderTextColor="#9E94AB" />
        <TextInput style={[ui.input, { flex: 1 }]} value={kcal} onChangeText={(t) => setKcal(t.replace(/[^\d]/g, ""))} placeholder="kcal" placeholderTextColor="#9E94AB" keyboardType="number-pad" />
      </View>
      <TouchableOpacity style={ui.smallButton} onPress={add}>
        <Text style={ui.smallButtonText}>Adicionar refeição</Text>
      </TouchableOpacity>
      <Err text={error} />
      {p.mealsOf(day).map((m) => (
        <View key={m.id} style={ui.listRow}>
          <Text style={ui.listText}>
            {MEAL_SLOTS.find((s) => s.id === m.slot)?.label}: {m.name}
          </Text>
          <Text style={ui.listSub}>{m.kcal} kcal</Text>
          <Remove label={`Remover ${m.name}`} onPress={() => p.removeMeal(day, m.id)} />
        </View>
      ))}
      <View style={[ui.row, { marginTop: 8 }]}>
        <Text style={[ui.desc, { marginTop: 0, flex: 1 }]}>Meta de calorias por dia</Text>
        <TextInput style={ui.timeInput} value={goal} onChangeText={(t) => setGoal(t.replace(/\D/g, ""))} onBlur={() => p.setKcalGoal(goal ? Number(goal) : null)} keyboardType="number-pad" placeholder="2000" placeholderTextColor="#9E94AB" />
      </View>
      {p.kcalGoal && kcalOf(day) > p.kcalGoal ? <Text style={ui.warn}>{DAY_SHORT[day]} passou da meta de calorias.</Text> : null}
      <Rule>Conclui quando 5 dias da semana têm pelo menos 2 refeições planejadas.</Rule>
    </View>
  );
}

const gridCell = { flex: 1, color: "#FFF", fontSize: 10, paddingVertical: 6, paddingHorizontal: 3, textAlign: "center" as const };

function TrainingCard() {
  const p = useContext(PlannerContext)!;
  const [error, setError] = useState("");
  const days = weekDays();
  return (
    <View style={ui.card}>
      <CardTitle icon="barbell-outline">Treinos da semana</CardTitle>
      <Text style={ui.hint}>Marque os dias em que você treinou. “Treinar 30 minutos” concluído também conta.</Text>
      <View style={[ui.row, { marginTop: 12, justifyContent: "space-between" }]}>
        {WEEK_ORDER.map((d, i) => {
          const on = p.trainedThisWeek.includes(d);
          const future = days[i] > p.today;
          return (
            <TouchableOpacity
              key={d}
              disabled={future}
              onPress={() => setError(p.toggleTraining(d) ?? "")}
              accessibilityRole="checkbox"
              aria-checked={on}
              accessibilityLabel={DAY_SHORT[d]}
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 52,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: on ? "#36D35B" : "#5B21B6",
                backgroundColor: on ? "#15A638" : "transparent",
                opacity: future ? 0.35 : 1,
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 11 }}>{DAY_SHORT[d]}</Text>
              <Ionicons name={on ? "checkmark" : "ellipse-outline"} size={16} color="#FFF" />
            </TouchableOpacity>
          );
        })}
      </View>
      <Progress value={Math.min(p.trainedThisWeek.length, 3)} goal={3} label="treinos" />
      <Err text={error} />
      <Rule>Conclui com 3 dias de treino. Dias futuros não dá para marcar.</Rule>
    </View>
  );
}

function TargetEditor({ taskId, unit }: { taskId: string; unit: string }) {
  const p = useContext(PlannerContext)!;
  const [value, setValue] = useState(String(p.targetOf(taskId)));
  const [error, setError] = useState("");
  return (
    <>
      <View style={[ui.row, { marginTop: 10 }]}>
        <Text style={[ui.desc, { marginTop: 0, flex: 1 }]}>Sua meta do mês ({unit})</Text>
        <TextInput style={ui.timeInput} value={value} onChangeText={(t) => setValue(t.replace(/[^\d]/g, ""))} keyboardType="number-pad" />
        <TouchableOpacity style={[ui.chipSmall]} onPress={() => setError(p.setTarget(taskId, Number(value)) ?? "")}>
          <Text style={ui.chipText}>Salvar</Text>
        </TouchableOpacity>
      </View>
      <Err text={error} />
    </>
  );
}

function TrainingMonthCard() {
  const p = useContext(PlannerContext)!;
  return (
    <View style={ui.card}>
      <CardTitle icon="fitness-outline">Treinos do mês</CardTitle>
      <Progress value={p.trainingsThisMonth} goal={p.targetOf(TRAINING_MONTH_TASK)} label="treinos" />
      <TargetEditor taskId={TRAINING_MONTH_TASK} unit="treinos" />
      <Rule>Conta os dias com “Treinar 30 minutos” concluído ou marcados em “Treinar 3 vezes na semana”. A meta só pode subir.</Rule>
    </View>
  );
}

function RunsCard() {
  const p = useContext(PlannerContext)!;
  const [km, setKm] = useState("");
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState("");
  const monthRuns = p.runs.filter((r) => `M${r.day.slice(0, 7)}` === p.month);
  const totalMin = monthRuns.reduce((s, r) => s + r.minutes, 0);
  const pace = p.runKmThisMonth ? totalMin / p.runKmThisMonth : 0;
  const best = monthRuns.reduce((b, r) => Math.max(b, r.km), 0);
  const add = () => {
    const err = p.addRun(num(km), num(minutes));
    setError(err ?? "");
    if (!err) {
      setKm("");
      setMinutes("");
    }
  };
  return (
    <View style={ui.card}>
      <CardTitle icon="walk-outline">Corridas do mês</CardTitle>
      <View style={ui.row}>
        <TextInput style={[ui.input, { flex: 1 }]} value={km} onChangeText={setKm} placeholder="km" placeholderTextColor="#9E94AB" keyboardType="decimal-pad" />
        <TextInput style={[ui.input, { flex: 1 }]} value={minutes} onChangeText={(t) => setMinutes(t.replace(/\D/g, ""))} placeholder="minutos" placeholderTextColor="#9E94AB" keyboardType="number-pad" />
        <TouchableOpacity style={[ui.smallButton, { marginTop: 0 }]} onPress={add}>
          <Text style={ui.smallButtonText}>Registrar</Text>
        </TouchableOpacity>
      </View>
      <Err text={error} />
      <Progress value={p.runKmThisMonth} goal={p.targetOf(RUN_MONTH_TASK)} label="km" />
      {/* Relatório do mês */}
      <Text style={ui.subTitle}>Relatório do mês</Text>
      <Text style={ui.meta}>
        {monthRuns.length} corrida(s) · {p.runKmThisMonth} km · maior: {best} km
        {pace ? ` · ritmo médio ${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, "0")} min/km` : ""}
      </Text>
      <TargetEditor taskId={RUN_MONTH_TASK} unit="km" />
      {monthRuns.slice(0, 8).map((r) => (
        <View key={r.id} style={ui.listRow}>
          <Text style={ui.listText}>
            {formatDay(r.day)} · {r.km} km em {r.minutes} min
          </Text>
          <Remove label="Apagar corrida" onPress={() => askRemove("Apagar corrida?", () => p.removeRun(r.id))} />
        </View>
      ))}
      <Rule>Conclui quando a soma do mês bate a sua meta. Ritmos impossíveis não são aceitos.</Rule>
    </View>
  );
}

function DayCountCard({ taskId }: { taskId: string }) {
  const p = useContext(PlannerContext)!;
  const rule = DAY_COUNT_TASKS[taskId];
  if (!rule) return null;
  const sources = rule.sources.map((s) => CATALOG_BY_ID[s]?.title).filter(Boolean).join(", ");
  return (
    <View style={ui.card}>
      <CardTitle icon="calendar-number-outline">Contagem do mês</CardTitle>
      <Progress value={p.dayCount(taskId)} goal={p.targetOf(taskId)} label={rule.label} />
      <TargetEditor taskId={taskId} unit="dias" />
      <Rule>Conta sozinho os dias em que você concluiu: {sources}. Coloque essa diária na rotina.</Rule>
    </View>
  );
}

function HobbiesCard() {
  const p = useContext(PlannerContext)!;
  const [hobbyId, setHobbyId] = useState<string | null>(p.hobbies[0]?.id ?? null);
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [newHobby, setNewHobby] = useState("");
  const [error, setError] = useState("");
  const log = () => {
    if (!hobbyId) return setError("Escolha um hobby.");
    const err = p.logHobby(hobbyId, Number(minutes), note);
    setError(err ?? "");
    if (!err) {
      setMinutes("");
      setNote("");
    }
  };
  return (
    <View style={ui.card}>
      <CardTitle icon="color-palette-outline">Meus hobbies</CardTitle>
      <Text style={ui.hint}>Natureza, música, jogos, arte… Junte tudo aqui e some 1 hora na semana.</Text>
      <View style={ui.chips}>
        {p.hobbies.map((h) => (
          <TouchableOpacity
            key={h.id}
            style={[ui.chipSmall, hobbyId === h.id && ui.chipActive]}
            onPress={() => setHobbyId(h.id)}
            onLongPress={() => askRemove(`Tirar ${h.name} da lista?`, () => p.removeHobby(h.id))}
          >
            <Text style={ui.chipText}>{h.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={ui.row}>
        <TextInput style={[ui.input, { flex: 1 }]} value={newHobby} onChangeText={setNewHobby} placeholder="Novo hobby" placeholderTextColor="#9E94AB" />
        <TouchableOpacity
          style={[ui.chipSmall]}
          onPress={() => {
            const err = p.addHobby(newHobby);
            setError(err ?? "");
            if (!err) setNewHobby("");
          }}
        >
          <Text style={ui.chipText}>Adicionar</Text>
        </TouchableOpacity>
      </View>
      <View style={ui.row}>
        <TextInput style={[ui.input, { width: 90 }]} value={minutes} onChangeText={(t) => setMinutes(t.replace(/\D/g, ""))} placeholder="min" placeholderTextColor="#9E94AB" keyboardType="number-pad" />
        <TextInput style={[ui.input, { flex: 1 }]} value={note} onChangeText={setNote} placeholder="O que fez (opcional)" placeholderTextColor="#9E94AB" />
      </View>
      <TouchableOpacity style={ui.smallButton} onPress={log}>
        <Text style={ui.smallButtonText}>Registrar tempo</Text>
      </TouchableOpacity>
      <Err text={error} />
      <Progress value={Math.min(p.hobbyMinutesThisWeek, 60)} goal={60} label="min na semana" />
      {p.hobbyLogs.slice(0, 5).map((l) => (
        <Text key={l.id} style={ui.listSub}>
          {formatDay(l.day)} · {p.hobbies.find((h) => h.id === l.hobbyId)?.name ?? "hobby"} · {l.minutes} min{l.note ? ` · ${l.note}` : ""}
        </Text>
      ))}
      <Rule>Conclui ao somar 60 minutos de hobbies na semana. Segure um hobby para tirar da lista.</Rule>
    </View>
  );
}

// ---------- Produtividade ----------

function WeekPlanCard() {
  const p = useContext(PlannerContext)!;
  const filledDays = WEEK_ORDER.filter((d) => PLAN_SLOTS.some((_, s) => p.planCell(d, s).trim())).length;
  return (
    <View style={ui.card}>
      <CardTitle icon="grid-outline">Quadro da semana</CardTitle>
      <Text style={ui.hint}>Como uma planilha: escreva o que vai fazer em cada turno.</Text>
      <View style={{ marginTop: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 8, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", backgroundColor: "#5B21B6" }}>
          <Text style={[gridCell, { flex: 0.6, fontWeight: "700" }]}> </Text>
          {PLAN_SLOTS.map((s) => (
            <Text key={s} style={[gridCell, { fontWeight: "700" }]}>{s}</Text>
          ))}
        </View>
        {WEEK_ORDER.map((d) => (
          <View key={d} style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}>
            <Text style={[gridCell, { flex: 0.6, fontWeight: "600" }]}>{DAY_SHORT[d]}</Text>
            {PLAN_SLOTS.map((_, s) => (
              <TextInput
                key={s}
                value={p.planCell(d, s)}
                onChangeText={(t) => p.setPlanCell(d, s, t)}
                placeholder="—"
                placeholderTextColor="#6B5A85"
                multiline
                style={{ flex: 1, color: "#FFF", fontSize: 11, padding: 4, minHeight: 38, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.06)" }}
                accessibilityLabel={`${DAY_SHORT[d]} ${PLAN_SLOTS[s]}`}
              />
            ))}
          </View>
        ))}
      </View>
      <Progress value={Math.min(filledDays, 5)} goal={5} label="dias planejados" />
      <Rule>Conclui quando 5 dias da semana têm algo planejado.</Rule>
    </View>
  );
}

function AgendaLinkCard() {
  const p = useContext(PlannerContext)!;
  const upcoming = p.events.filter((e) => e.day >= p.today).sort((a, b) => (a.day + (a.time ?? "")).localeCompare(b.day + (b.time ?? "")));
  return (
    <View style={ui.card}>
      <CardTitle icon="calendar-outline">Minha agenda</CardTitle>
      {upcoming.slice(0, 5).map((e) => (
        <Text key={e.id} style={ui.listSub}>
          {formatDay(e.day)}
          {e.time ? ` ${e.time}` : ""} · {e.title}
        </Text>
      ))}
      {upcoming.length === 0 ? <Text style={ui.hint}>Nada marcado para os próximos dias.</Text> : null}
      <TouchableOpacity style={ui.smallButton} onPress={() => router.push("/agenda")}>
        <Text style={ui.smallButtonText}>Abrir agenda</Text>
      </TouchableOpacity>
      <Rule>Conclui ao colocar 2 compromissos futuros na agenda durante a semana.</Rule>
    </View>
  );
}

function GoalCardsCard({ nextMonth }: { nextMonth: boolean }) {
  const p = useContext(PlannerContext)!;
  const cards = nextMonth ? p.goalCards.filter((g) => g.month === nextMonthLabelKey()) : p.goalCards;
  const [index, setIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [error, setError] = useState("");
  const current = cards[index % Math.max(cards.length, 1)];
  const reviewed = p.goalReviews.filter((r) => r.period === p.week).length;

  const add = () => {
    const err = p.addGoalCard(title, why, nextMonth);
    setError(err ?? "");
    if (!err) {
      setTitle("");
      setWhy("");
    }
  };

  return (
    <View style={ui.card}>
      <CardTitle icon="flag-outline">{nextMonth ? "Metas do próximo mês" : "Cartões das suas metas"}</CardTitle>
      {!nextMonth && current ? (
        <View style={{ backgroundColor: "#5B21B6", borderRadius: 12, padding: 14, marginTop: 10 }}>
          <Text style={ui.listSub}>
            Meta {(index % cards.length) + 1} de {cards.length}
          </Text>
          <Text style={[ui.cardTitle, { fontSize: 17, marginTop: 4 }]}>{current.title}</Text>
          {current.why ? <Text style={ui.desc}>Por quê: {current.why}</Text> : null}
          <View style={[ui.row, { marginTop: 12 }]}>
            <TouchableOpacity
              style={[ui.chip, p.goalStatus(current.id) === "ok" && { backgroundColor: "#15A638", borderColor: "#36D35B" }]}
              onPress={() => {
                p.reviewGoal(current.id, "ok");
                setIndex(index + 1);
              }}
            >
              <Text style={ui.chipText}>No caminho</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ui.chip, p.goalStatus(current.id) === "ajustar" && { backgroundColor: "#B45309", borderColor: "#FCD34D" }]}
              onPress={() => {
                p.reviewGoal(current.id, "ajustar");
                setIndex(index + 1);
              }}
            >
              <Text style={ui.chipText}>Preciso ajustar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {!nextMonth && cards.length ? <Progress value={Math.min(reviewed, cards.length)} goal={cards.length} label="revisadas nesta semana" /> : null}

      <Text style={ui.subTitle}>Nova meta</Text>
      <TextInput style={ui.input} value={title} onChangeText={setTitle} placeholder="Ex.: passar em Cálculo I" placeholderTextColor="#9E94AB" />
      <TextInput style={ui.input} value={why} onChangeText={setWhy} placeholder="Por que é importante? (opcional)" placeholderTextColor="#9E94AB" />
      <TouchableOpacity style={ui.smallButton} onPress={add}>
        <Text style={ui.smallButtonText}>Criar cartão</Text>
      </TouchableOpacity>
      <Err text={error} />
      {(nextMonth ? cards : p.goalCards).map((g) => (
        <View key={g.id} style={ui.listRow}>
          <Text style={ui.listText}>{g.title}</Text>
          <Remove label={`Apagar ${g.title}`} onPress={() => askRemove("Apagar meta?", () => p.removeGoalCard(g.id))} />
        </View>
      ))}
      <Rule>{nextMonth ? "Conclui com 3 metas criadas para o mês que vem." : "Conclui quando você revisa todos os cartões na semana."}</Rule>
    </View>
  );
}

const nextMonthLabelKey = () => {
  const d = new Date();
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `M${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};

// ---------- Sono ----------

function SleepCompareCard({ scope }: { scope: "week" | "month" }) {
  const extras = useContext(TaskExtrasContext)!;
  const p = useContext(PlannerContext)!;
  const days = weekDays();
  const logs = extras.sleepLogs.filter((l) => (scope === "week" ? days.includes(l.day) : `M${l.day.slice(0, 7)}` === p.month));
  const spread = bedtimeSpread(logs.map((l) => l.slept));
  const goal = scope === "week" ? 5 : 20;
  const avg = logs.length ? Math.round((logs.reduce((s, l) => s + l.hours, 0) / logs.length) * 10) / 10 : 0;
  return (
    <View style={ui.card}>
      <CardTitle icon="moon-outline">{scope === "week" ? "Comparar horários da semana" : "Relatório do sono do mês"}</CardTitle>
      {scope === "week" ? (
        days.map((day, i) => {
          const l = logs.find((x) => x.day === day);
          return (
            <View key={day} style={[ui.rowBetween, { marginTop: 6 }]}>
              <Text style={ui.meta}>{DAY_SHORT[(i + 1) % 7]}</Text>
              <Text style={ui.desc}>{l ? `dormiu ${l.slept} · acordou ${l.woke} · ${l.hours} h` : "—"}</Text>
            </View>
          );
        })
      ) : (
        <Text style={ui.meta}>{logs.length} noites registradas · média de {avg} h</Text>
      )}
      <Progress value={Math.min(logs.length, goal)} goal={goal} label="noites registradas" />
      <Text style={spread <= 60 ? ui.ok : ui.warn}>
        Diferença entre o horário mais cedo e o mais tarde de dormir: {Math.floor(spread / 60)}h{String(spread % 60).padStart(2, "0")}
      </Text>
      <Rule>Conclui com {goal} noites registradas em “Como foi a noite” e até 1 hora de diferença no horário de dormir.</Rule>
    </View>
  );
}

// ---------- Projetos, encontro e prova ----------

function ProjectsLinkCard({ kind, weekly }: { kind: "curso" | "projeto" | "criacao" | "any"; weekly: boolean }) {
  const p = useContext(PlannerContext)!;
  const list = p.projects.filter((x) => kind === "any" || (kind === "criacao" ? !!x.creation : x.kind === kind)).filter((x) => !x.doneAt);
  return (
    <View style={ui.card}>
      <CardTitle icon="layers-outline">Desenvolvimento pessoal{kind === "criacao" ? " · Criações" : kind !== "any" ? ` · ${KIND_LABEL[kind]}` : ""}</CardTitle>
      <Text style={ui.hint}>Cursos e projetos (com as suas criações) ficam num lugar só, com prazo, progresso e anexos.</Text>
      {list.slice(0, 4).map((x) => (
        <View key={x.id} style={ui.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={ui.listText}>{x.title}</Text>
            <Text style={ui.listSub}>
              {KIND_LABEL[x.kind]} · progresso em {projectProgressDays(x)} dia(s){x.deadline ? ` · prazo ${formatDay(x.deadline)}` : ""}
            </Text>
          </View>
        </View>
      ))}
      <TouchableOpacity style={ui.smallButton} onPress={() => router.push({ pathname: "/projects", params: { kind: kind === "any" ? "" : kind } })}>
        <Text style={ui.smallButtonText}>Abrir a Área de desenvolvimento pessoal</Text>
      </TouchableOpacity>
      <Rule>
        {weekly
          ? kind === "curso"
            ? "A semanal conclui quando você registra uma aula num curso."
            : "A semanal conclui quando você registra um avanço."
          : `Conclui ao marcar como concluído, com progresso registrado em ${PROJECT_MIN_DAYS}+ dias diferentes.`}
      </Rule>
    </View>
  );
}

function MeetupCard() {
  const groups = useContext(GroupsContext)?.groups ?? [];
  const p = useContext(PlannerContext)!;
  const meetups = groups.flatMap((g) => (g.events ?? []).filter((e) => `M${e.day.slice(0, 7)}` === p.month).map((e) => ({ ...e, group: g.name })));
  return (
    <View style={ui.card}>
      <CardTitle icon="people-outline">Encontro com amigos</CardTitle>
      <Text style={ui.hint}>Marque o encontro dentro de um grupo. Ele vira convite para os membros e entra na agenda de todos.</Text>
      {meetups.map((e) => (
        <Text key={e.id} style={ui.ok}>
          {formatDay(e.day)}
          {e.time ? ` ${e.time}` : ""} · {e.title} ({e.group})
        </Text>
      ))}
      <TouchableOpacity style={ui.smallButton} onPress={() => router.push("/groups")}>
        <Text style={ui.smallButtonText}>Abrir meus grupos</Text>
      </TouchableOpacity>
      <Rule>Conclui quando você marca um encontro num grupo para este mês.</Rule>
    </View>
  );
}

function ProofCard({ taskId }: { taskId: string }) {
  const p = useContext(PlannerContext)!;
  const [text, setText] = useState("");
  const [file, setFile] = useState<FileRef | null>(null);
  const [error, setError] = useState("");
  const list = p.proofsOf(taskId);
  const save = () => {
    const err = p.addProof(taskId, text, file);
    setError(err ?? "");
    if (!err) {
      setText("");
      setFile(null);
    }
  };
  return (
    <View style={ui.card}>
      <CardTitle icon="camera-outline">Registrar como foi</CardTitle>
      <View style={ui.chips}>
        <TouchableOpacity style={ui.chip} onPress={async () => setFile((await pickImage()) ?? file)}>
          <Text style={ui.chipText}>
            <Ionicons name="camera-outline" /> {file?.kind === "image" ? "Trocar foto" : "Anexar foto"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={ui.chip} onPress={async () => setFile((await pickDocument()) ?? file)}>
          <Text style={ui.chipText}>
            <Ionicons name="document-attach-outline" /> {file?.kind === "document" ? "Trocar documento" : "Anexar documento"}
          </Text>
        </TouchableOpacity>
      </View>
      {file ? (
        <View style={ui.listRow}>
          {file.kind === "image" ? (
            <ZoomablePhoto uri={file.uri} style={{ width: 120, height: 120, borderRadius: 8 }} label="Foto anexada" />
          ) : (
            <Ionicons name="document-text-outline" size={22} color="#DDD6FE" />
          )}
          <Text style={[ui.listSub, { flex: 1 }]} numberOfLines={1}>
            {file.name}
          </Text>
          <TouchableOpacity onPress={() => setFile(null)} hitSlop={8} accessibilityLabel="Remover anexo">
            <Ionicons name="close-circle-outline" size={20} color="#F87171" />
          </TouchableOpacity>
        </View>
      ) : null}
      <TextInput style={[ui.input, ui.textArea, { minHeight: 70 }]} value={text} onChangeText={setText} multiline placeholder="Quer contar como foi? (opcional)" placeholderTextColor="#9E94AB" />
      <TouchableOpacity style={[ui.smallButton, !file && { opacity: 0.5 }]} onPress={save}>
        <Text style={ui.smallButtonText}>Salvar e concluir</Text>
      </TouchableOpacity>
      <Err text={error} />
      <Rule>Só conclui com uma foto ou um documento como comprovante. Contar como foi é opcional.</Rule>
      {list.slice(0, 5).map((pf) => (
        <View key={pf.id} style={ui.listRow}>
          {pf.file?.kind === "image" ? <ZoomablePhoto uri={pf.file.uri} style={{ width: 96, height: 96, borderRadius: 8 }} label="Comprovante" caption={pf.text || undefined} /> : <Ionicons name="document-text-outline" size={18} color="#DDD6FE" />}
          <View style={{ flex: 1 }}>
            <Text style={ui.listSub}>{formatDay(dayKey(new Date(pf.at)))}</Text>
            {pf.text ? <Text style={ui.desc}>{pf.text}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}
