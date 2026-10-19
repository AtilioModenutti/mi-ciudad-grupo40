import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";

// Silenciamos advertencias de red para tener la pantalla limpia
LogBox.ignoreLogs(["Cannot connect to Expo CLI"]);

export default function RootLayout() {
  useEffect(() => {
    // Oculta el splash screen cuando la app está lista
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0B3A5D" }, // Azul institucional de Colón
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      {/* La pantalla principal (Home) no lleva header superior */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* La pantalla de Agenda con su título oficial */}
      <Stack.Screen
        name="agenda"
        options={{
          title: "Agenda de Colón",
          headerBackTitle: "Inicio",
        }}
      />
    </Stack>
  );
}
