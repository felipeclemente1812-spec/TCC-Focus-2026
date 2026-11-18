import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useContext, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ZoomablePhoto } from "@/components/PhotoViewer";
import { CardTitle, formatDay, maskDate, ScreenShell, ui } from "@/components/ScreenShell";
import { dayKey } from "@/constants/gamification";
import {
  KIND_LABEL,
  PlannerContext,
  Project,
  PROJECT_MIN_DAYS,
  ProjectKind,
  projectProgressDays,
} from "@/context/PlannerContext";
import { confirmAction } from "@/utils/feedback";
import { openFile, pickDocument, pickImage, shareContent } from "@/utils/files";
import { UsageMeter } from "@/components/PremiumGate";

const KINDS: ProjectKind[] = ["curso", "projeto"];
type Filter = ProjectKind | "todos";
// Dentro de "Projeto": todos ou só as criações
type Sub = "todos" | "criacoes" | "outros";

// Cada categoria tem cor, ícone e textos próprios: ao trocar de categoria,
// o topo, os cartões e os campos mudam junto.
const THEME: Record<
  Filter | "criacao",
  {
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
    tagline: string;
    namePlaceholder: string;
    notePlaceholder: string;
    noteButton: string;
    empty: string;
  }
> = {
  todos: {
    color: "#A78BFA",
    icon: "layers-outline",
    tagline: "Tudo o que você está desenvolvendo, separado por categoria.",
    namePlaceholder: "Nome",
    notePlaceholder: "O que você avançou hoje?",
    noteButton: "Registrar progresso",
    empty: "Nada aqui ainda. Toque em ＋ para começar.",
  },
  curso: {
    color: "#0EA5E9",
    icon: "school-outline",
    tagline: "Cursos online ou presenciais. Anote cada aula ou módulo concluído.",
    namePlaceholder: "Nome do curso (ex.: Excel básico)",
    notePlaceholder: "Qual aula ou módulo você fez hoje?",
    noteButton: "Registrar aula",
    empty: "Nenhum curso ainda. Cadastre o curso que você está fazendo.",
  },
  projeto: {
    color: "#7C3AED",
    icon: "rocket-outline",
    tagline: "Projetos da escola, do trabalho ou pessoais. Defina o que é “entregue”.",
    namePlaceholder: "Nome do projeto (ex.: TCC, site, feira)",
    notePlaceholder: "O que você avançou no projeto hoje?",
    noteButton: "Registrar avanço",
    empty: "Nenhum projeto ainda. Comece pelo que precisa entregar.",
  },
  // Projeto marcado como criação (cor e textos próprios no cartão)
  criacao: {
    color: "#EC4899",
    icon: "color-palette-outline",
    tagline: "Desenhos, músicas, textos, vídeos… Guarde fotos do que você criou.",
    namePlaceholder: "O que vai criar? (ex.: Desenho, música)",
    notePlaceholder: "O que você criou ou mudou hoje?",
    noteButton: "Registrar sessão",
    empty: "Nenhuma criação ainda. Que tal começar uma obra?",
  },
};

// Área de desenvolvimento pessoal: cursos e projetos (com as criações separadas
// dentro de Projeto) num só lugar, com prazo, diário de progresso e anexos. Concluir exige
// progresso em dias diferentes.
export default function Projects() {
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const planner = useContext(PlannerContext);
  // "criacao" (desafio "Terminar uma criação") abre Projeto já em Criações
  const paramKind = kindParam === "criacao" ? "projeto" : KINDS.includes(kindParam as ProjectKind) ? (kindParam as ProjectKind) : null;
  const [filter, setFilter] = useState<Filter>(paramKind ?? "todos");
  const [sub, setSub] = useState<Sub>(kindParam === "criacao" ? "criacoes" : "todos");
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<ProjectKind>(paramKind ?? "projeto");
  const [creation, setCreation] = useState(kindParam === "criacao");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hours, setHours] = useState("");
  const [error, setError] = useState("");

  if (!planner) return null;

  const showingCreations = filter === "projeto" && sub === "criacoes";
  const theme = THEME[showingCreations ? "criacao" : filter];
  const formTheme = THEME[kind === "projeto" && creation ? "criacao" : kind];
  const list = planner.projects
    .filter((p) => filter === "todos" || p.kind === filter)
    .filter((p) => filter !== "projeto" || sub === "todos" || (sub === "criacoes") === !!p.creation);
  const creations = planner.projects.filter((p) => p.creation).length;
  const ongoing = list.filter((p) => !p.doneAt).length;
  const done = list.length - ongoing;
  const toDay = (t: string) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(t);
    return m ? `20${m[3]}-${m[2]}-${m[1]}` : null;
  };

  const chooseFilter = (f: Filter) => {
    setFilter(f);
    if (f !== "todos") setKind(f);
  };

  const create = () => {
    if (deadline && !toDay(deadline)) return setError("Prazo no formato dd/mm/aa.");
    const err = planner.saveProject({
      kind,
      creation: kind === "projeto" && creation,
      title,
      description: description.trim(),
      start: dayKey(),
      deadline: deadline ? toDay(deadline) : null,
      hours: hours ? Number(hours) : null,
    });
    setError(err ?? "");
    if (!err) {
      setTitle("");
      setDescription("");
      setDeadline("");
      setHours("");
      setShowForm(false);
      if (filter !== "todos" && filter !== kind) setFilter(kind);
      if (kind === "projeto" && sub !== "todos") setSub(creation ? "criacoes" : "outros");
    }
  };

  return (
    <ScreenShell
      title="Área de desenvolvimento pessoal"
      fixed={
        <>
      <View style={[ui.chips, { marginTop: 0, marginBottom: 12 }]}>
        {(["todos", ...KINDS] as const).map((k) => (
          <TouchableOpacity
            key={k}
            style={[ui.chipSmall, styles.filterChip, filter === k && { backgroundColor: THEME[k].color, borderColor: THEME[k].color }]}
            onPress={() => chooseFilter(k)}
            accessibilityRole="tab"
            aria-selected={filter === k}
          >
            <Ionicons name={THEME[k].icon} size={13} color="#FFF" />
            <Text style={ui.chipText}>{k === "todos" ? "Todos" : KIND_LABEL[k]}</Text>
          </TouchableOpacity>
        ))}
      </View>
        </>
      }
      right={
        <TouchableOpacity onPress={() => setShowForm(!showForm)} hitSlop={10} accessibilityLabel="Novo">
          <Ionicons name={showForm ? "close" : "add-circle-outline"} size={26} color="#FFF" />
        </TouchableOpacity>
      }
    >
      {/* PROJETO: separar as criações */}
      {filter === "projeto" ? (
        <View style={styles.subTabs}>
          {(
            [
              ["todos", "Todos os projetos"],
              ["criacoes", `Criações (${creations})`],
              ["outros", "Outros projetos"],
            ] as const
          ).map(([id, label]) => (
            <TouchableOpacity
              key={id}
              style={[styles.subTab, sub === id && { backgroundColor: id === "criacoes" ? THEME.criacao.color : THEME.projeto.color }]}
              onPress={() => setSub(id)}
              accessibilityRole="tab"
              aria-selected={sub === id}
            >
              <Text style={styles.subTabText} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* PROJETO: separar as criações */}
      {filter === "projeto" ? (
        <View style={styles.subTabs}>
          {(
            [
              ["todos", "Todos os projetos"],
              ["criacoes", `Criações (${creations})`],
              ["outros", "Outros projetos"],
            ] as const
          ).map(([id, label]) => (
            <TouchableOpacity
              key={id}
              style={[styles.subTab, sub === id && { backgroundColor: id === "criacoes" ? THEME.criacao.color : THEME.projeto.color }]}
              onPress={() => setSub(id)}
              accessibilityRole="tab"
              aria-selected={sub === id}
            >
              <Text style={styles.subTabText} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <UsageMeter limit="projetos" label="Cursos e projetos em andamento" />

      {/* TOPO DA CATEGORIA */}
      <View style={[styles.hero, { borderColor: theme.color, backgroundColor: `${theme.color}26` }]}>
        <View style={[styles.heroIcon, { backgroundColor: theme.color }]}>
          <Ionicons name={theme.icon} size={26} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{filter === "todos" ? "Tudo" : showingCreations ? "Criações" : KIND_LABEL[filter]}</Text>
          <Text style={styles.heroText}>{theme.tagline}</Text>
          <View style={styles.heroStats}>
            <Text style={styles.heroStat}>{ongoing} em andamento</Text>
            <Text style={styles.heroStat}>{done} concluído(s)</Text>
          </View>
        </View>
      </View>

      {showForm ? (
        <View style={[ui.card, styles.formCard, { borderColor: formTheme.color }]}>
          <CardTitle icon={formTheme.icon}>Novo · {kind === "projeto" && creation ? "Criação" : KIND_LABEL[kind]}</CardTitle>
          <View style={ui.chips}>
            {KINDS.map((k) => (
              <TouchableOpacity
                key={k}
                style={[ui.chipSmall, kind === k && { backgroundColor: THEME[k].color, borderColor: THEME[k].color }]}
                onPress={() => setKind(k)}
              >
                <Text style={ui.chipText}>{KIND_LABEL[k]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {kind === "projeto" ? (
            <TouchableOpacity
              style={[ui.chipSmall, styles.filterChip, { alignSelf: "flex-start" }, creation && { backgroundColor: THEME.criacao.color, borderColor: THEME.criacao.color }]}
              onPress={() => setCreation(!creation)}
              accessibilityRole="checkbox"
              aria-checked={creation}
            >
              <Ionicons name={creation ? "checkbox" : "square-outline"} size={14} color="#FFF" />
              <Text style={ui.chipText}>É uma criação (desenho, música, texto…)</Text>
            </TouchableOpacity>
          ) : null}
          <TextInput style={ui.input} value={title} onChangeText={setTitle} placeholder={formTheme.namePlaceholder} placeholderTextColor="#9E94AB" />
          <TextInput style={[ui.input, { minHeight: 60 }]} value={description} onChangeText={setDescription} multiline placeholder="Meta / descrição (o que é ‘terminado’?)" placeholderTextColor="#9E94AB" />
          <View style={ui.row}>
            <TextInput style={[ui.input, { flex: 1 }]} value={deadline} onChangeText={(t) => setDeadline(maskDate(t))} placeholder="Prazo dd/mm/aa" placeholderTextColor="#9E94AB" keyboardType="number-pad" />
            {kind === "curso" ? (
              <TextInput style={[ui.input, { flex: 1 }]} value={hours} onChangeText={(t) => setHours(t.replace(/\D/g, ""))} placeholder="Carga (h)" placeholderTextColor="#9E94AB" keyboardType="number-pad" />
            ) : null}
          </View>
          <TouchableOpacity style={[ui.smallButton, { backgroundColor: formTheme.color }]} onPress={create}>
            <Text style={ui.smallButtonText}>Criar</Text>
          </TouchableOpacity>
          {error ? <Text style={ui.error}>{error}</Text> : null}
        </View>
      ) : null}

      {list.length === 0 ? (
        <View style={ui.card}>
          <Text style={ui.muted}>{theme.empty}</Text>
        </View>
      ) : filter === "todos" ? (
        // Em "Todos", separado por categoria
        KINDS.filter((k) => list.some((p) => p.kind === k)).map((k) => (
          <View key={k} style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => chooseFilter(k)} accessibilityRole="button">
              <Ionicons name={THEME[k].icon} size={16} color={THEME[k].color} />
              <Text style={styles.sectionTitle}>{KIND_LABEL[k]}</Text>
              <Ionicons name="chevron-forward" size={14} color="#C7BADB" />
            </TouchableOpacity>
            {list
              .filter((p) => p.kind === k)
              .map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
          </View>
        ))
      ) : (
        list.map((p) => <ProjectCard key={p.id} project={p} />)
      )}

      <Text style={[ui.muted, { fontSize: 11 }]}>
        Para concluir pelo app, registre o progresso em pelo menos {PROJECT_MIN_DAYS} dias diferentes.
      </Text>
    </ScreenShell>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const planner = useContext(PlannerContext)!;
  const theme = THEME[p.creation ? "criacao" : p.kind];
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const days = projectProgressDays(p);
  const late = !p.doneAt && p.deadline && p.deadline < dayKey();
  const cover = p.creation ? p.files.find((f) => f.kind === "image") : undefined;

  const addNote = () => {
    const err = planner.addProjectNote(p.id, note);
    setError(err ?? "");
    if (!err) setNote("");
  };
  const finish = () => setError(planner.finishProject(p.id) ?? "");
  const remove = async () => {
    if (await confirmAction("Apagar?", `"${p.title}", as anotações e os anexos saem do app.`, "Apagar")) planner.removeProject(p.id);
  };
  const removeNote = async (noteId: string) => {
    if (await confirmAction("Apagar anotação?", "Essa anotação sai do diário de progresso.", "Apagar")) planner.removeProjectNote(p.id, noteId);
  };

  return (
    <View style={[ui.card, styles.projectCard, { borderLeftColor: theme.color }]}>
      {cover ? <ZoomablePhoto uri={cover.uri} style={styles.cover} label={`Capa de ${p.title}`} /> : null}
      <View style={ui.rowBetween}>
        <TouchableOpacity onPress={() => setOpen(!open)} style={[ui.row, { flex: 1 }]} accessibilityRole="button" aria-expanded={open}>
          <View style={[styles.kindBadge, { backgroundColor: theme.color }]}>
            <Ionicons name={theme.icon} size={16} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ui.cardTitle}>{p.title}</Text>
            <Text style={ui.listSub}>
              {p.creation ? "Criação" : KIND_LABEL[p.kind]} · início {formatDay(p.start)}
              {p.deadline ? ` · prazo ${formatDay(p.deadline)}` : ""}
              {p.hours ? ` · ${p.hours} h` : ""}
            </Text>
          </View>
        </TouchableOpacity>
        {p.doneAt ? (
          <Text style={ui.doneBadge}>CONCLUÍDO</Text>
        ) : late ? (
          <Text style={[ui.doneBadge, { backgroundColor: "#B91C1C" }]}>ATRASADO</Text>
        ) : null}
        <TouchableOpacity onPress={remove} hitSlop={8} accessibilityLabel={`Apagar ${p.title}`}>
          <Ionicons name="trash-outline" size={18} color="#F87171" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setOpen(!open)} hitSlop={8} accessibilityLabel={open ? "Fechar" : "Abrir"}>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#C7BADB" />
        </TouchableOpacity>
      </View>
      {!p.doneAt ? (
        <View style={ui.bar}>
          <View style={[ui.barFill, { backgroundColor: theme.color, width: `${Math.min(100, Math.round((days / PROJECT_MIN_DAYS) * 100))}%` }]} />
        </View>
      ) : null}
      <Text style={[ui.meta, { marginTop: 6 }]}>
        {p.kind === "curso" ? `${p.notes.length} aula(s) registrada(s)` : `Progresso em ${days} dia(s)`} · {p.files.length} anexo(s)
      </Text>

      {open ? (
        <>
          {p.description ? <Text style={ui.desc}>{p.description}</Text> : null}
          {!p.doneAt ? (
            <>
              <TextInput style={[ui.input, { minHeight: 60 }]} value={note} onChangeText={setNote} multiline placeholder={theme.notePlaceholder} placeholderTextColor="#9E94AB" />
              <View style={ui.chips}>
                <TouchableOpacity style={[ui.chip, { backgroundColor: theme.color, borderColor: theme.color }]} onPress={addNote}>
                  <Text style={ui.chipText}>{theme.noteButton}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ui.chip} onPress={async () => { const f = await pickImage("projetos"); if (f) planner.addProjectFile(p.id, f); }}>
                  <Text style={ui.chipText}><Ionicons name="image-outline" /> Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ui.chip} onPress={async () => { const f = await pickDocument(undefined, "projetos"); if (f) planner.addProjectFile(p.id, f); }}>
                  <Text style={ui.chipText}><Ionicons name="document-outline" /> PDF/Word</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
          {error ? <Text style={ui.error}>{error}</Text> : null}

          {p.files.length ? <Text style={ui.subTitle}>Anexos (segure para apagar)</Text> : null}
          <View style={ui.chips}>
            {p.files.map((f) =>
              f.kind === "image" ? (
                <ZoomablePhoto
                  key={f.uri}
                  uri={f.uri}
                  style={{ width: 104, height: 104, borderRadius: 8 }}
                  label={f.name}
                  onLongPress={() => planner.removeProjectFile(p.id, f.uri)}
                />
              ) : (
                <TouchableOpacity key={f.uri} style={ui.chipSmall} onPress={() => openFile(f.uri)} onLongPress={() => planner.removeProjectFile(p.id, f.uri)}>
                  <Text style={ui.chipText} numberOfLines={1}>{f.name}</Text>
                </TouchableOpacity>
              ),
            )}
          </View>

          {p.notes.length ? <Text style={ui.subTitle}>{p.kind === "curso" ? "Aulas registradas" : "Diário de progresso"}</Text> : null}
          {p.notes.map((n) => (
            <View key={n.id} style={ui.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={ui.listSub}>{formatDay(n.day)}</Text>
                <Text style={ui.desc}>{n.text}</Text>
              </View>
              <TouchableOpacity onPress={() => removeNote(n.id)} hitSlop={8} accessibilityLabel="Apagar anotação">
                <Ionicons name="close-circle-outline" size={18} color="#C7BADB" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={ui.chips}>
            {!p.doneAt ? (
              <TouchableOpacity style={[ui.chip, days >= PROJECT_MIN_DAYS && { backgroundColor: theme.color, borderColor: theme.color }]} onPress={finish}>
                <Text style={ui.chipText}>Marcar como concluído</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={ui.chip}
              onPress={() => shareContent(p.title, [p.description, ...p.notes.map((n) => `${formatDay(n.day)}: ${n.text}`)].filter(Boolean).join("\n"), p.files[0])}
            >
              <Text style={ui.chipText}>Compartilhar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ui.chip, { borderColor: "#F87171" }]} onPress={remove}>
              <Text style={ui.chipText}>Apagar</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  hero: { flexDirection: "row", gap: 12, alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  heroText: { color: "#DDD6FE", fontSize: 12, marginTop: 2, lineHeight: 17 },
  heroStats: { flexDirection: "row", gap: 12, marginTop: 6 },
  heroStat: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  formCard: { borderWidth: 1 },
  subTabs: { flexDirection: "row", gap: 6, marginBottom: 12, backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 10, padding: 4 },
  subTab: { flex: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4, alignItems: "center" },
  subTabText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  section: { marginBottom: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sectionTitle: { color: "#FFF", fontSize: 15, fontWeight: "700", flex: 1 },
  projectCard: { borderLeftWidth: 4 },
  kindBadge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  cover: { width: "100%", height: 180, borderRadius: 8, marginBottom: 10 },
});
