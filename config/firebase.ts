import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCL7vERa2Kfgc7pvo1NM4e9J-ze2Ki_v90",
  authDomain: "tcc-2026-focus.firebaseapp.com",
  projectId: "tcc-2026-focus",
  storageBucket: "tcc-2026-focus.firebasestorage.app",
  messagingSenderId: "146572800245",
  appId: "1:146572800245:web:f40f562aa772da8bb415bc",
};

const app = initializeApp(firebaseConfig);

// O ÚNICO uso do AsyncStorage no app: guardar o TOKEN DE LOGIN no celular,
// para o usuário continuar logado ao fechar e abrir o app.
// Nenhum dado do app (XP, rotina, grupos...) é salvo no aparelho: tudo vai para o Firestore.
// Na web o getAuth já persiste sozinho.
let authInstance: Auth;
if (Platform.OS === "web") {
  authInstance = getAuth(app);
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    initializeAuth,
    getReactNativePersistence,
  } = require("firebase/auth");
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Já inicializado (ex.: Fast Refresh)
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
export const db = getFirestore(app);
