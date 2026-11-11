import Storage from "expo-sqlite/kv-store";

function obtenerClave(usuarioId: string): string {
  return `mi-ciudad-favoritos-cuenta-v1-${usuarioId}`;
}

export async function guardarFavoritosCuentaCache(
  usuarioId: string,
  ids: string[],
): Promise<void> {
  await Storage.setItem(obtenerClave(usuarioId), JSON.stringify(ids));
}

export async function leerFavoritosCuentaCache(
  usuarioId: string,
): Promise<string[] | null> {
  const texto = await Storage.getItem(obtenerClave(usuarioId));

  if (texto === null) {
    return null;
  }

  try {
    const datos: unknown = JSON.parse(texto);

    if (Array.isArray(datos) && datos.every((id) => typeof id === "string")) {
      return datos;
    }

    return null;
  } catch {
    return null;
  }
}
