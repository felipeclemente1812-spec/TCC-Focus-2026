import { Redirect } from "expo-router";
import { useContext } from "react";

import { FocusLoading } from "@/components/FocusLogo";
import { RoutineContext } from "@/context/RoutineContext";
import { UserContext } from "@/context/UserContext";

// Porta de entrada: espera o Firebase Auth dizer se há sessão e manda
// para o Login, para o plano inicial (conta nova) ou para o Feed.
export default function Index() {
  const userContext = useContext(UserContext);
  const routine = useContext(RoutineContext);

  if (!userContext?.authReady) {
    return <FocusLoading />;
  }

  if (!userContext.user.uid) return <Redirect href="/login" />;
  if (routine && !routine.planned) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
