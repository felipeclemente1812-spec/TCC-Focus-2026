import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useContext, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { GroupsContext } from "@/context/GroupsContext";
import { UserContext } from "@/context/UserContext";
import { groupRanking, MAX_GROUPS } from "@/services/groupsService";

export default function Groups() {
  const groupsContext = useContext(GroupsContext);
  const userContext = useContext(UserContext);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState("");

  if (!groupsContext || !userContext) throw new Error("Contexto não encontrado");

  const { groups, createGroup, joinByCode } = groupsContext;

  const handleJoin = () => {
    const result = joinByCode(code);
    if (result.error) {
      setJoinError(result.error);
      // Já era membro: leva direto ao grupo
      if (result.id) router.push({ pathname: "/group", params: { id: result.id } });
      return;
    }
    setCode("");
    setJoinError("");
    if (result.id) router.push({ pathname: "/group", params: { id: result.id } });
  };
  const uid = userContext.user.uid;

  const handleCreate = () => {
    const result = createGroup(name);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setError("");
    if (result.id) router.push({ pathname: "/group", params: { id: result.id } });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
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

            <Text style={styles.title}>Meus grupos</Text>

            <View style={{ width: 25 }} />
          </View>

          <Text style={styles.subtitle}>
            Crie um grupo com amigos, definam tarefas juntos e disputem o ranking
            do grupo.
          </Text>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Protótipo</Text>
            <Text style={styles.demoText}>
              Os grupos ficam salvos neste aparelho: outras contas que entrarem
              aqui podem participar pelo código. Grupos entre aparelhos diferentes
              dependem do servidor. Os “Amigos exemplo” só ilustram a competição.
            </Text>
          </View>

          {/* LISTA */}
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" style={styles.emptyIcon} color="#DDD6FE" />
              <Text style={styles.emptyText}>
                Você ainda não está em nenhum grupo. Crie o primeiro abaixo!
              </Text>
            </View>
          ) : (
            groups.map((g) => {
              const ranking = groupRanking(g);
              const me = ranking.find((r) => r.id === uid);
              return (
                <TouchableOpacity
                  key={g.id}
                  style={styles.groupCard}
                  onPress={() => router.push({ pathname: "/group", params: { id: g.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir grupo ${g.name}`}
                >
                  <View style={styles.groupIcon}>
                    {g.photo ? (
                      <Image source={{ uri: g.photo }} style={styles.groupPhoto} contentFit="cover" />
                    ) : (
                      <Ionicons name="people" style={styles.groupIconText} color="#FFF" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupName}>{g.name}</Text>
                    <Text style={styles.groupMeta}>
                      {g.members.length} {g.members.length === 1 ? "membro" : "membros"} ·{" "}
                      {g.tasks.length}{" "}
                      {g.tasks.length === 1 ? "tarefa" : "tarefas"}
                    </Text>
                  </View>
                  <View style={styles.position}>
                    <Text style={styles.positionNumber}>{me?.position ?? "—"}º</Text>
                    <Text style={styles.positionLabel}>{me?.points ?? 0} pts</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* ENTRAR COM CÓDIGO */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Entrar com código</Text>
            <TextInput
              value={code}
              onChangeText={(t) => {
                setCode(t.toUpperCase());
                if (joinError) setJoinError("");
              }}
              placeholder="FOCUS-XXXX"
              placeholderTextColor="#9E94AB"
              style={styles.input}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              onSubmitEditing={handleJoin}
              accessibilityLabel="Código do grupo"
            />
            {joinError ? <Text style={styles.error}>{joinError}</Text> : null}
            <TouchableOpacity
              style={[styles.primary, !code.trim() && styles.disabled]}
              onPress={handleJoin}
              disabled={!code.trim()}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Entrar no grupo</Text>
            </TouchableOpacity>
          </View>

          {/* CRIAR */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Criar grupo</Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError("");
              }}
              placeholder="Ex.: Turma do TCC"
              placeholderTextColor="#9E94AB"
              style={styles.input}
              maxLength={30}
              onSubmitEditing={handleCreate}
              accessibilityLabel="Nome do grupo"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={[
                styles.primary,
                (!name.trim() || groups.length >= MAX_GROUPS) && styles.disabled,
              ]}
              onPress={handleCreate}
              disabled={!name.trim() || groups.length >= MAX_GROUPS}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Criar grupo</Text>
            </TouchableOpacity>
            <Text style={styles.limit}>
              {groups.length} de {MAX_GROUPS} grupos
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },

  content: { padding: 15, paddingBottom: 110 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  back: { color: "#FFF", fontSize: 25 },

  title: { color: "#FFF", fontSize: 20, fontWeight: "600" },

  subtitle: {
    color: "#C7BADB",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 12,
  },

  demoBox: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5B21B6",
    borderStyle: "dashed",
    padding: 10,
    marginBottom: 12,
  },

  demoTitle: { color: "#FFF", fontSize: 13, fontWeight: "700", marginBottom: 3 },

  demoText: { color: "#C7BADB", fontSize: 12, lineHeight: 17 },

  empty: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 18,
    alignItems: "center",
    marginBottom: 10,
  },

  emptyIcon: { fontSize: 30, marginBottom: 6 },

  emptyText: { color: "#C7BADB", fontSize: 13, textAlign: "center" },

  groupCard: {
    backgroundColor: "#25193A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#5B21B6",
  },

  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#3B2A5A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  groupIconText: { fontSize: 22 },
  groupPhoto: { width: 44, height: 44, borderRadius: 12 },

  groupName: { color: "#FFF", fontSize: 15, fontWeight: "600" },

  groupMeta: { color: "#C7BADB", fontSize: 12, marginTop: 2 },

  position: { alignItems: "center", marginLeft: 8 },

  positionNumber: { color: "#B83CE5", fontSize: 20, fontWeight: "700" },

  positionLabel: { color: "#C7BADB", fontSize: 11 },

  formCard: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
    marginBottom: 4,
  },

  formTitle: { color: "#FFF", fontSize: 15, fontWeight: "600", marginBottom: 10 },

  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFF",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  error: { color: "#FCA5A5", fontSize: 13, marginTop: 8 },

  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 12,
    minHeight: 46,
  },

  disabled: { opacity: 0.45 },

  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  limit: { color: "#C7BADB", fontSize: 12, textAlign: "center", marginTop: 8 },
});
