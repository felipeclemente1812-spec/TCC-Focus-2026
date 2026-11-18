import { FontAwesome6 } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { useState } from "react";
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

import { auth } from "@/config/firebase";
import { profileService } from "@/services/profileService";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviandoReset, setEnviandoReset] = useState(false);

  const emailValido = (valor: string) => /\S+@\S+\.\S+/.test(valor);

  const handleLogin = async () => {
    const entrada = email.trim();
    setAviso("");

    if (!entrada || !senha) {
      setErro("Preencha e-mail (ou @usuário) e senha.");
      return;
    }

    // Login por @usuário: descobre o e-mail da conta
    let emailLimpo = entrada;
    if (!entrada.includes("@") || entrada.startsWith("@")) {
      const achado = await profileService.emailForHandle(entrada);
      if (!achado) {
        setErro("@usuário não encontrado. Confira o nome ou entre com o e-mail.");
        return;
      }
      emailLimpo = achado;
    }

    if (!emailValido(emailLimpo)) {
      setErro("Digite um e-mail ou @usuário válido.");
      return;
    }

    try {
      setErro("");
      setLoading(true);

      await signInWithEmailAndPassword(auth, emailLimpo, senha);

      router.replace("/(tabs)");
    } catch (error: any) {
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        setErro("E-mail ou senha incorretos.");
      } else if (error.code === "auth/network-request-failed") {
        setErro("Sem conexão. Verifique sua internet e tente novamente.");
      } else if (error.code === "auth/too-many-requests") {
        setErro("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
      } else {
        setErro("Não foi possível fazer login.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailLimpo = email.trim();
    setAviso("");

    if (!emailValido(emailLimpo)) {
      setErro("Digite seu e-mail acima para recuperar a senha.");
      return;
    }

    try {
      setErro("");
      setEnviandoReset(true);
      await sendPasswordResetEmail(auth, emailLimpo);
      // Mensagem neutra: não revela se o e-mail está cadastrado
      setAviso("Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
    } catch (error: any) {
      setErro(
        error.code === "auth/network-request-failed"
          ? "Sem conexão. Verifique sua internet e tente novamente."
          : "Não foi possível enviar o e-mail de recuperação.",
      );
    } finally {
      setEnviandoReset(false);
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
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
              <Image
                source={require("../../assets/images/logo-focus.png")}
                style={styles.brand}
                contentFit="contain"
                accessibilityLabel="Focus"
              />
              <Text style={styles.logo}>Login</Text>
              <Text style={styles.subtitle}>Entre na sua conta</Text>

              {/* EMAIL */}
              <View style={styles.inputContainer}>
                <FontAwesome6 name="envelope" size={16} color="#94a3b8" />
                <TextInput
                  placeholder="E-mail ou @usuário"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* SENHA */}
              <View style={styles.inputContainer}>
                <FontAwesome6 name="lock" size={16} color="#94a3b8" />
                <TextInput
                  placeholder="Senha"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  secureTextEntry
                  value={senha}
                  onChangeText={setSenha}
                  onSubmitEditing={handleLogin}
                  returnKeyType="go"
                />
              </View>

              {/* ESQUECEU SENHA */}
              <TouchableOpacity
                style={styles.forgotContainer}
                onPress={handleForgotPassword}
                disabled={enviandoReset}
                accessibilityRole="button"
              >
                <Text style={styles.forgot}>
                  {enviandoReset ? "Enviando..." : "Esqueceu a senha?"}
                </Text>
              </TouchableOpacity>

              {erro ? <Text style={styles.error}>{erro}</Text> : null}
              {aviso ? <Text style={styles.success}>{aviso}</Text> : null}

              {/* BOTÃO */}
              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
                accessibilityRole="button"
                aria-busy={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Entrar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={styles.link}>Não tem conta? Cadastre-se</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

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
    marginBottom: 30,
    textAlign: "center",
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

  forgotContainer: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    marginBottom: 6,
  },

  forgot: {
    color: "#cbd5f5",
    fontSize: 13,
  },

  error: {
    color: "#f87171",
    marginBottom: 10,
    textAlign: "center",
  },

  success: {
    color: "#86efac",
    marginBottom: 10,
    textAlign: "center",
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
