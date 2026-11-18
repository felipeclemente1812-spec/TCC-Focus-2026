import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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

import { pickImage } from "@/utils/files";

const MAX_POST_LENGTH = 500;

type Props = {
  // Publica o texto (e a imagem, já enviada ao Storage, como link); deve lançar erro
  // se falhar (o texto e a imagem são mantidos)
  onSubmit: (text: string, image?: string | null) => Promise<void>;
  placeholder?: string;
};

// Caixa de publicação usada no Perfil e no mural dos grupos
export default function PostComposer({
  onSubmit,
  placeholder = "O que você está pensando?",
}: Props) {
  const [postText, setPostText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const progress = useState(new Animated.Value(0))[0];

  const handlePickImage = async () => {
    if (posting) return;
    const file = await pickImage("posts");
    if (file) {
      setImage(file.uri);
      setPostError("");
    }
  };

  const handlePost = async () => {
    const text = postText.trim();
    if ((!text && !image) || posting) return;

    try {
      setPosting(true);
      setPostError("");
      await onSubmit(text, image);
      setPostText("");
      setImage(null);

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

  const canPost = (!!postText.trim() || !!image) && !posting;

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

      {image ? (
        <View style={styles.preview}>
          <Image source={{ uri: image }} style={styles.previewImage} contentFit="cover" />
          <TouchableOpacity
            style={styles.previewRemove}
            onPress={() => setImage(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Remover imagem"
          >
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handlePickImage}
          disabled={posting}
          accessibilityRole="button"
          accessibilityLabel="Anexar imagem"
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

  preview: { marginBottom: 10, alignSelf: "flex-start" },
  previewImage: { width: 160, height: 160, borderRadius: 12 },
  previewRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },

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

  progressBg: {
    height: 5,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    marginTop: 10,
    overflow: "hidden",
  },

  progress: { height: "100%", backgroundColor: "#6366f1" },
});
