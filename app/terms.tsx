import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useContext, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "@/config/firebase";
import { TERMS_SECTIONS, TERMS_UPDATED_AT, TERMS_VERSION } from "@/constants/terms";
import { UserContext } from "@/context/UserContext";
import { notify } from "@/utils/feedback";
import { flushPending } from "@/utils/localStore";
import { emitTermsAccepted } from "@/utils/terms";

// Termos de Uso: leitura e aceite.
//   ?mode=register -> aberta pelo Cadastro; "Li e aceito" marca a caixinha de lá e volta
//   ?mode=accept   -> contas que ainda não aceitaram esta versão (não dá para pular)
//   sem modo       -> leitura (Perfil); se ainda não aceitou, oferece o aceite
export default function TermsScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const userContext = useContext(UserContext);
  const user = userContext?.user;

  const [checked, setChecked] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const mustAccept = mode === "accept";
  const fromRegister = mode === "register";
  const accepted = !!user?.uid && user.termsVersion === TERMS_VERSION && !!user.termsAcceptedAt;
  const canAccept = mustAccept || fromRegister || (!!user?.uid && !accepted);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const handleAccept = () => {
    if (!checked) {
      notify("Falta pouco", "Marque a caixinha confirmando que você leu os Termos de Uso.");
      return;
    }
    if (fromRegister) {
      emitTermsAccepted();
      goBack();
      return;
    }
    userContext?.updateUser({ termsAcceptedAt: Date.now(), termsVersion: TERMS_VERSION });
    if (mustAccept) router.replace("/");
    else goBack();
  };

  const handleLogout = async () => {
    try {
      setLeaving(true);
      await flushPending();
      await signOut(auth);
      router.replace("/login");
    } catch {
      notify("Erro", "Não foi possível sair. Verifique sua conexão.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        {/* Cabeçalho fixo */}
        <View style={styles.header}>
          {mustAccept ? (
            <View style={{ width: 25 }} />
          ) : (
            <TouchableOpacity onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" style={styles.back} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Termos de Uso</Text>
          <View style={{ width: 25 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
          <Text style={styles.updated}>
            Versão de {TERMS_UPDATED_AT}
            {accepted && user?.termsAcceptedAt
              ? ` · aceita em ${new Date(user.termsAcceptedAt).toLocaleDateString("pt-BR")}`
              : ""}
          </Text>

          {TERMS_SECTIONS.map((section) => (
            <View key={section.title} style={styles.card}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.paragraphs.map((p, i) => (
                <Text key={i} style={styles.paragraph}>
                  {p}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>

        {/* Rodapé fixo com o aceite */}
        {canAccept ? (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setChecked((v) => !v)}
              accessibilityRole="checkbox"
              aria-checked={checked}
              accessibilityLabel="Li e aceito os Termos de Uso"
            >
              <View style={[styles.box, checked && styles.boxOn]}>
                {checked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <Text style={styles.checkText}>Li e aceito os Termos de Uso</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primary, !checked && styles.disabled]}
              onPress={handleAccept}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>{fromRegister ? "Aceitar e voltar" : "Aceitar e continuar"}</Text>
            </TouchableOpacity>

            {mustAccept ? (
              <TouchableOpacity onPress={handleLogout} disabled={leaving} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>{leaving ? "Saindo..." : "Não aceito — sair da conta"}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f172a" },
  background: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 12,
  },
  back: { color: "#FFF", fontSize: 25 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "600" },

  content: { paddingHorizontal: 15, paddingBottom: 20 },
  updated: { color: "#C7BADB", fontSize: 12, textAlign: "center", marginBottom: 12 },

  card: { backgroundColor: "#25193A", borderRadius: 10, padding: 14, marginBottom: 10 },
  sectionTitle: { color: "#FFF", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  paragraph: { color: "#DDD6FE", fontSize: 13.5, lineHeight: 20, marginTop: 4 },

  footer: {
    padding: 15,
    gap: 12,
    alignItems: "center",
    backgroundColor: "#25193A",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch" },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#A78BFA",
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  checkText: { color: "#FFF", fontSize: 14, flex: 1 },

  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    alignSelf: "stretch",
    minHeight: 46,
  },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  link: { color: "#DDD6FE", fontSize: 13, textDecorationLine: "underline" },
});
