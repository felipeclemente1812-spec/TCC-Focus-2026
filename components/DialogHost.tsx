import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DialogRequest, subscribeBusy, subscribeDialogs } from "@/utils/feedback";

// Telinha sobreposta para avisos e confirmações (ideia do modal do Squill,
// nas cores do Focus). Montada uma vez no layout raiz; confirmAction/notify
// de utils/feedback abrem por aqui.
export default function DialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => subscribeDialogs((req) => setQueue((q) => [...q, req])), []);
  useEffect(() => subscribeBusy(setBusy), []);

  const current = queue[0];

  const close = (answer: boolean) => {
    current?.resolve(answer);
    setQueue((q) => q.slice(1));
  };

  return (
    <>
    <Modal
      transparent
      visible={!!current}
      animationType="fade"
      onRequestClose={() => close(false)}
    >
      <View style={styles.overlay}>
        {current ? (
          <View style={styles.box}>
            <View
              style={[
                styles.iconCircle,
                current.kind === "confirm" && styles.iconCircleDanger,
                current.kind === "success" && styles.iconCircleSuccess,
              ]}
            >
              <Ionicons
                name={
                  current.kind === "confirm"
                    ? "trash-outline"
                    : current.kind === "success"
                      ? "checkmark-circle-outline"
                      : "information-circle-outline"
                }
                size={current.kind === "success" ? 28 : 22}
                color={
                  current.kind === "confirm" ? "#FCA5A5" : current.kind === "success" ? "#86EFAC" : "#DDD6FE"
                }
              />
            </View>

            <Text style={styles.title}>{current.title}</Text>
            {current.message ? <Text style={styles.message}>{current.message}</Text> : null}

            <View style={styles.buttons}>
              {current.kind === "confirm" ? (
                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => close(false)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.btn, current.kind === "confirm" ? styles.dangerBtn : styles.okBtn]}
                onPress={() => close(true)}
              >
                <Text style={current.kind === "confirm" ? styles.dangerText : styles.okText}>
                  {current.confirmLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>

    <Modal transparent visible={!!busy && !current} animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.busyBox}>
          <ActivityIndicator color="#DDD6FE" />
          <Text style={styles.busyText}>{busy}</Text>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 20,
  },
  box: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#25193A",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#7C3AED",
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(124,58,237,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircleDanger: {
    backgroundColor: "rgba(239,68,68,0.18)",
  },
  iconCircleSuccess: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  busyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#25193A",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "#7C3AED",
  },
  busyText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    color: "#C7BADB",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    alignSelf: "stretch",
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  cancelBtn: {
    borderColor: "#5B4A73",
  },
  dangerBtn: {
    borderColor: "#F87171",
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  okBtn: {
    borderColor: "#7C3AED",
    backgroundColor: "#7C3AED",
  },
  cancelText: {
    color: "#DDD6FE",
    fontSize: 15,
  },
  dangerText: {
    color: "#FCA5A5",
    fontSize: 15,
    fontWeight: "700",
  },
  okText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
