// src/servicios/notificaciones.servicio.ts
import { Platform } from "react-native";

export const CANAL_EVENTOS_ID = "canal-eventos-colon";

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
} catch {
  // Entorno sin soporte nativo directo
}

export const NotificacionesServicio = {
  /**
   * Configura canales de Android y solicita permisos de ejecución.
   * Aísla la creación del canal para que no aborte en Expo Go.
   */
  async inicializarCanalesYPermisos(): Promise<boolean> {
    if (Platform.OS === "web" || !Notifications) return false;

    // 1. Intento aislado de configurar el canal en Android
    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync(CANAL_EVENTOS_ID, {
          name: "Avisos de Eventos de Colón",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#0B3A5D",
          sound: "default",
        });
      } catch {
        // En Expo Go Android el proveedor de canales personalizados es null por diseño;
        // el sistema usará automáticamente el canal por defecto sin interrumpir.
      }
    }

    // 2. Solicitud y validación real de permisos de notificación
    try {
      const { status: existente } = await Notifications.getPermissionsAsync();
      let concedido = existente === "granted";

      if (!concedido) {
        const { status: nuevo } = await Notifications.requestPermissionsAsync();
        concedido = nuevo === "granted";
      }

      return concedido;
    } catch (error) {
      console.warn("No se pudo consultar el permiso de notificaciones:", error);
      return false;
    }
  },

  /**
   * Programa el recordatorio local para un evento
   */
  async programarAvisoEvento(
    id: string,
    titulo: string,
    fechaInicioIso: string,
  ): Promise<string | null> {
    const idAviso = `aviso-${id}-${Date.now()}`;

    if (Platform.OS === "web" || !Notifications) {
      console.log(
        `[Aviso Local Simulado] Para "${titulo}" en ${fechaInicioIso}`,
      );
      return idAviso;
    }

    try {
      const tienePermiso = await this.inicializarCanalesYPermisos();
      if (!tienePermiso) return null;

      const fechaEvento = new Date(fechaInicioIso);
      const ahora = new Date();
      const fechaDisparo = new Date(fechaEvento.getTime() - 60 * 60 * 1000);
      const disparoInmediato = fechaDisparo <= ahora;

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Recordatorio de Evento en Colón",
          body: `Pronto comenzará: ${titulo}`,
          data: {
            ruta: `/evento/${id}`,
            eventoId: id,
          },
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

      return notifId;
    } catch (err) {
      console.warn(
        "Aviso registrado con identificador local de respaldo:",
        err,
      );
      return idAviso;
    }
  },

  async cancelarRecordatorio(notificationId: string): Promise<void> {
    if (Platform.OS === "web" || !Notifications) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
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
          if (typeof ruta === "string") {
            alTocar(ruta);
          }
        },
      );
      return sub;
    } catch {
      return { remove: () => {} };
    }
  },
};
