import { ProveedorSesion } from "@/contextos/SesionContexto";
import { SincronizadorVisitas } from "@/components/SincronizadorVisitas";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { NotificacionesServicio } from "@/servicios/notificaciones.servicio";
import { Platform } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ProveedorFavoritos } from "../contextos/FavoritosContexto";

export default function RootLayout() {
  useEffect(() => {
    const suscripcion = NotificacionesServicio.suscribirAlToque((id) => {
      router.push({ pathname: "/evento/[id]", params: { id } });
    });
    return () => suscripcion.remove();
  }, []);

  return (
    <KeyboardProvider statusBarTranslucent={true}>
      <ProveedorSesion>
        <ProveedorFavoritos>
          <SincronizadorVisitas />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="mapa" options={{ title: "Mapa turístico" }} />
            <Stack.Screen name="agenda" options={{ title: "Agenda de Colón" }} />
            <Stack.Screen name="evento/[id]" options={{ title: "Detalle del evento" }} />
            <Stack.Screen name="audioguias" options={{ title: "Audioguías de Colón" }} />
            <Stack.Screen name="visitas" options={{ title: "Mi recorrido" }} />
            <Stack.Screen name="visita-manual" options={{ title: "Registrar visita manual" }} />
            <Stack.Screen name="visita-proximidad" options={{ title: "Visita por proximidad" }} />
            <Stack.Screen name="foto-visita" options={{ title: "Fotografía de visita" }} />

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
      </ProveedorSesion>
    </KeyboardProvider>
  );
}
