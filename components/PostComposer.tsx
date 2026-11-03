import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const MAX_POST_LENGTH = 500;

type Props = {
  // Publica o texto; deve lançar erro se falhar (o texto é mantido)
  onSubmit: (text: string) => Promise<void>;
  placeholder?: string;
  // Explicação mostrada ao tocar no botão de imagem (desativado)
  imageNotice?: string;
};

// Caixa de publicação usada no Feed, no Perfil e no mural dos grupos
export default function PostComposer({
  onSubmit,
  placeholder = "O que você está pensando?",
  imageNotice = "Envio de imagens ainda não disponível: depende do armazenamento de arquivos no servidor. Por enquanto, publique textos.",
}: Props) {
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [imageInfo, setImageInfo] = useState(false);
  const progress = useState(new Animated.Value(0))[0];

  const handlePost = async () => {
    const text = postText.trim();
    if (!text || posting) return;

    try {
      setPosting(true);
      setPostError("");
      await onSubmit(text);
      setPostText("");

      Animated.timing(progress, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start(() => progress.setValue(0));
    } catch (e) {
      // Mantém o texto para o usuário tentar de novo
      setPostError(
        e instanceof Error && e.message
          ? e.message
          : "Não foi possível publicar. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setPosting(false);
    }
  };

  const canPost = !!postText.trim() && !posting;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.card}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={postText}
        onChangeText={(t) => {
          setPostText(t);
          if (postError) setPostError("");
        }}
        style={styles.input}
        multiline
        maxLength={MAX_POST_LENGTH}
        accessibilityLabel="Texto da publicação"
      />

      {postError ? <Text style={styles.errorText}>{postError}</Text> : null}

      {imageInfo ? <Text style={styles.infoText}>{imageNotice}</Text> : null}

      <View style={styles.actions}>
        {/* Desabilitado de forma visível: explica a limitação ao tocar */}
        <TouchableOpacity
          style={[styles.iconButton, styles.iconButtonDisabled]}
          onPress={() => setImageInfo((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Imagens indisponíveis. Toque para saber mais"
        >
          <Ionicons name="image" size={20} color="#fff" />
        </TouchableOpacity>

        {postText.length > MAX_POST_LENGTH * 0.8 ? (
          <Text style={styles.counter}>
            {postText.length}/{MAX_POST_LENGTH}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, !canPost && styles.buttonDisabled]}
          onPress={handlePost}
          disabled={!canPost}
          accessibilityRole="button"
          aria-disabled={!canPost}
          aria-busy={posting}
        >
          {posting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Postar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.progressBg}>
        <Animated.View style={[styles.progress, { width: progressWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 12,
  },

  input: {
    color: "#fff",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
    minHeight: 50,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  iconButton: {
    backgroundColor: "#334155",
    padding: 10,
    borderRadius: 20,
  },

  iconButtonDisabled: { opacity: 0.45 },

  counter: {
    color: "#94a3b8",
    fontSize: 12,
    marginLeft: "auto",
    marginRight: 10,
  },

  button: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },

  buttonDisabled: { opacity: 0.5 },

  buttonText: { color: "#fff", fontWeight: "600" },

  errorText: { color: "#f87171", fontSize: 13, marginBottom: 8 },

  infoText: {
    color: "#cbd5f5",
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 17,
  },

  progressBg: {
    height: 5,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    marginTop: 10,
    overflow: "hidden",
  },

  progress: { height: "100%", backgroundColor: "#6366f1" },
});
