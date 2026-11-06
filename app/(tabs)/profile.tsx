import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { BadgeShowcase, ProfileBanner, PublicShelf } from "@/components/ProfileShowcase";
import { auth } from "@/config/firebase";
import { confirmAction, notify } from "@/utils/feedback";
import PostComposer from "@/components/PostComposer";
import {
  ACHIEVEMENTS,
  levelTitle,
  nextLevelTitle,
} from "@/constants/gamification";
import { BooksContext } from "@/context/BooksContext";
import { HabitsContext } from "@/context/HabitsContext";
import { PlannerContext } from "@/context/PlannerContext";
import {
  BANNER_PRESETS,
  BannerPreset,
  MAX_FEATURED_BADGES,
  profileService,
} from "@/services/profileService";
import { usePublishPost } from "@/hooks/usePublishPost";
import { PostContext } from "../../context/PostContext";
import { displayName, UserContext } from "../../context/UserContext";
import { XPContext } from "../../context/XPContext";
import { flushPending } from "@/utils/localStore";

const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

export default function Profile() {
  const userContext = useContext(UserContext);
  const xpContext = useContext(XPContext);
  const context = useContext(PostContext);
  const habitsContext = useContext(HabitsContext);
  const booksContext = useContext(BooksContext);
  const planner = useContext(PlannerContext);
  const publish = usePublishPost();

  // Rascunho da edição; o perfil "oficial" vive no UserContext
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  // Personalização (capa, status, vitrine, o que fica público)
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerPreset, setBannerPreset] = useState<BannerPreset>("roxo");
  const [status, setStatus] = useState("");
  const [featured, setFeatured] = useState<string[]>([]);
  const [showBooks, setShowBooks] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  if (!context || !userContext || !xpContext) return null;

  const { posts } = context;
  const { user, updateUser } = userContext;
  const {
    xp,
    level,
    xpToNext,
    progress,
    streakDays,
    bestStreak,
    completedCount,
    booksDone,
    readingGoalDays,
    unlockedAt,
  } = xpContext;
  const title = levelTitle(level);
  const next = nextLevelTitle(level);
  const habitsCount = habitsContext?.habits.length ?? 0;
  const booksCount = booksContext?.books.length ?? 0;
  const reading = booksContext?.books.find((b) => b.status === "lendo");
  const dailyGoal = booksContext?.dailyGoal ?? null;
  const pagesToday = booksContext?.pagesToday ?? 0;
  const unlockedCount = Object.keys(unlockedAt).filter((id) =>
    ACHIEVEMENTS.some((a) => a.id === id),
  ).length;

  // Só as postagens do usuário logado
  const myPosts = user.uid ? posts.filter((p) => p.userId === user.uid) : [];

  const handlePickImage = async () => {
    if (!isEditing) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify("Permissão necessária", "Libere o acesso às fotos para trocar o avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) setAvatar(result.assets[0].uri);
  };

  const startEditing = () => {
    // Começa a edição a partir dos dados atuais do contexto
    setName(user.name);
    setUsername(user.username);
    setBio(user.bio);
    setAvatar(user.avatar);
    setBanner(user.banner);
    setBannerPreset(user.bannerPreset);
    setStatus(user.status);
    setFeatured(user.featuredBadges);
    setShowBooks(user.showBooks);
    setShowStats(user.showStats);
    setFormError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFormError("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    const cleanUsername = username.trim().replace(/^@/, "").toLowerCase();

    if (!cleanName) {
      setFormError("Informe seu nome.");
      return;
    }

    if (cleanUsername && !USERNAME_REGEX.test(cleanUsername)) {
      setFormError(
        "Nome de usuário: 3 a 20 caracteres, só letras minúsculas, números, _ ou .",
      );
      return;
    }

    // TODO Firebase: conferir o @ no servidor (hoje: contas deste aparelho)
    if (cleanUsername && (await profileService.isHandleTaken(cleanUsername, user.uid))) {
      setFormError(`@${cleanUsername} já está em uso.`);
      return;
    }

    // Salvo pelo profileService (hoje no aparelho; depois users/{uid})
    updateUser({
      name: cleanName,
      username: cleanUsername,
      bio: bio.trim(),
      avatar,
      banner,
      bannerPreset,
      status: status.trim().slice(0, 60),
      featuredBadges: featured,
      showBooks,
      showStats,
    });
    setFormError("");
    setIsEditing(false);
    notify("Perfil atualizado");
  };

  const handleRemoveAvatar = async () => {
    const ok = await confirmAction(
      "Remover foto",
      "Deseja remover sua foto de perfil?",
      "Remover",
    );
    if (ok) setAvatar(null);
  };

  const handleLogout = async () => {
    const ok = await confirmAction(
      "Sair da conta",
      "Seu XP, rotina e histórico ficam salvos neste aparelho para quando você voltar.",
      "Sair",
    );
    if (!ok) return;

    try {
      setLoggingOut(true);
      // A troca de sessão recria XP, rotina e foco (SessionProviders)
      // e limpa o perfil (UserContext); aqui só encerramos a sessão.
      await flushPending(); // envia o que ainda não foi para a nuvem
      await signOut(auth);
      router.replace("/login");
    } catch {
      notify("Erro", "Não foi possível sair. Verifique sua conexão.");
    } finally {
      setLoggingOut(false);
    }
  };

  const shownAvatar = isEditing ? avatar : user.avatar;
  const shownBanner = isEditing ? banner : user.banner;
  const shownPreset = isEditing ? bannerPreset : user.bannerPreset;

  const pickBanner = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify("Permissão necessária", "Libere o acesso às fotos para escolher a capa.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.7,
    });
    if (!result.canceled) setBanner(result.assets[0].uri);
  };

  const toggleFeatured = (id: string) =>
    setFeatured((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : list.length >= MAX_FEATURED_BADGES ? list : [...list, id],
    );

  // O que os amigos veem (estante e resenhas públicas)
  const myBooks = (booksContext?.books ?? [])
    .filter((b) => b.status === "lendo" || b.status === "concluido")
    .map((b) => ({ id: b.id, title: b.title, author: b.author, status: b.status as "lendo" | "concluido", coverUrl: b.coverUrl }));
  const myReviews = (planner?.reviews ?? [])
    .filter((r) => r.isPublic)
    .map((r) => ({ bookTitle: myBooks.find((b) => b.id === r.bookId)?.title ?? "Livro", text: r.text, rating: r.rating, at: r.at }));
  const unlockedIds = Object.keys(unlockedAt);

  return (
    <View style={styles.container}>
      <FlatList
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 110 }}
        ListHeaderComponent={
          <>
            {/* HEADER */}
            <LinearGradient
              colors={["#5b21b6", "#1e1b4b"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <View style={{ alignSelf: "stretch" }}>
              <ProfileBanner
                banner={shownBanner}
                preset={shownPreset}
                avatar={shownAvatar}
                editing={isEditing}
                onPressAvatar={isEditing ? handlePickImage : undefined}
              >
                {isEditing ? (
                  <TouchableOpacity
                    onPress={cancelEditing}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar edição"
                  >
                    <Ionicons name="close" size={22} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.title}>Perfil</Text>
                )}

                <TouchableOpacity
                  onPress={() =>
                    isEditing ? handleSave() : startEditing()
                  }
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={isEditing ? "Salvar perfil" : "Editar perfil"}
                >
                  <Ionicons
                    name={isEditing ? "checkmark" : "create-outline"}
                    size={22}
                    color="#fff"
                  />
                </TouchableOpacity>
              </ProfileBanner>
              </View>

              {/* CAPA (edição) */}
              {isEditing ? (
                <View style={styles.bannerEdit}>
                  {(Object.keys(BANNER_PRESETS) as BannerPreset[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => {
                        setBanner(null);
                        setBannerPreset(p);
                      }}
                      accessibilityLabel={`Capa ${p}`}
                      style={[styles.presetDot, !banner && bannerPreset === p && styles.presetDotOn, { backgroundColor: BANNER_PRESETS[p][0] }]}
                    />
                  ))}
                  <TouchableOpacity style={styles.shortcut} onPress={pickBanner} accessibilityRole="button">
                    <Ionicons name="image-outline" size={14} color="#fff" />
                    <Text style={styles.shortcutText}>Imagem de capa</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {isEditing && avatar ? (
                <TouchableOpacity onPress={handleRemoveAvatar} hitSlop={8}>
                  <Text style={styles.removePhoto}>Remover foto</Text>
                </TouchableOpacity>
              ) : null}

              {/* NOME */}
              <TextInput
                value={isEditing ? name : displayName(user)}
                onChangeText={setName}
                editable={isEditing}
                placeholder="Seu nome"
                placeholderTextColor="#94a3b8"
                style={[styles.name, isEditing && styles.inputEditing]}
                accessibilityLabel="Nome"
                maxLength={40}
              />

              {isEditing ? (
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="@seuusuario"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  style={[styles.username, styles.inputEditing]}
                  accessibilityLabel="Nome de usuário"
                  maxLength={21}
                />
              ) : user.username ? (
                <Text style={styles.username}>@{user.username}</Text>
              ) : null}

              {!isEditing && user.email ? (
                <Text style={styles.email}>{user.email}</Text>
              ) : null}

              {/* STATUS (estilo Discord) */}
              {isEditing ? (
                <TextInput
                  value={status}
                  onChangeText={setStatus}
                  placeholder="Status (ex.: estudando para o ENEM)"
                  placeholderTextColor="#94a3b8"
                  style={[styles.bio, styles.inputEditing]}
                  maxLength={60}
                  accessibilityLabel="Status"
                />
              ) : user.status ? (
                <Text style={styles.statusText}>
                  <Ionicons name="ellipse" size={8} color="#36D35B" /> {user.status}
                </Text>
              ) : null}

              {/* BIO */}
              <TextInput
                value={isEditing ? bio : user.bio || "Sem descrição ainda."}
                onChangeText={setBio}
                editable={isEditing}
                placeholder="Escreva algo sobre você"
                placeholderTextColor="#94a3b8"
                style={[styles.bio, isEditing && styles.inputEditing]}
                multiline
                accessibilityLabel="Bio"
                maxLength={160}
              />

              {isEditing ? (
                <View style={styles.privacy}>
                  <Text style={styles.privacyTitle}>O que seus amigos veem</Text>
                  {[
                    { label: "Nível, sequência e insígnias", on: showStats, set: setShowStats },
                    { label: "Livros lidos, lendo e resenhas públicas", on: showBooks, set: setShowBooks },
                  ].map((o) => (
                    <TouchableOpacity
                      key={o.label}
                      style={styles.privacyRow}
                      onPress={() => o.set(!o.on)}
                      accessibilityRole="switch"
                      aria-checked={o.on}
                    >
                      <Ionicons name={o.on ? "eye-outline" : "eye-off-outline"} size={16} color="#cbd5f5" />
                      <Text style={styles.privacyText}>{o.label}</Text>
                      <Text style={styles.privacyState}>{o.on ? "Público" : "Privado"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {formError ? (
                <Text style={styles.formError}>{formError}</Text>
              ) : null}

              {/* SUA EVOLUÇÃO (dados reais do XPContext e demais contextos) */}
              <View style={styles.evolution}>
                <View style={styles.levelRow}>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeNumber}>{level}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.levelTitle}>{title.title}</Text>
                    <Text style={styles.levelXp}>
                      {xp.toLocaleString("pt-BR")} XP · faltam {xpToNext} para o nível {level + 1}
                    </Text>
                  </View>
                </View>
                <View style={styles.levelBar}>
                  <View style={[styles.levelBarFill, { width: `${progress}%` }]} />
                </View>
                {next ? (
                  <Text style={styles.nextTitle}>
                    Próxima etapa: {next.title} (nível {next.level})
                  </Text>
                ) : null}

                <View style={styles.statsGrid}>
                  {[
                    { n: `${streakDays}`, l: `sequência · melhor ${bestStreak}` },
                    { n: `${completedCount}`, l: "desafios" },
                    { n: `${habitsCount}`, l: habitsCount === 1 ? "hábito ativo" : "hábitos ativos" },
                    { n: `${booksDone}`, l: booksDone === 1 ? "livro concluído" : "livros concluídos" },
                    { n: `${readingGoalDays}`, l: "metas de leitura" },
                    { n: `${unlockedCount}/${ACHIEVEMENTS.length}`, l: "conquistas" },
                  ].map((s) => (
                    <View key={s.l} style={styles.statCell}>
                      <Text style={styles.statNumber}>{s.n}</Text>
                      <Text style={styles.statLabel} numberOfLines={2}>
                        {s.l}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* MINHA ESTANTE (destaque: leitura é parte central da evolução) */}
              <TouchableOpacity
                style={styles.shelfCard}
                onPress={() => router.push("/bookshelf")}
                accessibilityRole="button"
                accessibilityLabel="Abrir Minha Estante"
              >
                <Ionicons name="library-outline" style={styles.shelfIcon} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shelfTitle}>Minha Estante</Text>
                  <Text style={styles.shelfMeta} numberOfLines={2}>
                    {reading
                      ? `Lendo: ${reading.title}`
                      : booksCount > 0
                        ? `${booksCount} ${booksCount === 1 ? "livro" : "livros"} na estante`
                        : "Adicione seus livros e acompanhe a leitura"}
                  </Text>
                  {dailyGoal ? (
                    <Text style={styles.shelfGoal}>
                      Meta de hoje: {Math.min(pagesToday, dailyGoal)}/{dailyGoal} páginas
                      {pagesToday >= dailyGoal ? " · batida" : ""}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.shelfArrow}>›</Text>
              </TouchableOpacity>

              {/* ATALHOS */}
              <View style={styles.shortcuts}>
                <TouchableOpacity
                  style={styles.shortcut}
                  onPress={() => router.push("/xp-history")}
                  accessibilityRole="button"
                >
                  <Ionicons name="time-outline" size={14} color="#fff" />
                  <Text style={styles.shortcutText}>Histórico de XP</Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={styles.shortcut}
                  onPress={() => router.push("/achievements")}
                >
                  <Ionicons name="trophy-outline" size={14} color="#fff" />
                  <Text style={styles.shortcutText}>Conquistas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcut}
                  onPress={() => router.push("/progress")}
                >
                  <Ionicons name="stats-chart-outline" size={14} color="#fff" />
                  <Text style={styles.shortcutText}>Progresso</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcut}
                  onPress={() => router.push("/onboarding")}
                  accessibilityRole="button"
                  accessibilityLabel="Refazer meu plano"
                >
                  <Ionicons name="calendar-outline" size={14} color="#fff" />
                  <Text style={styles.shortcutText}>Meu plano</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* VITRINE + ESTANTE (o que fica público para os amigos) */}
            <BadgeShowcase
              featured={isEditing ? featured : user.featuredBadges}
              unlocked={unlockedIds}
              editing={isEditing}
              onToggle={toggleFeatured}
            />
            {!isEditing ? <PublicShelf books={myBooks} reviews={myReviews} /> : null}
            {!isEditing && user.uid ? (
              <TouchableOpacity
                style={[styles.shortcut, { alignSelf: "center", marginTop: 12 }]}
                onPress={() => router.push({ pathname: "/user", params: { id: user.uid } })}
                accessibilityRole="button"
              >
                <Ionicons name="eye-outline" size={14} color="#fff" />
                <Text style={styles.shortcutText}>Ver como meus amigos veem</Text>
              </TouchableOpacity>
            ) : null}

            {/* SEÇÃO */}
            <Text style={styles.sectionTitle}>Postagens</Text>

            {/* Publicar direto do Perfil */}
            <PostComposer
              onSubmit={publish}
              placeholder="Compartilhe uma conquista ou novidade..."
            />
          </>
        }
        data={myPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <Text style={styles.postText}>
              {item.text || "(publicação sem texto)"}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Você ainda não publicou nada. Use a caixa acima!
          </Text>
        }
        ListFooterComponent={
          user.uid ? (
            <TouchableOpacity
              style={styles.logout}
              onPress={handleLogout}
              disabled={loggingOut}
              accessibilityRole="button"
            >
              {loggingOut ? (
                <ActivityIndicator color="#f87171" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={16} color="#f87171" />
                  <Text style={styles.logoutText}>Sair da conta</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },

  header: {
    paddingTop: 0,
    paddingBottom: 20,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  topBar: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  title: { color: "#fff", fontSize: 20, fontWeight: "600" },

  bannerEdit: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  presetDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "transparent" },
  presetDotOn: { borderColor: "#fff" },
  statusText: { color: "#cbd5f5", fontSize: 13, marginTop: 6 },
  privacy: { width: "90%", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 10, marginTop: 10 },
  privacyTitle: { color: "#fff", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  privacyText: { color: "#e2e8f0", fontSize: 12, flex: 1 },
  privacyState: { color: "#a78bfa", fontSize: 12, fontWeight: "600" },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#6366f1",
  },

  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#6366f1",
    padding: 6,
    borderRadius: 20,
  },

  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },

  username: {
    color: "#cbd5f5",
    fontSize: 14,
    marginBottom: 5,
    textAlign: "center",
  },

  email: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 5,
    textAlign: "center",
  },

  inputEditing: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 200,
    marginBottom: 6,
  },

  removePhoto: {
    color: "#cbd5f5",
    fontSize: 12,
    textDecorationLine: "underline",
    marginTop: 6,
  },

  formError: {
    color: "#f87171",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 30,
    marginBottom: 6,
  },

  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "center",
    marginTop: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.4)",
  },

  logoutText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "600",
  },

  shelfCard: {
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#7C3AED",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
  },

  shelfIcon: { fontSize: 28 },

  shelfTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },

  shelfMeta: { color: "#EDE9FE", fontSize: 12, marginTop: 1 },

  shelfGoal: { color: "#DDD6FE", fontSize: 12, marginTop: 2, fontWeight: "600" },

  shelfArrow: { color: "#fff", fontSize: 26 },

  shortcuts: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
  },

  shortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  shortcutText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  bio: {
    color: "#e2e8f0",
    textAlign: "center",
    paddingHorizontal: 30,
    fontSize: 13,
    marginBottom: 10,
  },

  evolution: {
    width: "90%",
    backgroundColor: "rgba(15,23,42,0.35)",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },

  levelRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  levelBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#7C3AED",
    borderWidth: 2,
    borderColor: "#C4B5FD",
    alignItems: "center",
    justifyContent: "center",
  },

  levelBadgeNumber: { color: "#fff", fontSize: 17, fontWeight: "800" },

  levelTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },

  levelXp: { color: "#cbd5f5", fontSize: 12, marginTop: 1 },

  levelBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    marginTop: 10,
    overflow: "hidden",
  },

  levelBarFill: { height: "100%", backgroundColor: "#B832E5" },

  nextTitle: { color: "#C4B5FD", fontSize: 11, marginTop: 5 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },

  statCell: { width: "33.33%", alignItems: "center", paddingVertical: 6, paddingHorizontal: 2 },

  statNumber: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  statLabel: {
    color: "#cbd5f5",
    fontSize: 11,
    textAlign: "center",
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    margin: 15,
  },

  postCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 15,
    marginBottom: 8,
  },

  postText: {
    color: "#e2e8f0",
    fontSize: 14,
  },

  gridImage: {
    width: "33%",
    aspectRatio: 1,
    padding: 2,
  },

  emptyText: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
  },
});