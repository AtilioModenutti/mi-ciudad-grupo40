export type EstadoEvento =
  | "programado"
  | "suspendido"
  | "cancelado"
  | "finalizado";

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  lugarId: string | null;
  direccionLibre: string | null;
  coordenadas: Coordenadas | null;
  inicio: string;
  fin: string | null;
  imagenUrl: string | null;
  precio: number | null;
  estado: EstadoEvento;
}

export interface AudioguiaItem {
  id: string;
  lugarId: string;
  tituloLugar: string;
  url: string;
  duracionSegundos: number;
  idioma: "es" | "en" | "pt";
}
