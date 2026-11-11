// src/servicios/audioguia.servicio.ts
import { MOCK_AUDIOGUIAS } from "@/mocks/eventos.mock";
import { AudioguiaItem } from "@/tipos/agenda";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api-miciudad.lansdev.com.ar";

const CLAVE_CACHE_AUDIOGUIAS = "cache_audioguias_colon";

let FileSystem: typeof import("expo-file-system") | null = null;
if (Platform.OS !== "web") {
  FileSystem = require("expo-file-system");
}

export const AudioguiaServicio = {
  /**
   * Obtiene la lista de audioguías reales extrayéndolas de Lugar.audioguia en la API
   */
  async obtenerTodas(): Promise<AudioguiaItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/lugares`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const lugares: any[] = Array.isArray(data) ? data : (data.datos ?? []);

      // Filtramos lugares que tengan audioguía definida en el modelo real
      const audiosApi: AudioguiaItem[] = lugares
        .filter((l) => l.audioguia && l.audioguia.url)
        .map((l) => ({
          id: `aud-${l.id}`,
          lugarId: l.id,
          tituloLugar: l.nombre,
          url: l.audioguia.url,
          duracionSegundos: l.audioguia.duracionSegundos ?? 200,
          idioma: l.audioguia.idioma ?? "es",
        }));

      if (audiosApi.length > 0) {
        if (Platform.OS !== "web") {
          await Storage.setItem(
            CLAVE_CACHE_AUDIOGUIAS,
            JSON.stringify(audiosApi),
          );
        }
        return audiosApi;
      }
    } catch (e) {
      console.warn("Fallo al obtener audioguías de la API. Buscando caché:", e);
    }

    // Fallback a caché persistente
    if (Platform.OS !== "web") {
      try {
        const cache = await Storage.getItem(CLAVE_CACHE_AUDIOGUIAS);
        if (cache) return JSON.parse(cache);
      } catch {}
    }

    // Fallback final a mocks
    return [...MOCK_AUDIOGUIAS];
  },

  obtenerArchivoLocal(id: string) {
    if (!FileSystem) return null;
    return new FileSystem.File(
      FileSystem.Paths.document,
      `audioguia_${id}.mp3`,
    );
  },

  obtenerRutaLocal(id: string): string {
    const archivo = this.obtenerArchivoLocal(id);
    return archivo ? archivo.uri : "";
  },

  async estaDescargado(id: string): Promise<boolean> {
    if (!FileSystem) return false;
    try {
      const archivo = this.obtenerArchivoLocal(id);
      return archivo ? archivo.exists : false;
    } catch {
      return false;
    }
  },

  async descargarParaOffline(item: AudioguiaItem): Promise<string> {
    if (!FileSystem) return item.url;

    const archivoDestino = this.obtenerArchivoLocal(item.id);
    if (!archivoDestino) return item.url;

    if (archivoDestino.exists) {
      return archivoDestino.uri;
    }

    const descargado = await FileSystem.File.downloadFileAsync(
      item.url,
      archivoDestino,
    );
    return descargado.uri;
  },

  async eliminarDescarga(id: string): Promise<void> {
    if (!FileSystem) return;
    const archivo = this.obtenerArchivoLocal(id);
    if (archivo && archivo.exists) {
      await archivo.delete();
    }
  },
};
