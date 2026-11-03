import { Redirect } from "expo-router";

// O Feed solto saiu: a casinha abre Desafios, que é o hub do app.
// (As postagens continuam no Perfil e nos murais dos grupos.)
export default function Index() {
  return <Redirect href="/challenges" />;
}
