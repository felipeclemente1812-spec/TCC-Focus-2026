import { Image } from "expo-image";
import { ActivityIndicator, StyleProp, View, ViewStyle } from "react-native";

// Logo oficial do Focus (assets/images): "full" = símbolo + nome; "symbol" = só o símbolo
const FULL = require("../assets/images/logo-focus.png");
const SYMBOL = require("../assets/images/logo-simbolo.png");
// Proporção do logo completo (720 x 210)
const FULL_RATIO = 720 / 210;

export function FocusLogo({
  variant = "full",
  size = 160,
  style,
}: {
  variant?: "full" | "symbol";
  size?: number; // largura
  style?: StyleProp<ViewStyle>;
}) {
  const height = variant === "full" ? size / FULL_RATIO : size;
  return (
    <View style={style}>
      <Image
        source={variant === "full" ? FULL : SYMBOL}
        style={{ width: size, height }}
        contentFit="contain"
        accessibilityLabel="Focus"
      />
    </View>
  );
}

// Tela de carregamento com o logo (abertura do app e dados salvos)
export function FocusLoading() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center", gap: 24 }}>
      <FocusLogo size={200} />
      <ActivityIndicator color="#a78bfa" size="large" />
    </View>
  );
}
