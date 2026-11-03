import { onAuthStateChanged } from "firebase/auth";
import React, { createContext, ReactNode, useEffect, useRef, useState } from "react";

import { auth } from "@/config/firebase";
import { EMPTY_PROFILE, Profile, profileService } from "@/services/profileService";

// Fonte única dos dados do usuário logado.
// O perfil é salvo por profileService (hoje: neste aparelho; depois: users/{uid}).
type UserType = Profile & { uid: string };

type UserContextType = {
  user: UserType;
  authReady: boolean; // false até o Firebase Auth dizer se há sessão
  updateUser: (data: Partial<UserType>) => void;
  resetUser: () => void;
};

const EMPTY_USER: UserType = { uid: "", ...EMPTY_PROFILE };

export const UserContext = createContext<UserContextType | null>(null);

export function displayName(user: Pick<UserType, "name">) {
  return user.name.trim() || "Usuário";
}

const toProfile = ({ uid: _uid, ...profile }: UserType): Profile => profile;

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserType>(EMPTY_USER);
  const [authReady, setAuthReady] = useState(false);
  // Só grava depois de ler o perfil salvo (para não sobrescrever com vazio)
  const loadedUid = useRef("");

  // Mantém uid/e-mail alinhados com a sessão do Firebase Auth
  // (não lê nem grava o Firestore)
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        loadedUid.current = "";
        setUser((prev) => (prev.uid ? EMPTY_USER : prev));
        setAuthReady(true);
        return;
      }
      const uid = firebaseUser.uid;
      profileService.load(uid).then((saved) => {
        setUser((prev) => {
          // Outro usuário entrou: não herda o perfil anterior
          const base = prev.uid && prev.uid !== uid ? EMPTY_USER : prev;
          return {
            ...base,
            ...(saved ?? {}),
            // O que o cadastro acabou de preencher vale mais que o vazio salvo
            name: saved?.name || base.name,
            username: saved?.username || base.username,
            uid,
            email: firebaseUser.email ?? saved?.email ?? base.email,
          };
        });
        loadedUid.current = uid;
        setAuthReady(true);
      });
    });
  }, []);

  useEffect(() => {
    if (user.uid && loadedUid.current === user.uid) {
      profileService.save(user.uid, toProfile(user));
    }
  }, [user]);

  const updateUser = (data: Partial<UserType>) => {
    setUser((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const resetUser = () => setUser(EMPTY_USER);

  return (
    <UserContext.Provider value={{ user, authReady, updateUser, resetUser }}>
      {children}
    </UserContext.Provider>
  );
}
