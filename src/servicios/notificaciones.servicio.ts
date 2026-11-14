import { solicitarApiConSesion, type RespuestaUno } from "@/servicios/api";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

const CANAL_EVENTOS = "mi-ciudad-eventos";
const PREFIJO_AVISO = "mi-ciudad-aviso-evento-v2:";
const PREFIJO_DISPOSITIVO = "mi-ciudad-push-dispositivo-v2:";
const CLAVE_PROPIETARIO_DISPOSITIVO = "mi-ciudad-push-propietario-v2";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function configurarNotificaciones(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANAL_EVENTOS, {
      name: "Recordatorios turísticos",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const permisoActual = await Notifications.getPermissionsAsync();
  if (permisoActual.granted) return true;
  const permiso = await Notifications.requestPermissionsAsync();
  return permiso.granted;
}

function claveAviso(usuarioId: string, eventoId: string): string {
  return `${PREFIJO_AVISO}${usuarioId}:${eventoId}`;
}

function claveDispositivo(usuarioId: string): string {
  return `${PREFIJO_DISPOSITIVO}${usuarioId}`;
}

export const NotificacionesServicio = {
  async obtenerIdNotificacionGuardada(
    usuarioId: string,
    eventoId: string,
  ): Promise<string | null> {
    return await Storage.getItem(claveAviso(usuarioId, eventoId));
  },

  async programarAvisoEvento(
    usuarioId: string,
    eventoId: string,
    titulo: string,
    fechaInicioIso: string,
    estado: string,
  ): Promise<string | null> {
    if (estado !== "programado") return null;
    const inicio = new Date(fechaInicioIso).getTime();
    const ahora = Date.now();
    if (!Number.isFinite(inicio) || inicio - ahora <= 60_000) return null;

    const tienePermiso = await configurarNotificaciones();
    if (!tienePermiso) return null;

    await this.cancelarRecordatorio(usuarioId, eventoId);
    const momento = Math.max(inicio - 30 * 60_000, ahora + 60_000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Recordatorio de Mi Colón",
        body: `Pronto comienza: ${titulo}`,
        data: { eventoId, usuarioId },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(momento),
        channelId: Platform.OS === "android" ? CANAL_EVENTOS : undefined,
      },
    });
    await Storage.setItem(claveAviso(usuarioId, eventoId), id);
    return id;
  },

  async cancelarRecordatorio(
    usuarioId: string,
    eventoId: string,
  ): Promise<void> {
    const clave = claveAviso(usuarioId, eventoId);
    const id = await Storage.getItem(clave);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await Storage.removeItem(clave);
    }
  },

  async cancelarRecordatoriosDeUsuario(usuarioId: string): Promise<void> {
    const pendientes = await Notifications.getAllScheduledNotificationsAsync();
    for (const notificacion of pendientes) {
      const datos = notificacion.content.data;
      if (datos?.usuarioId !== usuarioId) continue;
      await Notifications.cancelScheduledNotificationAsync(
        notificacion.identifier,
      );
      if (typeof datos.eventoId === "string") {
        await Storage.removeItem(claveAviso(usuarioId, datos.eventoId));
      }
    }
  },

  async estadoDispositivoRegistrado(usuarioId: string): Promise<boolean> {
    const propietario = await Storage.getItem(CLAVE_PROPIETARIO_DISPOSITIVO);
    return (
      propietario === usuarioId &&
      Boolean(await Storage.getItem(claveDispositivo(usuarioId)))
    );
  },

  async registrarDispositivoEnApi(
    tokenSesion: string,
    usuarioId: string,
  ): Promise<string> {
    const tienePermiso = await configurarNotificaciones();
    if (!tienePermiso)
      throw new Error("No se concedieron permisos de notificación.");

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      throw new Error(
        "Falta configurar el projectId de EAS para los avisos push.",
      );
    }

    const respuestaToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const tokenExpo = respuestaToken.data;
    if (!/^Expo(nent)?PushToken\[.+\]$/.test(tokenExpo)) {
      throw new Error("El dispositivo no devolvió un token Expo Push válido.");
    }

    await solicitarApiConSesion<RespuestaUno<{ tokenExpo: string }>>(
      "/dispositivos",
      tokenSesion,
      "POST",
      { tokenExpo, plataforma: Platform.OS === "ios" ? "ios" : "android" },
    );
    await Storage.setItem(claveDispositivo(usuarioId), tokenExpo);
    await Storage.setItem(CLAVE_PROPIETARIO_DISPOSITIVO, usuarioId);
    return tokenExpo;
  },

  async eliminarDispositivoDeApi(
    tokenSesion: string,
    usuarioId: string,
  ): Promise<boolean> {
    const clave = claveDispositivo(usuarioId);
    const tokenExpo = await Storage.getItem(clave);
    if (!tokenExpo) return false;
    await solicitarApiConSesion<never>(
      `/dispositivos/${encodeURIComponent(tokenExpo)}`,
      tokenSesion,
      "DELETE",
    );
    await Storage.removeItem(clave);
    if ((await Storage.getItem(CLAVE_PROPIETARIO_DISPOSITIVO)) === usuarioId) {
      await Storage.removeItem(CLAVE_PROPIETARIO_DISPOSITIVO);
    }
    return true;
  },

  async probarAvisoPushEnServidor(tokenSesion: string): Promise<number> {
    const respuesta = await solicitarApiConSesion<
      RespuestaUno<{ enviadas: number }>
    >("/dispositivos/prueba", tokenSesion, "POST");
    return respuesta?.datos?.enviadas ?? 0;
  },

  suscribirAlToque(alTocar: (eventoId: string) => void) {
    return Notifications.addNotificationResponseReceivedListener(
      (respuesta) => {
        const id = respuesta.notification.request.content.data?.eventoId;
        if (typeof id === "string" && /^evt-[A-Za-z0-9_-]+$/.test(id)) {
          alTocar(id);
        }
      },
    );
  },
};
