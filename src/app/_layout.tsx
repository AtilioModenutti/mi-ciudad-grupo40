import { NotificacionesServicio } from "@/servicios/notificaciones.servicio";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "Cannot connect to Expo CLI",
  "Push notifications",
  "Tried to show an alert",
]);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    // Listener para Deep Linking interno cuando el usuario toca una notificación
    const suscripcion = NotificacionesServicio.suscribirAlToque((ruta) => {
      router.push(ruta as any);
    });

    return () => {
      suscripcion.remove();
    };
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
