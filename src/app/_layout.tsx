import { SincronizadorVisitas } from "@/components/SincronizadorVisitas";
import { ProveedorAvisosProximidad } from "@/contextos/AvisosProximidadContexto";
import { ProveedorSesion } from "@/contextos/SesionContexto";
import { NotificacionesServicio } from "@/servicios/notificaciones.servicio";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Image, Platform } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ProveedorFavoritos } from "../contextos/FavoritosContexto";

export default function RootLayout() {
  useEffect(() => {
    const suscripcion = NotificacionesServicio.suscribirAlToque((id) => {
      router.push({ pathname: "/evento/[id]", params: { id } });
    });
    const suscripcionLugares =
      Notifications.addNotificationResponseReceivedListener((respuesta) => {
        const lugarId = respuesta.notification.request.content.data?.lugarId;
        if (
          typeof lugarId === "string" &&
          /^lug-[A-Za-z0-9_-]+$/.test(lugarId)
        ) {
          router.push({ pathname: "/lugar/[id]", params: { id: lugarId } });
        }
      });
    return () => {
      suscripcion.remove();
      suscripcionLugares.remove();
    };
  }, []);

  return (
    <KeyboardProvider>
      <ProveedorSesion>
        <ProveedorAvisosProximidad>
          <ProveedorFavoritos>
            <StatusBar style="dark" hidden={false} />
            <SincronizadorVisitas />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: "#F6F8F5" },
                headerTintColor: "#185F65",
                headerTitleStyle: { fontSize: 18, fontWeight: "700" },
                contentStyle: { backgroundColor: "#F6F8F5" },
                statusBarStyle: "dark",
                headerRight: () => (
                  <Image
                    source={require("../../assets/branding/mi-colon-simbolo.png")}
                    style={{ width: 34, height: 34, marginRight: 4 }}
                    resizeMode="contain"
                    accessibilityLabel="Mi Colón"
                  />
                ),
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="mapa" options={{ title: "Mapa turístico" }} />
              <Stack.Screen
                name="agenda"
                options={{ title: "Agenda de Colón" }}
              />
              <Stack.Screen
                name="evento/[id]"
                options={{ title: "Detalle del evento" }}
              />
              <Stack.Screen
                name="audioguias"
                options={{ title: "Audioguías de Colón" }}
              />
              <Stack.Screen
                name="visitas"
                options={{ title: "Mi recorrido" }}
              />
              <Stack.Screen
                name="visita-manual"
                options={{ title: "Registrar visita manual" }}
              />
              <Stack.Screen
                name="visita-proximidad"
                options={{ title: "Visita por proximidad" }}
              />
              <Stack.Screen
                name="foto-visita"
                options={{ title: "Fotografía de visita" }}
              />

              <Stack.Screen
                name="lugar/[id]"
                options={{ title: "Detalle del lugar" }}
              />

              <Stack.Screen
                name="escanear"
                options={{ title: "Escanear QR" }}
              />

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
        </ProveedorAvisosProximidad>
      </ProveedorSesion>
    </KeyboardProvider>
  );
}
