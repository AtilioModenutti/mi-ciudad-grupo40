import { lugaresMock } from "../mocks/lugares";

export async function obtenerLugares() {
  return {
    datos: lugaresMock,
    meta: {
      total: lugaresMock.length,
      pagina: 1,
      porPagina: 20,
    },
  };
}

export async function obtenerLugarPorId(id: string) {
  const lugar = lugaresMock.find((lugar) => lugar.id === id);

  return lugar ?? null;
}

export async function obtenerLugarPorCodigoQr(codigo: string) {
  const lugar = lugaresMock.find(
    (lugar) => lugar.codigoQr === codigo && lugar.activo,
  );

  return lugar ?? null;
}
