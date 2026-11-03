import { FontAwesome6 } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
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

import { auth, db } from "@/config/firebase";
import { UserContext } from "@/context/UserContext";
import { cleanHandle, profileService, USERNAME_REGEX } from "@/services/profileService";
import { notify } from "@/utils/feedback";

export default function RegisterScreen() {
  const router = useRouter();
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("UserContext não encontrado");
  }

  const { updateUser } = context;

  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [emailValido, setEmailValido] = useState<boolean | null>(null);
  const [senhaValida, setSenhaValida] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const validarEmail = (email: string): boolean =>
    /\S+@\S+\.\S+/.test(email);

  const validarSenha = (senha: string): boolean =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/.test(
      senha
    );

  const handleRegister = async () => {
    const usuarioLimpo = cleanHandle(usuario);

    if (!nome.trim() || !usuarioLimpo || !email.trim() || !senha) {
      notify("Erro", "Preencha todos os campos!");
      return;
    }

    if (!USERNAME_REGEX.test(usuarioLimpo)) {
      notify("Erro", "Nome de usuário: 3 a 20 caracteres, só letras minúsculas, números, _ ou .");
      return;
    }

    // TODO Firebase: conferir o @ no servidor (hoje só confere as contas deste aparelho)
    if (await profileService.isHandleTaken(usuarioLimpo)) {
      notify("Erro", `@${usuarioLimpo} já está em uso. Escolha outro.`);
      return;
    }

    if (!validarEmail(email)) {
      notify("Erro", "Digite um e-mail válido!");
      return;
    }

    if (!validarSenha(senha)) {
      notify(
        "Erro",
        "Senha precisa ter 8+ caracteres, maiúscula, minúscula, número e símbolo."
      );
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );

      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name: nome.trim(),
        email: email.trim(),
        bio: "",
        createdAt: new Date(),
      });

      // O @usuário fica no perfil local (profileService); vai para users/{uid} com o backend
      updateUser({
        uid: user.uid,
        name: nome.trim(),
        username: usuarioLimpo,
        email: email.trim(),
        bio: "",
      });

      // A nova sessão recria a navegação e o index leva ao plano inicial
      // (onboarding), então aqui não navegamos para não pular essa etapa.
      notify("Sucesso", "Conta criada! Agora vamos montar seu plano.");
    } catch (error: any) {
      if (error.code === "auth/network-request-failed") {
        notify("Erro", "Sem conexão. Verifique sua internet e tente novamente.");
      } else if (error.code === "auth/email-already-in-use") {
        notify("Erro", "Este e-mail já está cadastrado.");
      } else if (error.code === "auth/invalid-email") {
        notify("Erro", "E-mail inválido.");
      } else if (error.code === "auth/weak-password") {
        notify("Erro", "A senha é muito fraca.");
      } else {
        notify("Erro", "Não foi possível criar a conta.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#5b21b6", "#1e1b4b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          enabled={Platform.OS !== "web"}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              {/* TÍTULO */}
              <Image
                source={require("../../assets/images/logo-focus.png")}
                style={styles.brand}
                contentFit="contain"
                accessibilityLabel="Focus"
              />
              <Text style={styles.logo}>Cadastro</Text>

              <Text style={styles.subtitle}>
                Crie sua conta
              </Text>

              {/* NOME */}
              <View style={styles.inputContainer}>
                <FontAwesome6
                  name="user"
                  size={16}
                  color="#cbd5f5"
                />

                <TextInput
                  placeholder="Nome completo"
                  returnKeyType="next"
                  placeholderTextColor="#cbd5f5"
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                />
              </View>

              {/* @USUÁRIO */}
              <View style={styles.inputContainer}>
                <FontAwesome6
                  name="at"
                  size={16}
                  color="#cbd5f5"
                />

                <TextInput
                  placeholder="Nome de usuário (ex.: ana.estuda)"
                  returnKeyType="next"
                  placeholderTextColor="#cbd5f5"
                  style={styles.input}
                  value={usuario}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(text) => setUsuario(text.replace(/\s/g, "").toLowerCase())}
                />
              </View>

              {usuario.length > 0 && (
                <Text
                  style={[
                    styles.feedback,
                    { color: USERNAME_REGEX.test(cleanHandle(usuario)) ? "#22c55e" : "#f87171" },
                  ]}
                >
                  {USERNAME_REGEX.test(cleanHandle(usuario))
                    ? `Você será @${cleanHandle(usuario)}`
                    : "3 a 20 caracteres: letras minúsculas, números, _ ou ."}
                </Text>
              )}

              {/* EMAIL */}
              <View style={styles.inputContainer}>
                <FontAwesome6
                  name="envelope"
                  size={16}
                  color="#cbd5f5"
                />

                <TextInput
                  placeholder="E-mail"
                  returnKeyType="next"
                  placeholderTextColor="#cbd5f5"
                  style={styles.input}
                  value={email}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailValido(validarEmail(text));
                  }}
                />
              </View>

              {email.length > 0 && (
                <Text
                  style={[
                    styles.feedback,
                    {
                      color: emailValido
                        ? "#22c55e"
                        : "#f87171",
                    },
                  ]}
                >
                  {emailValido
                    ? "E-mail válido"
                    : "E-mail inválido"}
                </Text>
              )}

              {/* SENHA */}
              <View style={styles.inputContainer}>
                <FontAwesome6
                  name="lock"
                  size={16}
                  color="#cbd5f5"
                />

                <TextInput
                  placeholder="Senha"
                  placeholderTextColor="#cbd5f5"
                  style={styles.input}
                  secureTextEntry
                  returnKeyType="go"
                  onSubmitEditing={handleRegister}
                  value={senha}
                  onChangeText={(text) => {
                    setSenha(text);
                    setSenhaValida(validarSenha(text));
                  }}
                />
              </View>

              {senha.length > 0 && (
                <Text
                  style={[
                    styles.feedback,
                    {
                      color: senhaValida
                        ? "#22c55e"
                        : "#f87171",
                    },
                  ]}
                >
                  {senhaValida
                    ? "Senha forte"
                    : "Use 8+ caracteres, maiúscula, minúscula, número e símbolo"}
                </Text>
              )}

              {/* BOTÃO CADASTRO */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    Criar conta
                  </Text>
                )}
              </TouchableOpacity>

              {/* LOGIN */}
              <TouchableOpacity
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/login")
                }
                accessibilityRole="button"
              >
                <Text style={styles.link}>
                  Já tem conta? Entrar
                </Text>
              </TouchableOpacity>

              {/* O menu temporário "Acessar telas" saiu: com as abas
                  protegidas por login, ele só levava de volta ao Login */}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  gradient: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
  },

  container: {
    alignItems: "center",
  },

  // Logo do app (símbolo + "Focus") acima do título
  brand: { width: 200, height: 58, alignSelf: "center", marginBottom: 18 },

  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },

  subtitle: {
    color: "#cbd5f5",
    marginBottom: 28,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
  },

  input: {
    flex: 1,
    padding: 14,
    color: "#fff",
  },

  feedback: {
    alignSelf: "flex-start",
    marginBottom: 10,
    fontSize: 12,
  },

  button: {
    backgroundColor: "#6366f1",
    borderRadius: 16,
    width: "100%",
    paddingVertical: 14,
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 15,
  },

  link: {
    color: "#cbd5f5",
    marginTop: 18,
    fontSize: 14,
  },

});