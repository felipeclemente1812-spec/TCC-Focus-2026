import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import UserAvatar from "@/components/UserAvatar";
import { UserContext } from "@/context/UserContext";
import { notify } from "@/utils/feedback";
import { uploadWithFeedback } from "@/utils/files";

const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

export default function CompleteProfileScreen() {
  const router = useRouter();
  const context = useContext(UserContext);

  const user = context?.user;

  const [nome, setNome] = useState(user?.name || "");
  const [usuario, setUsuario] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [erro, setErro] = useState("");

  // E-mail da conta vem do login; só é editável sem sessão
  const emailBloqueado = !!user?.uid && !!user?.email;

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify("Permissão necessária", "Libere o acesso às fotos para escolher um avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    const url = await uploadWithFeedback(asset.uri, "avatar", {
      name: asset.fileName ?? "avatar.jpg",
      mimeType: asset.mimeType,
      message: "Enviando foto de perfil...",
    });
    if (url) setAvatar(url);
  };

  const handleContinue = () => {
    const nomeLimpo = nome.trim();
    const usuarioLimpo = usuario.trim().replace(/^@/, "").toLowerCase();
    const emailLimpo = email.trim();

    if (!nomeLimpo || !usuarioLimpo || !emailLimpo) {
      setErro("Preencha o nome, nome de usuário e e-mail.");
      return;
    }

    if (!USERNAME_REGEX.test(usuarioLimpo)) {
      setErro("Nome de usuário: 3 a 20 caracteres, só letras minúsculas, números, _ ou .");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(emailLimpo)) {
      setErro("Digite um e-mail válido.");
      return;
    }

    setErro("");

    // O UserContext grava o perfil no Firestore (users/{uid})
    context?.updateUser({
      name: nomeLimpo,
      username: usuarioLimpo,
      email: emailLimpo,
      bio: bio.trim(),
      avatar,
    });

    router.replace("/(tabs)");
  };

  // Completar perfil só faz sentido com sessão ativa
  if (context?.authReady && !context.user.uid) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#5B21B6", "#1E1B4B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          enabled={Platform.OS !== "web"}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* VOLTAR */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/(tabs)")
              }
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <FontAwesome6
                name="arrow-left"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* FOTO */}
            <View style={styles.avatarContainer}>
              <UserAvatar uri={avatar} size={110} style={styles.avatar}>
                <FontAwesome6
                  name="user"
                  size={58}
                  color="#FFFFFF"
                />
              </UserAvatar>

              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handlePickImage}
                accessibilityRole="button"
                accessibilityLabel="Escolher foto de perfil"
              >
                <FontAwesome6
                  name="camera"
                  size={17}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>Complete seu perfil</Text>

            <Text style={styles.subtitle}>
              Conte um pouco mais sobre você
            </Text>

            {/* FORMULÁRIO */}
            <View style={styles.form}>
              {/* NOME */}
              <Text style={styles.label}>Nome</Text>

              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Digite seu nome"
                placeholderTextColor="#B9A9D4"
              />

              {/* USUÁRIO */}
              <Text style={styles.label}>Nome de usuário</Text>

              <TextInput
                style={styles.input}
                value={usuario}
                onChangeText={setUsuario}
                placeholder="@seuusuario"
                placeholderTextColor="#B9A9D4"
                autoCapitalize="none"
              />

              {/* EMAIL */}
              <Text style={styles.label}>E-mail</Text>

              <TextInput
                style={[styles.input, emailBloqueado && { opacity: 0.6 }]}
                value={email}
                onChangeText={setEmail}
                editable={!emailBloqueado}
                placeholder="seuemail@email.com"
                placeholderTextColor="#B9A9D4"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* BIO */}
              <Text style={styles.label}>Bio</Text>

              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Fale um pouco sobre você..."
                placeholderTextColor="#B9A9D4"
                multiline
                textAlignVertical="top"
                maxLength={160}
              />

              {erro ? <Text style={styles.error}>{erro}</Text> : null}

              {/* CONTINUAR */}
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <Text style={styles.continueText}>
                  Continuar
                </Text>

                <FontAwesome6
                  name="arrow-right"
                  size={16}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#5B21B6",
  },

  flex: {
    flex: 1,
  },

  background: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* VOLTAR */
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  /* AVATAR */
  avatarContainer: {
    alignSelf: "center",
    position: "relative",
    marginTop: 2,
    marginBottom: 18,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#7461C7",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  cameraButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#4C1D95",
  },

  /* TÍTULO */
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    color: "#CFC4E8",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
  },

  /* FORM */
  form: {
    width: "100%",
  },

  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },

  /* CAMPOS MAIORES E ARREDONDADOS */
  input: {
    width: "100%",
    height: 56,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 18,
    color: "#FFFFFF",
    fontSize: 15,
    marginBottom: 18,
  },

  bioInput: {
    height: 110,
    paddingTop: 17,
    paddingBottom: 17,
  },

  /* BOTÃO */
  continueButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  error: {
    color: "#FCA5A5",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
});