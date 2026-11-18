import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useContext, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import UserAvatar from "@/components/UserAvatar";
import { GroupsContext } from "@/context/GroupsContext";
import { displayName, UserContext } from "@/context/UserContext";
import { groupRanking } from "@/services/groupsService";

const MEDAL_COLORS = ["#FCD34D", "#D1D5DB", "#D97706"];

// Ranking entre amigos: cada grupo tem o seu (pontos das tarefas do grupo)
export default function Ranking() {
  const groupsContext = useContext(GroupsContext);
  const userContext = useContext(UserContext);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!groupsContext || !userContext) throw new Error("Contexto não encontrado");

  const { groups } = groupsContext;
  const { user } = userContext;

  const selected = groups.find((g) => g.id === selectedId) ?? groups[0];
  const ranking = selected ? groupRanking(selected) : [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        {/* Cabeçalho fixo */}
        <View style={styles.fixedHeader}>
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/challenges")
            }
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back" style={styles.back} />
          </TouchableOpacity>

          <Text style={styles.title}>Ranking</Text>
          <Text style={styles.subtitle}>
            Dispute com seus amigos dentro de cada grupo.
          </Text>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>

          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" style={styles.emptyIcon} color="#DDD6FE" />
              <Text style={styles.emptyTitle}>Nenhum grupo ainda</Text>
              <Text style={styles.emptyText}>
                Crie um grupo, definam tarefas juntos e o ranking aparece aqui.
              </Text>
              <TouchableOpacity
                style={styles.primary}
                onPress={() => router.push("/groups")}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>Criar ou ver grupos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ESCOLHA DO GRUPO */}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {groups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.chip, selected?.id === g.id && styles.chipActive]}
                    onPress={() => setSelectedId(g.id)}
                    accessibilityRole="tab"
                    aria-selected={selected?.id === g.id}
                  >
                    <Text style={styles.chipText}><Ionicons name="people" /> {g.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {ranking.map((row) => {
                const isMe = row.id === user.uid;
                return (
                  <View key={row.id} style={[styles.userCard, isMe && styles.currentUser]}>
                    <Text style={styles.position}>
                      {row.position <= 3 ? <Ionicons name="medal" color={MEDAL_COLORS[row.position - 1]} /> : row.position}
                    </Text>
                    <UserAvatar
                      uri={isMe ? user.avatar : null}
                      size={28}
                      style={styles.avatar}
                    >
                      <Ionicons name="person" size={16} color="#cbd5f5" />
                    </UserAvatar>
                    <Text style={styles.name} numberOfLines={1}>
                      {isMe ? `${displayName(user)} (você)` : row.name}
                    </Text>
                    <Text style={styles.xp}>{row.points} pts</Text>
                  </View>
                );
              })}

              <Text style={styles.note}>
                Pontos = XP das tarefas do grupo concluídas por cada membro.
              </Text>

              {selected ? (
                <TouchableOpacity
                  style={styles.primary}
                  onPress={() =>
                    router.push({ pathname: "/group", params: { id: selected.id } })
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryText}>Abrir grupo e tarefas</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },

  fixedHeader: { paddingHorizontal: 15, paddingTop: 15 },
  content: { paddingHorizontal: 15, paddingTop: 4, paddingBottom: 110 },

  back: { color: "#FFF", fontSize: 25 },

  title: { color: "#FFF", textAlign: "center", fontSize: 18, marginBottom: 4 },

  subtitle: { color: "#C7BADB", textAlign: "center", fontSize: 13, marginBottom: 12 },

  empty: {
    backgroundColor: "#25193A",
    borderRadius: 10,
    padding: 18,
    alignItems: "center",
  },

  emptyIcon: { fontSize: 34, marginBottom: 6 },

  emptyTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  emptyText: { color: "#C7BADB", fontSize: 13, textAlign: "center", marginTop: 4 },

  chips: { gap: 8, paddingBottom: 4, marginBottom: 10 },

  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#5B21B6",
    backgroundColor: "#25193A",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  chipActive: { backgroundColor: "#5B21B6", borderColor: "#A78BFA" },

  chipText: { color: "#FFF", fontSize: 13 },

  userCard: {
    backgroundColor: "#25193A",
    borderRadius: 7,
    minHeight: 46,
    marginBottom: 5,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },

  currentUser: { borderColor: "#A78BFA" },

  position: { color: "#FFF", width: 28, fontSize: 15, textAlign: "center" },

  avatar: { backgroundColor: "#7774D6", marginHorizontal: 7 },

  name: { color: "#FFF", flex: 1, fontSize: 13 },

  xp: { color: "#B83CE5", fontSize: 13, fontWeight: "700" },

  note: { color: "#C7BADB", fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 17 },

  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 14,
    minHeight: 46,
  },

  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
