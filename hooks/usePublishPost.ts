import { useContext } from "react";

import { auth } from "@/config/firebase";
import { PostContext } from "@/context/PostContext";

// Publica no feed geral (coleção "posts" já existente); usado pelo Feed e pelo Perfil.
// Lança erro com mensagem amigável para o PostComposer mostrar.
export function usePublishPost() {
  const context = useContext(PostContext);

  return async (text: string) => {
    if (!context) throw new Error("Não foi possível publicar agora.");
    if (!auth.currentUser) throw new Error("Entre na sua conta para publicar.");
    try {
      // Imagens ficam para quando houver armazenamento no servidor
      await context.addPost({ userId: auth.currentUser.uid, text, image: null });
    } catch {
      throw new Error("Não foi possível publicar. Verifique sua conexão e tente novamente.");
    }
  };
}
