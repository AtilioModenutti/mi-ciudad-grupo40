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
  // Manejo defensivo en entornos restringidos de Expo Go
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
        // el sistema usará automáticamente el canal por defecto.
      }
    }

    // 2. Solicitud y validación de permisos de notificación
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
   * Obtiene el token único de Expo Push para este dispositivo físico
   */
  async obtenerExpoPushToken(projectId?: string): Promise<string | null> {
    if (Platform.OS === "web" || !Notifications) return null;

    try {
      const concedido = await this.inicializarCanalesYPermisos();
      if (!concedido) return null;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      return tokenData.data;
    } catch (error) {
      console.warn(
        "No se pudo generar el token de Expo en este entorno:",
        error,
      );
      return null;
    }
  },

  /**
   * Programa un recordatorio local para un evento turístico
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

  /**
   * Cancela un recordatorio local a partir de su ID
   */
  async cancelarRecordatorio(notificationId: string): Promise<void> {
    if (Platform.OS === "web" || !Notifications) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.warn("Error al cancelar recordatorio:", e);
    }
  },

  /**
   * Suscribe un callback al toque de la notificación para Deep Linking
   */
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

  /**
   * Registra el token del teléfono en el backend según NOTIFICATIONS.md
   * POST /dispositivos con { "tokenExpo": "...", "plataforma": "android" }
   */
  async registrarTokenEnServidor(
    tokenExpo: string,
    tokenAuth: string,
  ): Promise<boolean> {
    try {
      const baseUrl =
        process.env.EXPO_PUBLIC_API_URL ||
        "https://api-miciudad.lansdev.com.ar";
      const plataforma = Platform.OS === "ios" ? "ios" : "android";

      const res = await fetch(`${baseUrl}/dispositivos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAuth}`,
        },
        body: JSON.stringify({
          tokenExpo,
          plataforma,
        }),
      });

      // NOTIFICATIONS.md: 201 si es nuevo, 200 si ya existía
      return res.status === 201 || res.status === 200;
    } catch (e) {
      console.warn("No se pudo registrar el dispositivo en el backend:", e);
      return false;
    }
  },

  /**
   * Elimina el token del teléfono en el backend según NOTIFICATIONS.md
   * DELETE /dispositivos/{tokenExpo} -> responde 204 No Content
   */
  async eliminarTokenDelServidor(
    tokenExpo: string,
    tokenAuth: string,
  ): Promise<boolean> {
    try {
      const baseUrl =
        process.env.EXPO_PUBLIC_API_URL ||
        "https://api-miciudad.lansdev.com.ar";
      const tokenCodificado = encodeURIComponent(tokenExpo);

      const res = await fetch(`${baseUrl}/dispositivos/${tokenCodificado}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenAuth}`,
        },
      });

      // NOTIFICATIONS.md: 204 siempre, incluso si no estaba
      return res.status === 204;
    } catch (e) {
      console.warn("No se pudo eliminar el dispositivo en el backend:", e);
      return false;
    }
  },
};
