import React, { ReactNode } from "react";
import { Image, StyleProp, View, ViewStyle } from "react-native";

type Props = {
  uri?: string | null;
  size: number;
  style?: StyleProp<ViewStyle>;
  // O que mostrar sem foto (cada tela mantém o seu ícone/emoji)
  children?: ReactNode;
};

// Avatar circular: mostra a foto quando houver, senão o fallback da tela
export default function UserAvatar({ uri, size, style, children }: Props) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={uri ? "Foto de perfil" : "Avatar padrão"}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} />
      ) : (
        children
      )}
    </View>
  );
}
