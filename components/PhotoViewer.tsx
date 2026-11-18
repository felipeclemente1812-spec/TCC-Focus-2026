import { Ionicons } from "@expo/vector-icons";
import { Image, ImageStyle } from "expo-image";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

// Foto que abre em tela cheia ao tocar (provas, anexos, desenhos, projetos).
// Em tela cheia a foto aparece inteira, sem corte; no celular dá para dar zoom
// com dois dedos (iOS) e rolar para ver os detalhes.
export function ZoomablePhoto({
  uri,
  style,
  label = "Foto",
  caption,
  onLongPress,
}: {
  uri: string;
  style: StyleProp<ImageStyle>;
  label?: string;
  caption?: string;
  onLongPress?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        onLongPress={onLongPress}
        activeOpacity={0.85}
        accessibilityRole="imagebutton"
        accessibilityLabel={`${label}. Toque para ver em tela cheia`}
      >
        <Image source={{ uri }} style={style} contentFit="cover" transition={150} />
      </TouchableOpacity>
      <PhotoModal uri={open ? uri : null} caption={caption} onClose={() => setOpen(false)} />
    </>
  );
}

export function PhotoModal({ uri, caption, onClose }: { uri: string | null; caption?: string; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <ScrollView
          style={StyleSheet.absoluteFill}
          contentContainerStyle={styles.zoomArea}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.zoomArea} onPress={onClose} accessibilityLabel="Fechar foto">
            {uri ? <Image source={{ uri }} style={{ width, height }} contentFit="contain" /> : null}
          </Pressable>
        </ScrollView>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" size={26} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  zoomArea: { flexGrow: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  caption: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 40,
    color: "#FFF",
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    padding: 8,
  },
  close: {
    position: "absolute",
    top: 40,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
