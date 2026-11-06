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

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function bearingDegrees(from: Coordenadas, to: Coordenadas): number {
  const lat1 = toRadians(from.latitud);
  const lat2 = toRadians(to.latitud);
  const dLng = toRadians(to.longitud - from.longitud);

  const y = Math.sin(dLng) * Math.cos(lat2);

  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function headingFromMagnetometer(x: number, y: number): number {
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function arrowRotationDegrees(bearing: number, heading: number): number {
  return (bearing - heading + 360) % 360;
}
