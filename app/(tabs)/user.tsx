import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BadgeShowcase, ProfileBanner, PublicShelf, StatsRow } from "@/components/ProfileShowcase";
import { loadPublicProfile, PublicProfile } from "@/services/publicProfileService";

// Perfil de um amigo (membro de grupo): só o que ele deixou público.
export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [data, setData] = useState<PublicProfile | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setData(null);
    loadPublicProfile(id).then((p) => active && setData(p));
    return () => {
      active = false;
    };
  }, [id]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/groups"));

  if (!data) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color="#a78bfa" />
      </View>
    );
  }

  const p = data.profile;
  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={{ paddingBottom: 110 }}>
      <ProfileBanner banner={p.banner} preset={p.bannerPreset} avatar={p.avatar}>
        <TouchableOpacity onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </ProfileBanner>

      <Text style={styles.name}>{p.name || "Membro do Focus"}</Text>
      {p.username ? <Text style={styles.username}>@{p.username}</Text> : null}
      {p.status ? (
        <Text style={styles.status}>
          <Ionicons name="ellipse" size={8} color="#36D35B" /> {p.status}
        </Text>
      ) : null}
      {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}

      {p.showStats ? (
        <>
          <StatsRow level={data.level} xp={data.xp} streak={data.streakDays} unlocked={data.unlocked.length} />
          <BadgeShowcase featured={p.featuredBadges} unlocked={data.unlocked} />
        </>
      ) : null}
      {p.showBooks ? <PublicShelf books={data.books} reviews={data.reviews} /> : null}
      {!p.showStats && !p.showBooks ? <Text style={styles.bio}>Este perfil é privado.</Text> : null}

      <Text style={styles.note}>
        Prévia local: mostra o que esse amigo salvou neste aparelho. Entre aparelhos, depende do servidor.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  name: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", marginTop: 8 },
  username: { color: "#94a3b8", fontSize: 14, textAlign: "center" },
  status: { color: "#cbd5f5", fontSize: 13, textAlign: "center", marginTop: 6 },
  bio: { color: "#e2e8f0", fontSize: 14, textAlign: "center", marginTop: 8, marginHorizontal: 24 },
  note: { color: "#64748b", fontSize: 11, textAlign: "center", marginTop: 16, marginHorizontal: 24 },
});
