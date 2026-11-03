import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import "react-native-reanimated";

import DialogHost from "@/components/DialogHost";
import { PostProvider } from "@/context/PostContext";
import { SessionProviders } from "@/context/SessionProviders";
import { UserProvider } from "@/context/UserContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // 🔒 Providers envolvem toda a app (auth + tabs).
  // SessionProviders (XP, rotina, foco) é recriado a cada troca de conta.
  return (
    <UserProvider>
      <PostProvider>
        <SessionProviders>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/register" />
            <Stack.Screen name="(auth)/complete-profile" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <DialogHost />
        </SessionProviders>
      </PostProvider>
    </UserProvider>
  );
}
