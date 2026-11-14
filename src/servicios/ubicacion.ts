import * as Location from "expo-location";

export async function obtenerUbicacionActual(
  ejecutarActividadNativa?: <T>(accion: () => Promise<T>) => Promise<T>,
): Promise<Location.LocationObjectCoords | null> {
  try {
    const permisoActual = await Location.getForegroundPermissionsAsync();
    const permiso = permisoActual.granted
      ? permisoActual
      : ejecutarActividadNativa
        ? await ejecutarActividadNativa(() =>
            Location.requestForegroundPermissionsAsync(),
          )
        : await Location.requestForegroundPermissionsAsync();
    const { status } = permiso;

    if (status !== "granted") {
      return null;
    }

    const posicion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return posicion.coords;
  } catch (error) {
    console.warn("No se pudo obtener la ubicación: ", error);
    return null;
  }
}
