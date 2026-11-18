import { useContext } from "react";

import { auth } from "@/config/firebase";
import { PostContext } from "@/context/PostContext";

// Publica no feed geral (coleção "posts"); a imagem já chega como link do Storage.
// Lança erro com mensagem amigável para o PostComposer mostrar.
export function usePublishPost() {
  const context = useContext(PostContext);

  return async (text: string, image?: string | null) => {
    if (!context) throw new Error("Não foi possível publicar agora.");
    if (!auth.currentUser) throw new Error("Entre na sua conta para publicar.");
    try {
      await context.addPost({ userId: auth.currentUser.uid, text, image: image ?? null });
    } catch {
      throw new Error("Não foi possível publicar. Verifique sua conexão e tente novamente.");
    }
  };
}
