import React, { createContext, ReactNode, useEffect, useState } from "react";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "@/config/firebase";

type Post = {
  id: string;
  userId: string;
  text?: string;
  image?: string | null;
};

type PostContextType = {
  posts: Post[];
  loading: boolean;
  error: string | null;
  addPost: (post: Omit<Post, "id">) => Promise<void>;
};

export const PostContext = createContext<PostContextType | undefined>(
  undefined,
);

export function PostProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // As regras exigem login: assina o feed só com sessão ativa e
  // reassina quando o usuário entra (antes, o listener morria no início)
  useEffect(() => {
    let unsubscribePosts: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribePosts?.();
      unsubscribePosts = null;

      if (!firebaseUser) {
        setPosts([]);
        setError("Entre na sua conta para ver o feed.");
        setLoading(false);
        return;
      }

      setLoading(true);
      unsubscribePosts = onSnapshot(
        query(collection(db, "posts"), orderBy("createdAt", "desc")),
        (snapshot) => {
          const postsData: Post[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Post, "id">),
          }));

          setPosts(postsData);
          setError(null);
          setLoading(false);
        },
        (err) => {
          setError(
            err.code === "permission-denied"
              ? "Entre na sua conta para ver o feed."
              : "Não foi possível carregar o feed. Verifique sua conexão.",
          );
          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribePosts?.();
      unsubscribeAuth();
    };
  }, []);

  const addPost = async (post: Omit<Post, "id">) => {
    await addDoc(collection(db, "posts"), {
      ...post,
      createdAt: serverTimestamp(),
    });
  };

  return (
    <PostContext.Provider value={{ posts, loading, error, addPost }}>
      {children}
    </PostContext.Provider>
  );
}
