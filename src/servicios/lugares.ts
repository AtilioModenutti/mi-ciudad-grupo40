import type { Lugar } from "../tipos/lugar";

import {
  consultarApi,
  ErrorApi,
  type RespuestaLista,
  type RespuestaUno,
} from "./clienteApi";

export async function obtenerLugares(): Promise<RespuestaLista<Lugar>> {
  const respuesta = await consultarApi<RespuestaLista<Lugar>>(
    "/lugares?porPagina=500",
  );

  if (!Array.isArray(respuesta.datos)) {
    throw new Error("La API devolvió una lista de lugares inválida.");
  }

  return respuesta;
}

export async function obtenerLugarPorId(id: string): Promise<Lugar | null> {
  try {
    const respuesta = await consultarApi<RespuestaUno<Lugar>>(
      `/lugares/${encodeURIComponent(id)}`,
    );

    if (!respuesta.datos?.id) {
      throw new Error("La API devolvió un lugar inválido.");
    }

    return respuesta.datos;
  } catch (error) {
    if (error instanceof ErrorApi && error.codigo === "LUGAR_NO_ENCONTRADO") {
      return null;
    }

    throw error;
  }
}

export async function obtenerLugarPorCodigoQr(
  codigo: string,
): Promise<Lugar | null> {
  try {
    const respuesta = await consultarApi<RespuestaUno<Lugar>>(
      `/lugares/qr/${encodeURIComponent(codigo)}`,
    );

    if (!respuesta.datos?.id) {
      throw new Error("La API devolvió un lugar inválido.");
    }

    return respuesta.datos;
  } catch (error) {
    if (error instanceof ErrorApi && error.codigo === "QR_NO_RECONOCIDO") {
      return null;
    }

    throw error;
  }
}
