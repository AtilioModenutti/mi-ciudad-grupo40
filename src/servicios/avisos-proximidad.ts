import type { LocationObjectCoords } from "expo-location";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

import { distanceMeters } from "@/lib/geo";
import type { Lugar } from "@/tipos/lugar";

export type RadioProximidad = 100 | 250 | 500;
export type AjustesProximidad = {
  habilitado: boolean;
  radioMetros: RadioProximidad;
};

const PREFIJO_AJUSTES = "mi-colon-avisos-proximidad-v1:";
const PREFIJO_ENVIOS = "mi-colon-proximidad-enviados-v1:";
const CANAL_PROXIMIDAD = "mi-colon-proximidad";
const TIEMPO_ENTRE_AVISOS = 30 * 60 * 1000;
const MAXIMO_AVISOS_DIARIOS = 3;

export async function leerAjustesProximidad(
  usuarioId: string,
  radioPreferido: number,
): Promise<AjustesProximidad> {
  const predeterminado: AjustesProximidad = {
    habilitado: false,
    radioMetros: esRadioValido(radioPreferido) ? radioPreferido : 250,
  };
  const guardado = await Storage.getItem(`${PREFIJO_AJUSTES}${usuarioId}`);
  if (!guardado) return predeterminado;
  try {
    const ajustes = JSON.parse(guardado) as Partial<AjustesProximidad>;
    return {
      habilitado: ajustes.habilitado === true,
      radioMetros: esRadioValido(ajustes.radioMetros)
        ? ajustes.radioMetros
        : predeterminado.radioMetros,
    };
  } catch {
    return predeterminado;
  }
}

function esRadioValido(valor: unknown): valor is RadioProximidad {
  return valor === 100 || valor === 250 || valor === 500;
}

export async function guardarAjustesProximidad(
  usuarioId: string,
  ajustes: AjustesProximidad,
): Promise<void> {
  await Storage.setItem(
    `${PREFIJO_AJUSTES}${usuarioId}`,
    JSON.stringify(ajustes),
  );
}

export async function solicitarPermisosProximidad(): Promise<void> {
  if (Platform.OS === "web") {
    throw new Error("Los avisos de cercanía se prueban en Android o iOS.");
  }
  const ubicacion = await Location.getForegroundPermissionsAsync();
  const permisoUbicacion = ubicacion.granted
    ? ubicacion
    : await Location.requestForegroundPermissionsAsync();
  if (!permisoUbicacion.granted) {
    throw new Error(
      "Se necesita el permiso de ubicación para detectar lugares cercanos.",
    );
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANAL_PROXIMIDAD, {
      name: "Lugares turísticos cercanos",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const notificaciones = await Notifications.getPermissionsAsync();
  const permisoNotificaciones = notificaciones.granted
    ? notificaciones
    : await Notifications.requestPermissionsAsync();
  if (!permisoNotificaciones.granted) {
    throw new Error(
      "Se necesita el permiso de notificaciones para recibir avisos cercanos.",
    );
  }
}

export async function comprobarPermisosProximidad(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const [ubicacion, avisos] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Notifications.getPermissionsAsync(),
  ]);
  return ubicacion.granted && avisos.granted;
}

function diaLocal(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

type EnviosDelDia = {
  lugares: string[];
  ultimoAviso: number;
};

let evaluando = false;

export async function evaluarAvisoProximidad(
  usuarioId: string,
  coordenadas: LocationObjectCoords,
  lugares: Lugar[],
  radioMetros: RadioProximidad,
): Promise<boolean> {
  if (evaluando) return false;
  if (
    !Number.isFinite(coordenadas.latitude) ||
    !Number.isFinite(coordenadas.longitude) ||
    coordenadas.accuracy === null ||
    !Number.isFinite(coordenadas.accuracy) ||
    coordenadas.accuracy > Math.min(80, radioMetros)
  ) {
    return false;
  }

  evaluando = true;
  try {
    const hoy = diaLocal();
    const clave = `${PREFIJO_ENVIOS}${usuarioId}:${hoy}`;
    const anterior = await Storage.getItem(clave);
    const envios: EnviosDelDia = anterior
      ? (JSON.parse(anterior) as EnviosDelDia)
      : { lugares: [], ultimoAviso: 0 };
    const yaAvisados = new Set(envios.lugares);

    if (
      yaAvisados.size >= MAXIMO_AVISOS_DIARIOS ||
      Date.now() - envios.ultimoAviso < TIEMPO_ENTRE_AVISOS
    ) {
      return false;
    }

    const desde = {
      latitud: coordenadas.latitude,
      longitud: coordenadas.longitude,
    };
    const cercano = lugares
      .filter((lugar) => lugar.activo && !yaAvisados.has(lugar.id))
      .map((lugar) => ({
        lugar,
        distancia: distanceMeters(desde, lugar.coordenadas),
      }))
      .filter(
        ({ distancia }) =>
          Number.isFinite(distancia) && distancia <= radioMetros,
      )
      .sort((a, b) => a.distancia - b.distancia)[0];

    if (!cercano) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Estás cerca de ${cercano.lugar.nombre}`,
        body: `Aproximadamente a ${Math.round(cercano.distancia)} metros. Tocá para conocerlo.`,
        data: { origen: "proximidad", lugarId: cercano.lugar.id },
        sound: "default",
      },
      trigger:
        Platform.OS === "android" ? { channelId: CANAL_PROXIMIDAD } : null,
    });
    await Storage.setItem(
      clave,
      JSON.stringify({
        lugares: [...yaAvisados, cercano.lugar.id],
        ultimoAviso: Date.now(),
      } satisfies EnviosDelDia),
    );
    return true;
  } finally {
    evaluando = false;
  }
}
