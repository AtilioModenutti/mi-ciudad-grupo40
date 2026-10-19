import { AudioguiaItem, Evento } from "@/tipos/agenda";

export const MOCK_EVENTOS: Evento[] = [
  {
    id: "evt-001",
    titulo: "Visita Guiada Nocturna: Molino Forclaz",
    descripcion:
      "Recorrido teatralizado histórico por las viviendas de los primeros colonos suizos.",
    lugarId: "lug-004",
    direccionLibre: null,
    coordenadas: { latitud: -32.1904, longitud: -58.1932 },
    inicio: "2026-10-25T20:30:00-03:00",
    fin: "2026-10-25T22:30:00-03:00",
    imagenUrl:
      "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800",
    precio: 2500,
    estado: "programado",
  },
  {
    id: "evt-002",
    titulo: "Peña Folclórica y Costanera",
    descripcion:
      "Música litoraleña en vivo, artesanos y gastronomía entrerriana frente al río.",
    lugarId: null,
    direccionLibre: "Costanera y Av. Quirós",
    coordenadas: { latitud: -32.2285, longitud: -58.1364 },
    inicio: "2026-10-26T21:00:00-03:00",
    fin: "2026-10-27T02:00:00-03:00",
    imagenUrl:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
    precio: 0,
    estado: "programado",
  },
  {
    id: "evt-003",
    titulo: "Avistaje de Aves en El Palmar",
    descripcion: "Salida de avistaje de fauna en los senderos de yatay.",
    lugarId: "lug-001",
    direccionLibre: null,
    coordenadas: { latitud: -31.8652, longitud: -58.2356 },
    inicio: "2026-10-27T07:30:00-03:00",
    fin: "2026-10-27T11:00:00-03:00",
    imagenUrl:
      "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800",
    precio: 1800,
    estado: "suspendido",
  },
  {
    id: "evt-004",
    titulo: "Feria Regional de Artesanías",
    descripcion: "Muestra de platería criolla, cerámica y tallado en madera.",
    lugarId: null,
    direccionLibre: "Plaza San Martín",
    coordenadas: { latitud: -32.2226, longitud: -58.1408 },
    inicio: "2026-10-28T18:00:00-03:00",
    fin: "2026-10-28T23:30:00-03:00",
    imagenUrl: null,
    precio: 0,
    estado: "cancelado",
  },
];

export const MOCK_AUDIOGUIAS: AudioguiaItem[] = [
  {
    id: "aud-001",
    lugarId: "lug-004",
    tituloLugar: "Molino Forclaz (Historia de la molienda)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duracionSegundos: 372,
    idioma: "es",
  },
  {
    id: "aud-002",
    lugarId: "lug-001",
    tituloLugar: "Parque Nacional El Palmar (Sendero de las Ruinas)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duracionSegundos: 245,
    idioma: "es",
  },
];
