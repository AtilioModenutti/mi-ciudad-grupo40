import { obtenerLugares } from "@/servicios/lugares";
import type { AudioguiaItem } from "@/tipos/agenda";
import { File, Paths } from "expo-file-system";

function nombreArchivo(item: AudioguiaItem): string {
  const extension =
    item.url.split("?")[0].match(/\.(mp3|m4a|aac|wav|ogg)$/i)?.[1] ?? "mp3";
  const id = item.id.replace(/[^A-Za-z0-9_-]/g, "_");
  return `mi-ciudad-audioguia-${id}.${extension.toLowerCase()}`;
}

function archivoLocal(item: AudioguiaItem): File {
  return new File(Paths.document, nombreArchivo(item));
}

export const AudioguiaServicio = {
  async obtenerTodas(): Promise<{
    audios: AudioguiaItem[];
    desdeCache: boolean;
  }> {
    const respuesta = await obtenerLugares();
    const audios = respuesta.datos
      .filter((lugar) => lugar.activo && lugar.audioguia?.url)
      .map(
        (lugar): AudioguiaItem => ({
          id: `aud-${lugar.id}`,
          lugarId: lugar.id,
          tituloLugar: lugar.nombre,
          url: lugar.audioguia!.url,
          duracionSegundos: lugar.audioguia!.duracionSegundos,
          idioma: lugar.audioguia!.idioma,
        }),
      );
    return { audios, desdeCache: respuesta.desdeCache };
  },

  obtenerRutaLocal(item: AudioguiaItem): string {
    return archivoLocal(item).uri;
  },

  async estaDescargado(item: AudioguiaItem): Promise<boolean> {
    return archivoLocal(item).exists;
  },

  async descargarParaOffline(item: AudioguiaItem): Promise<string> {
    const destino = archivoLocal(item);
    if (destino.exists) return destino.uri;
    const descargado = await File.downloadFileAsync(item.url, destino);
    if (!descargado.exists)
      throw new Error("No se completó la descarga de la audioguía.");
    return descargado.uri;
  },

  async eliminarDescarga(item: AudioguiaItem): Promise<void> {
    const archivo = archivoLocal(item);
    if (archivo.exists) archivo.delete();
  },
};
