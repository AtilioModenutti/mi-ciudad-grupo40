import { useSesion } from "@/contextos/SesionContexto";
import { sincronizarVisitas } from "@/servicios/visitas";
import * as Network from "expo-network";
import { useEffect } from "react";
import { AppState } from "react-native";

export function SincronizadorVisitas() {
  const { usuario, tokenSesion, sesionBloqueada } = useSesion();
  const red = Network.useNetworkState();
  const usuarioId = !sesionBloqueada ? usuario?.id : undefined;
  const token = !sesionBloqueada ? tokenSesion : null;
  const conectado =
    red.isConnected === true && red.isInternetReachable !== false;

  useEffect(() => {
    if (!usuarioId || !token || !conectado) return;
    void sincronizarVisitas(usuarioId, token).catch((error) => {
      console.warn("No se pudieron sincronizar las visitas:", error);
    });
  }, [usuarioId, token, conectado]);

  useEffect(() => {
    if (!usuarioId || !token) return;
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") return;
      void sincronizarVisitas(usuarioId, token).catch((error) => {
        console.warn("No se pudieron sincronizar las visitas:", error);
      });
    });
    return () => suscripcion.remove();
  }, [usuarioId, token]);

  return null;
}
