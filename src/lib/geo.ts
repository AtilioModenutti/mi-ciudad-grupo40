//este código lo que hace es utilizar la funcion distanceMeters que utiliza una formula Haversine
//que calcula la distancia aproximada sobre la superficie terrestre entre dos coordenadas geograficas.

import type { Coordenadas } from "@/tipos/lugar";

const earthRadiusMeters = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(from: Coordenadas, to: Coordenadas): number {
  const lat1 = toRadians(from.latitud);
  const lat2 = toRadians(to.latitud);

  const dLat = toRadians(to.latitud - from.latitud);
  const dLng = toRadians(to.longitud - from.longitud);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `A ${Math.round(meters)} m`;
  }

  return `A ${(meters / 1000).toFixed(1)} km`;
}
