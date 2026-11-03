import { Alert, Platform } from "react-native";

// Avisos e confirmações. Com o DialogHost montado (app/_layout.tsx) aparecem
// numa telinha sobreposta do próprio Focus; sem ele, caem no diálogo do sistema.

export type DialogRequest = {
  kind: "notify" | "confirm";
  title: string;
  message?: string;
  confirmLabel: string;
  resolve: (answer: boolean) => void;
};

let listener: ((req: DialogRequest) => void) | null = null;

export function subscribeDialogs(fn: (req: DialogRequest) => void) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

export function notify(title: string, message?: string) {
  if (listener) {
    listener({ kind: "notify", title, message, confirmLabel: "OK", resolve: () => {} });
    return;
  }
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(
  title: string,
  message: string,
  confirmLabel = "Confirmar",
): Promise<boolean> {
  if (listener) {
    const show = listener;
    return new Promise((resolve) => show({ kind: "confirm", title, message, confirmLabel, resolve }));
  }

  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
