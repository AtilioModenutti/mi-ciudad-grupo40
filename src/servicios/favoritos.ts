import Storage from "expo-sqlite/kv-store";

const CLAVE_FAVORITOS = "mi-ciudad-favoritos-api-local-v1";

export async function obtenerFavoritos(): Promise<string[]> {
  const guardados = await Storage.getItem(CLAVE_FAVORITOS);

  if (!guardados) {
    return [];
  }

  const datos: unknown = JSON.parse(guardados);

  if (!Array.isArray(datos) || !datos.every((id) => typeof id === "string")) {
    throw new Error("Los favoritos guardados no son validos.");
  }

  return datos as string[];
}

export async function guardarFavoritos(favoritos: string[]): Promise<void> {
  await Storage.setItem(CLAVE_FAVORITOS, JSON.stringify(favoritos));
}
