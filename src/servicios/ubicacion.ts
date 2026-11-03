import * as Location from "expo-location";

export async function obtenerUbicacionActual(): Promise<Location.LocationObjectCoords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync(); //Solicita permiso para acceder a la ubiciacion mientras usamos la app

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
