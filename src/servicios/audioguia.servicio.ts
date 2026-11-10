// src/servicios/audioguia.servicio.ts
import { MOCK_AUDIOGUIAS } from "@/mocks/eventos.mock";
import { AudioguiaItem } from "@/tipos/agenda";
import { File, Paths } from "expo-file-system";

export const AudioguiaServicio = {
  /**
   * Obtiene la lista de audioguías disponibles para los atractivos de Colón
   */
  async obtenerTodas(): Promise<AudioguiaItem[]> {
    return [...MOCK_AUDIOGUIAS];
  },

  /**
   * Ruta física persistente dentro del almacenamiento del dispositivo
   */
  obtenerRutaLocal(id: string): string {
    return `${Paths.document}/audioguia_${id}.mp3`;
  },

  /**
   * Verifica si el archivo .mp3 ya fue descargado localmente
   */
  async estaDescargado(id: string): Promise<boolean> {
    try {
      const archivo = new File(this.obtenerRutaLocal(id));
      return archivo.exists;
    } catch {
      return false;
    }
  },

  /**
   * Descarga la audioguía usando la API moderna de expo-file-system
   */
  async descargarParaOffline(item: AudioguiaItem): Promise<string> {
    const destinoUri = this.obtenerRutaLocal(item.id);
    const archivoDestino = new File(destinoUri);

    if (archivoDestino.exists) {
      return archivoDestino.uri;
    }

    const archivoDescargado = await File.downloadFileAsync(
      item.url,
      archivoDestino,
    );
    return archivoDescargado.uri;
  },

  /**
   * Elimina la copia local de la memoria
   */
  async eliminarDescarga(id: string): Promise<void> {
    const archivo = new File(this.obtenerRutaLocal(id));
    if (archivo.exists) {
      await archivo.delete();
    }
  },
};
