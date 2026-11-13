/** Modelo de una visita: coincide con los campos del PRD y de la API. */
export type OrigenVisita = "qr" | "gps" | "manual";

export interface Visita {
  id: string;
  usuarioId: string;
  lugarId: string;
  fechaHora: string;
  origen: OrigenVisita;
  fotoUri: string | null;
  nota: string | null;
  sincronizada: boolean;
  /** Copia en el dispositivo para seguir mostrando la foto sin conexión. */
  fotoLocalUri?: string | null;
}
