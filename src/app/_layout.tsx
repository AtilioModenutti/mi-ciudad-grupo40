import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";

// Silenciamos advertencias de conectividad de CLI
LogBox.ignoreLogs(["Cannot connect to Expo CLI", "Push notifications"]);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0B3A5D" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="agenda"
        options={{
          title: "Agenda de Colón",
          headerBackTitle: "Inicio",
        }}
      />
      <Stack.Screen
        name="evento/[id]"
        options={{
          title: "Detalle del Evento",
          headerBackTitle: "Agenda",
        }}
      />
      <Stack.Screen
        name="audioguias"
        options={{
          title: "Audioguías de Colón",
          headerBackTitle: "Inicio",
        }}
      />
    </Stack>
  );
}
