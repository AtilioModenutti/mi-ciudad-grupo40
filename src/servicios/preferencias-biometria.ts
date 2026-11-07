import Storage from "expo-sqlite/kv-store";

function obtenerClave(usuarioId: string): string {
  return `mi-ciudad-biometria-${usuarioId}`;
}

export async function obtenerBiometriaHabilitada(
  usuarioId: string,
): Promise<boolean> {
  const valor = await Storage.getItem(obtenerClave(usuarioId));
  return valor === "true";
}

export async function guardarBiometriaHabilitada(
  usuarioId: string,
  habilitada: boolean,
): Promise<void> {
  await Storage.setItem(obtenerClave(usuarioId), String(habilitada));
}
