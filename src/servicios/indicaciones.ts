import type { Coordenadas } from "@/tipos/lugar";
import { Linking } from "react-native";

export type ModoViaje = "walking" | "driving";

export async function abrirIndicaciones(
  destino: Coordenadas,
  modo: ModoViaje,
): Promise<void> {
  const coordenadas = `${destino.latitud},${destino.longitud}`;

  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${encodeURIComponent(coordenadas)}` +
    `&travelmode=${modo}`;

  await Linking.openURL(url);
}
