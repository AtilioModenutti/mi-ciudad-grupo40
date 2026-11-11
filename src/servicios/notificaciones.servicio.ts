// src/servicios/notificaciones.servicio.ts
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

export const CANAL_EVENTOS_ID = "canal-eventos-colon";
const PREFIJO_NOTIF_STORAGE = "notif_evento_";

let Notifications: typeof import("expo-notifications") | null = null;
try {
  if (Platform.OS !== "web") {
    Notifications = require("expo-notifications");

    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch {}

export const NotificacionesServicio = {
  async inicializarCanalesYPermisos(): Promise<boolean> {
    if (Platform.OS === "web" || !Notifications) return false;

    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync(CANAL_EVENTOS_ID, {
          name: "Avisos de Eventos de Colón",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#0B3A5D",
          sound: "default",
        });
      } catch {}
    }

    try {
      const { status: existente } = await Notifications.getPermissionsAsync();
      let concedido = existente === "granted";

      if (!concedido) {
        const { status: nuevo } = await Notifications.requestPermissionsAsync();
        concedido = nuevo === "granted";
      }

      return concedido;
    } catch {
      return false;
    }
  },

  /**
   * Obtiene el ID de notificación guardado para un evento
   */
  async obtenerIdNotificacionGuardada(
    eventoId: string,
  ): Promise<string | null> {
    if (Platform.OS === "web") return null;
    try {
      return await Storage.getItem(`${PREFIJO_NOTIF_STORAGE}${eventoId}`);
    } catch {
      return null;
    }
  },

  /**
   * Programa recordatorio impidiendo avisos atrasados o para eventos cancelados
   */
  async programarAvisoEvento(
    id: string,
    titulo: string,
    fechaInicioIso: string,
    estado: string,
  ): Promise<string | null> {
    // 1. REGLA: No programar avisos para eventos cancelados o finalizados
    if (estado === "cancelado" || estado === "finalizado") {
      console.warn(
        "No se puede programar aviso: el evento está cancelado o finalizado.",
      );
      return null;
    }

    const fechaEvento = new Date(fechaInicioIso);
    const ahora = new Date();

    // 2. REGLA: No programar avisos para eventos que ya terminaron o pasaron
    if (fechaEvento.getTime() < ahora.getTime()) {
      console.warn("No se puede programar aviso: la fecha del evento ya pasó.");
      return null;
    }

    const idAviso = `aviso-${id}-${Date.now()}`;

    if (Platform.OS === "web" || !Notifications) {
      if (Platform.OS !== "web") {
        await Storage.setItem(`${PREFIJO_NOTIF_STORAGE}${id}`, idAviso);
      }
      return idAviso;
    }

    try {
      const tienePermiso = await this.inicializarCanalesYPermisos();
      if (!tienePermiso) return null;

      // Programar 2 horas antes del inicio
      const fechaDisparo = new Date(fechaEvento.getTime() - 2 * 60 * 60 * 1000);
      const disparoInmediato = fechaDisparo <= ahora;

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Recordatorio de Evento en Colón",
          body: `Pronto comenzará: ${titulo}`,
          data: { ruta: `/evento/${id}`, eventoId: id },
          sound: true,
        },
        trigger: disparoInmediato
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 5,
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: fechaDisparo,
            },
      });

      // Guardamos la asociación en almacenamiento persistente
      await Storage.setItem(`${PREFIJO_NOTIF_STORAGE}${id}`, notifId);
      return notifId;
    } catch {
      await Storage.setItem(`${PREFIJO_NOTIF_STORAGE}${id}`, idAviso);
      return idAviso;
    }
  },

  /**
   * Cancela el recordatorio y borra el registro persistente
   */
  async cancelarRecordatorio(eventoId: string): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      const notifId = await this.obtenerIdNotificacionGuardada(eventoId);
      if (notifId && Notifications) {
        await Notifications.cancelScheduledNotificationAsync(notifId);
      }
      await Storage.removeItem(`${PREFIJO_NOTIF_STORAGE}${eventoId}`);
    } catch (e) {
      console.warn("Error al cancelar recordatorio:", e);
    }
  },

  suscribirAlToque(alTocar: (ruta: string) => void) {
    if (Platform.OS === "web" || !Notifications) {
      return { remove: () => {} };
    }

    try {
      const sub = Notifications.addNotificationResponseReceivedListener(
        (respuesta) => {
          const ruta = respuesta.notification.request.content.data?.ruta;
          if (typeof ruta === "string") alTocar(ruta);
        },
      );
      return sub;
    } catch {
      return { remove: () => {} };
    }
  },
};
