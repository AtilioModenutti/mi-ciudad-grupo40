import Storage from "expo-sqlite/kv-store";
import type { Visita } from "../tipos/visita";

const CLAVE_VISITAS = "mi-ciudad-visitas";

export async function obtenerVisitas(): Promise<Visita[]> {
  const guardadas = await Storage.getItem(CLAVE_VISITAS);

  if (!guardadas) {
    return [];
  }

  const datos: unknown = JSON.parse(guardadas);

  if (!Array.isArray(datos)) {
    throw new Error("Las visitas guardadas no son válidas.");
  }

  return datos as Visita[];
}

export async function guardarVisitas(visitas: Visita[]): Promise<void> {
  await Storage.setItem(CLAVE_VISITAS, JSON.stringify(visitas));
}
