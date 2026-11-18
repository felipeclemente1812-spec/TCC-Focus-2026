import { Alert, Platform } from "react-native";

// Avisos e confirmações. Com o DialogHost montado (app/_layout.tsx) aparecem
// numa telinha sobreposta do próprio Focus; sem ele, caem no diálogo do sistema.

export type DialogRequest = {
  kind: "notify" | "confirm" | "success";
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

// Aviso de sucesso (ex.: conta criada): mesma telinha, com ícone de confirmação.
export function notifySuccess(title: string, message?: string, confirmLabel = "Continuar") {
  if (listener) {
    listener({ kind: "success", title, message, confirmLabel, resolve: () => {} });
    return;
  }
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

// Indicador "Enviando..." sobre a tela enquanto algo demora (ex.: envio de foto).
type BusyListener = (message: string | null) => void;
let busyListener: BusyListener | null = null;
let busyCount = 0;

export function subscribeBusy(fn: BusyListener) {
  busyListener = fn;
  return () => {
    if (busyListener === fn) busyListener = null;
  };
}

export async function withBusy<T>(message: string, task: () => Promise<T>): Promise<T> {
  busyCount += 1;
  busyListener?.(message);
  try {
    return await task();
  } finally {
    busyCount -= 1;
    if (busyCount <= 0) {
      busyCount = 0;
      busyListener?.(null);
    }
  }
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
