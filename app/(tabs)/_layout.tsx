import { FontAwesome, FontAwesome6, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useContext } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AlarmOverlay from "@/components/AlarmOverlay";
import { FocusLoading } from "@/components/FocusLogo";
import { TERMS_VERSION } from "@/constants/terms";
import LevelUpOverlay from "@/components/LevelUpOverlay";
import { UserContext } from "@/context/UserContext";

const TabIcon = ({ focused, children }: any) => {
  return (
    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: focused
          ? "rgba(255,255,255,0.15)"
          : "transparent",
      }}
    >
      <View
        style={{
          transform: [{ scale: focused ? 1.1 : 1 }],
        }}
      >
        {children}
      </View>
    </View>
  );
};

const Layout = () => {
  const userContext = useContext(UserContext);

  // Abas só com sessão ativa: após logout (ou acesso direto pela URL)
  // o usuário volta para o Login
  if (!userContext?.authReady) {
    return <FocusLoading />;
  }

  if (!userContext.user.uid) {
    return <Redirect href="/login" />;
  }

  // Contas que ainda não aceitaram a versão atual dos Termos de Uso passam pelo aceite
  if (userContext.user.termsVersion !== TERMS_VERSION) {
    return <Redirect href={{ pathname: "/terms", params: { mode: "accept" } }} />;
  }

  return (
    <>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
          {/* No celular, o teclado empurra a tela para cima (campos no fim não ficam escondidos) */}
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" enabled={Platform.OS !== "web"}>
            <Tabs
              // "voltar" nas telas secundárias retorna à tela anterior, não ao Feed
              backBehavior="history"
              screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                // A barra flutuante some com o teclado aberto (não cobre o campo)
                tabBarHideOnKeyboard: true,

                // 🔴 ESSENCIAL PRA CENTRALIZAR
                tabBarItemStyle: {
                  flex: 1,
                  height: 65,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 0,
                  paddingHorizontal: 0,
                },

                tabBarStyle: {
                  position: "absolute",
                  bottom: Platform.OS === "ios" ? 20 : 15,
                  left: 16,
                  right: 16,
                  height: 65,
                  borderRadius: 30,
                  overflow: "hidden",
                  backgroundColor: "transparent",
                  borderTopWidth: 0,
                  elevation: 0,
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-around",
                  alignItems: "center",
                  width: undefined,
                },

                tabBarBackground: () => (
                  <LinearGradient
                    colors={["#5b21b6", "#1e1b4b"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flex: 1,
                      borderRadius: 30,
                    }}
                  />
                ),
              }}
            >
              {/* Barra com as funções principais (pedido do grupo):
                  Início · Foco · Desafios · Grupos · Perfil */}

              {/* INÍCIO (hub) */}
              <Tabs.Screen
                name="challenges"
                options={{
                  tabBarAccessibilityLabel: "Início",
                  tabBarIcon: ({ focused }) => (
                    <TabIcon focused={focused}>
                      <FontAwesome6
                        name="house-chimney"
                        size={20}
                        color="#fff"
                        style={{ opacity: focused ? 1 : 0.7 }}
                      />
                    </TabIcon>
                  ),
                }}
              />

              {/* FOCO */}
              <Tabs.Screen
                name="focus"
                options={{
                  tabBarAccessibilityLabel: "Foco",
                  tabBarIcon: ({ focused }) => (
                    <TabIcon focused={focused}>
                      <Ionicons name="stopwatch" size={22} color="#fff" style={{ opacity: focused ? 1 : 0.7 }} />
                    </TabIcon>
                  ),
                }}
              />

              {/* DESAFIOS (minha rotina) */}
              <Tabs.Screen
                name="routine"
                options={{
                  tabBarAccessibilityLabel: "Desafios",
                  tabBarIcon: ({ focused }) => (
                    <TabIcon focused={focused}>
                      <FontAwesome6
                        name="trophy"
                        size={20}
                        color="#fff"
                        style={{ opacity: focused ? 1 : 0.7 }}
                      />
                    </TabIcon>
                  ),
                }}
              />

              {/* GRUPOS */}
              <Tabs.Screen
                name="groups"
                options={{
                  tabBarAccessibilityLabel: "Grupos",
                  tabBarIcon: ({ focused }) => (
                    <TabIcon focused={focused}>
                      <Ionicons name="people" size={22} color="#fff" style={{ opacity: focused ? 1 : 0.7 }} />
                    </TabIcon>
                  ),
                }}
              />

              {/* PERFIL */}
              <Tabs.Screen
                name="profile"
                options={{
                  tabBarAccessibilityLabel: "Perfil",
                  tabBarIcon: ({ focused }) => (
                    <TabIcon focused={focused}>
                      <FontAwesome
                        name="user"
                        size={20}
                        color="#fff"
                        style={{ opacity: focused ? 1 : 0.7 }}
                      />
                    </TabIcon>
                  ),
                }}
              />

              {/* TELAS SECUNDÁRIAS (sem ícone na barra) */}
              <Tabs.Screen name="progress" options={{ href: null }} />
              <Tabs.Screen name="ranking" options={{ href: null }} />
              <Tabs.Screen name="index" options={{ href: null }} />
              <Tabs.Screen name="catalog" options={{ href: null }} />
              <Tabs.Screen name="achievements" options={{ href: null }} />
              <Tabs.Screen name="bookshelf" options={{ href: null }} />
              <Tabs.Screen name="book" options={{ href: null }} />
              <Tabs.Screen name="book-search" options={{ href: null }} />
              <Tabs.Screen name="xp-history" options={{ href: null }} />
              <Tabs.Screen name="group" options={{ href: null }} />
              <Tabs.Screen name="task" options={{ href: null }} />
              <Tabs.Screen name="finance" options={{ href: null }} />
              <Tabs.Screen name="reminders" options={{ href: null }} />
              <Tabs.Screen name="agenda" options={{ href: null }} />
              <Tabs.Screen name="projects" options={{ href: null }} />
              <Tabs.Screen name="diary" options={{ href: null }} />
              <Tabs.Screen name="diary-entry" options={{ href: null }} />
              <Tabs.Screen name="user" options={{ href: null }} />
            </Tabs>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <LevelUpOverlay />
        <AlarmOverlay />

        <StatusBar style="light" />
    </>
  );
};

export default Layout;