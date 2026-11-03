import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import UserAvatar from "@/components/UserAvatar";
import { ACHIEVEMENTS } from "@/constants/gamification";
import { BANNER_PRESETS, BannerPreset } from "@/services/profileService";
import type { PublicBook, PublicReview } from "@/services/publicProfileService";

// Partes do perfil no estilo Steam + Discord: capa (banner), avatar por cima,
// vitrine de insígnias, estante e resenhas. Usado no meu perfil e no do amigo.

export function ProfileBanner({
  banner,
  preset,
  avatar,
  onPressAvatar,
  editing,
  children,
}: {
  banner: string | null;
  preset: BannerPreset;
  avatar: string | null;
  onPressAvatar?: () => void;
  editing?: boolean;
  children?: React.ReactNode; // barra de cima (voltar/editar)
}) {
  return (
    <View>
      <View style={styles.banner}>
        {banner ? (
          <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient colors={BANNER_PRESETS[preset]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.bannerShade} />
        <View style={styles.bannerBar}>{children}</View>
      </View>
      <View style={styles.avatarWrap}>
        <TouchableOpacity onPress={onPressAvatar} disabled={!onPressAvatar} accessibilityRole="button" accessibilityLabel="Trocar foto de perfil">
          <UserAvatar uri={avatar} size={104} style={styles.avatar}>
            <Ionicons name="person" size={40} color="#cbd5f5" />
          </UserAvatar>
          {editing ? (
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function BadgeShowcase({
  featured,
  unlocked,
  editing,
  onToggle,
}: {
  featured: string[];
  unlocked: string[];
  editing?: boolean;
  onToggle?: (id: string) => void;
}) {
  const shown = editing
    ? ACHIEVEMENTS.filter((a) => unlocked.includes(a.id))
    : ACHIEVEMENTS.filter((a) => featured.includes(a.id) && unlocked.includes(a.id));
  const list = !editing && shown.length === 0 ? ACHIEVEMENTS.filter((a) => unlocked.includes(a.id)).slice(0, 6) : shown;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="ribbon-outline" /> Vitrine de insígnias
      </Text>
      {editing ? <Text style={styles.sectionHint}>Toque para escolher até 6 para mostrar.</Text> : null}
      {list.length === 0 ? (
        <Text style={styles.sectionHint}>Nenhuma insígnia ainda. Complete desafios para desbloquear.</Text>
      ) : (
        <View style={styles.badges}>
          {list.map((a) => {
            const on = featured.includes(a.id);
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.badge, editing && on && styles.badgeOn, editing && !on && { opacity: 0.5 }]}
                disabled={!editing}
                onPress={() => onToggle?.(a.id)}
                accessibilityLabel={a.title}
              >
                <View style={styles.badgeIcon}>
                  <Ionicons name={a.icon} size={22} color="#FCD34D" />
                </View>
                <Text style={styles.badgeText} numberOfLines={2}>
                  {a.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function StatsRow({ level, xp, streak, unlocked }: { level: number; xp: number; streak: number; unlocked: number }) {
  return (
    <View style={styles.stats}>
      {[
        { icon: "star" as const, n: `Nível ${level}`, l: `${xp.toLocaleString("pt-BR")} XP` },
        { icon: "flame" as const, n: `${streak}`, l: "dias seguidos" },
        { icon: "ribbon" as const, n: `${unlocked}/${ACHIEVEMENTS.length}`, l: "insígnias" },
      ].map((s) => (
        <View key={s.l} style={styles.stat}>
          <Ionicons name={s.icon} size={16} color="#FCD34D" />
          <Text style={styles.statN}>{s.n}</Text>
          <Text style={styles.statL}>{s.l}</Text>
        </View>
      ))}
    </View>
  );
}

export function PublicShelf({ books, reviews }: { books: PublicBook[]; reviews: PublicReview[] }) {
  const reading = books.filter((b) => b.status === "lendo");
  const done = books.filter((b) => b.status === "concluido");
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="library-outline" /> Estante
      </Text>
      {books.length === 0 ? <Text style={styles.sectionHint}>Nenhum livro em leitura ou lido ainda.</Text> : null}
      {[
        { label: "Lendo agora", list: reading },
        { label: `Lidos (${done.length})`, list: done },
      ]
        .filter((g) => g.list.length)
        .map((g) => (
          <View key={g.label}>
            <Text style={styles.shelfLabel}>{g.label}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {g.list.map((b) => (
                <View key={b.id} style={styles.book}>
                  {b.coverUrl ? (
                    <Image source={{ uri: b.coverUrl }} style={styles.cover} contentFit="cover" />
                  ) : (
                    <View style={[styles.cover, styles.coverEmpty]}>
                      <Ionicons name="book" size={22} color="#DDD6FE" />
                    </View>
                  )}
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {b.title}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      {reviews.length ? <Text style={styles.shelfLabel}>Resenhas</Text> : null}
      {reviews.map((r) => (
        <View key={r.at} style={styles.review}>
          <Text style={styles.reviewTitle}>
            {r.bookTitle} · {r.rating}/5 <Ionicons name="star" color="#FCD34D" />
          </Text>
          <Text style={styles.reviewText} numberOfLines={5}>
            {r.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { height: 150, overflow: "hidden", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  bannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.25)" },
  bannerBar: { paddingTop: 44, paddingHorizontal: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatarWrap: { alignItems: "center", marginTop: -54 },
  avatar: { borderWidth: 4, borderColor: "#0f172a", backgroundColor: "#25193A" },
  cameraBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    padding: 5,
  },
  section: { backgroundColor: "#1e293b", borderRadius: 14, padding: 14, marginHorizontal: 16, marginTop: 12 },
  sectionTitle: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  sectionHint: { color: "#94a3b8", fontSize: 12, marginTop: 6 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  badge: { width: "31%", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 8 },
  badgeOn: { borderWidth: 1.5, borderColor: "#A78BFA", backgroundColor: "rgba(124,58,237,0.25)" },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(124,58,237,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#e2e8f0", fontSize: 10, textAlign: "center", marginTop: 5 },
  stats: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12 },
  stat: { flex: 1, backgroundColor: "#1e293b", borderRadius: 12, padding: 10, alignItems: "center" },
  statN: { color: "#FFF", fontSize: 14, fontWeight: "700", marginTop: 3 },
  statL: { color: "#94a3b8", fontSize: 10 },
  shelfLabel: { color: "#cbd5f5", fontSize: 12, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  book: { width: 70 },
  cover: { width: 70, height: 100, borderRadius: 6 },
  coverEmpty: { backgroundColor: "#25193A", alignItems: "center", justifyContent: "center" },
  bookTitle: { color: "#e2e8f0", fontSize: 10, marginTop: 4 },
  review: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingVertical: 8 },
  reviewTitle: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  reviewText: { color: "#cbd5f5", fontSize: 12, marginTop: 3, lineHeight: 17 },
});
