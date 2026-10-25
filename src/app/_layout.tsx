import { Stack } from "expo-router";
import { Platform } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ProveedorFavoritos } from "../contextos/FavoritosContexto";

export default function RootLayout() {
  return (
    <KeyboardProvider statusBarTranslucent={true}>
      <ProveedorFavoritos>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />

          <Stack.Screen
            name="lugar/[id]"
            options={{ title: "Detalle del lugar" }}
          />

          <Stack.Screen name="escanear" options={{ title: "Escanear QR" }} />

          <Stack.Screen name="ingresar" options={{ title: "Ingresar" }} />

          <Stack.Screen
            name="registrarse"
            options={{
              title: "Registrarse",
              ...(Platform.OS === "android"
                ? { unstable_headerInsets: { top: false } }
                : {}),
            }}
          />
        </Stack>
      </ProveedorFavoritos>
    </KeyboardProvider>
  );
}
