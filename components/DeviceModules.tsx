import { Ionicons } from "@expo/vector-icons";
import { Pedometer } from "expo-sensors";
import { useContext, useEffect, useState } from "react";
import { Platform, Text, TextInput, TouchableOpacity, View } from "react-native";

import { CardTitle, ui } from "@/components/ScreenShell";
import { TaskExtrasContext } from "@/context/TaskExtrasContext";
import { pickAudio } from "@/utils/files";

// Blocos que usam recursos do celular: despertador com música e passos.

export function AlarmCard() {
  const extras = useContext(TaskExtrasContext)!;
  const [playlist, setPlaylist] = useState(extras.alarm.playlistUrl);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const a = extras.alarm;

  const save = async (patch: Partial<typeof a>) => {
    const err = await extras.setAlarm({ ...a, playlistUrl: playlist.trim(), ...patch });
    setError(err ?? "");
    setSaved(err ? "" : "Despertador salvo.");
  };

  return (
    <View style={ui.card}>
      <View style={ui.rowBetween}>
        <CardTitle icon="alarm-outline">Despertador</CardTitle>
        <TouchableOpacity style={[ui.toggle, a.on && ui.toggleOn]} onPress={() => save({ on: !a.on })} accessibilityRole="switch" aria-checked={a.on}>
          <Text style={ui.toggleText}>{a.on ? "Ligado" : "Desligado"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={ui.hint}>
        Toca no horário de acordar de “Meu sono”{extras.sleep ? ` (${extras.sleep.wake})` : ""}. Com o Focus aberto toca a sua
        música; com ele fechado, chega a notificação com o som do celular.
      </Text>

      <Text style={ui.subTitle}>Som</Text>
      <View style={ui.chips}>
        <TouchableOpacity style={[ui.chipSmall, !a.soundUri && ui.chipActive]} onPress={() => save({ soundUri: null, soundName: null })}>
          <Text style={ui.chipText}>Toque do Focus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ui.chipSmall, !!a.soundUri && ui.chipActive]}
          onPress={async () => {
            const file = await pickAudio();
            if (file) save({ soundUri: file.uri, soundName: file.name });
          }}
        >
          <Text style={ui.chipText}>
            <Ionicons name="musical-notes-outline" /> {a.soundName ?? "Escolher música do aparelho"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={ui.subTitle}>Soneca</Text>
      <View style={ui.chips}>
        {[5, 10, 15].map((m) => (
          <TouchableOpacity key={m} style={[ui.chipSmall, a.snoozeMin === m && ui.chipActive]} onPress={() => save({ snoozeMin: m })}>
            <Text style={ui.chipText}>{m} min</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={ui.subTitle}>Playlist ao acordar (Spotify, YouTube…)</Text>
      <TextInput
        style={ui.input}
        value={playlist}
        onChangeText={setPlaylist}
        onBlur={() => playlist.trim() !== a.playlistUrl && save({})}
        placeholder="https://open.spotify.com/playlist/…"
        placeholderTextColor="#9E94AB"
        autoCapitalize="none"
        keyboardType="url"
      />
      <Text style={ui.hint}>O Spotify não deixa outro app tocar a música dele; o Focus abre a sua playlist quando você desliga.</Text>
      {error ? <Text style={ui.error}>{error}</Text> : null}
      {saved ? <Text style={ui.ok}>{saved}</Text> : null}
    </View>
  );
}

// Passos pelo sensor do celular (Pedometer). Android: conta enquanto a tela
// está aberta; iPhone: lê o total do dia. Ao bater a meta, conclui sozinho.
export function StepsCard({ taskId, goal }: { taskId: string; goal: number }) {
  const extras = useContext(TaskExtrasContext)!;
  const [available, setAvailable] = useState<boolean | null>(null);
  const [live, setLive] = useState(0);
  const saved = extras.metricToday(`${taskId}-sensor`) ?? 0;
  const steps = Math.max(saved, live);

  useEffect(() => {
    if (Platform.OS === "web") {
      setAvailable(false);
      return;
    }
    let sub: { remove: () => void } | null = null;
    let base = saved;
    (async () => {
      const ok = await Pedometer.isAvailableAsync();
      setAvailable(ok);
      if (!ok) return;
      await Pedometer.requestPermissionsAsync();
      if (Platform.OS === "ios") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const r = await Pedometer.getStepCountAsync(start, new Date());
        base = r.steps;
        setLive(r.steps);
      }
      sub = Pedometer.watchStepCount((r) => setLive(base + r.steps));
    })();
    return () => sub?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guarda a contagem e conclui pela rotina quando bater a meta
  useEffect(() => {
    if (live <= saved) return;
    extras.logMetric(`${taskId}-sensor`, live);
    if (live >= goal) extras.complete(taskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const pct = Math.min(100, Math.round((steps / goal) * 100));
  return (
    <View style={ui.card}>
      <CardTitle icon="footsteps-outline">Passos pelo sensor</CardTitle>
      {available === false ? (
        <Text style={ui.hint}>
          {Platform.OS === "web"
            ? "O sensor de passos só funciona no app do celular. Aqui, use o campo abaixo."
            : "Este aparelho não tem sensor de passos. Use o campo abaixo."}
        </Text>
      ) : (
        <>
          <Text style={[ui.cardTitle, { fontSize: 28, marginTop: 6 }]}>
            {steps.toLocaleString("pt-BR")} <Text style={ui.meta}>/ {goal.toLocaleString("pt-BR")} passos</Text>
          </Text>
          <View style={ui.bar}>
            <View style={[ui.barFill, { width: `${pct}%` }]} />
          </View>
          <Text style={ui.hint}>
            {Platform.OS === "android" ? "No Android, conta os passos enquanto esta tela fica aberta." : "Total de hoje, lido do iPhone."} Conclui
            sozinho ao bater a meta.
          </Text>
        </>
      )}
    </View>
  );
}
