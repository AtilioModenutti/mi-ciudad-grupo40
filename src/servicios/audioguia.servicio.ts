// src/servicios/audioguia.servicio.ts
import { MOCK_AUDIOGUIAS } from "@/mocks/eventos.mock";
import { AudioguiaItem } from "@/tipos/agenda";
import { Platform } from "react-native";

let FileSystem: typeof import("expo-file-system") | null = null;
if (Platform.OS !== "web") {
  FileSystem = require("expo-file-system");
}

export const AudioguiaServicio = {
  async obtenerTodas(): Promise<AudioguiaItem[]> {
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
