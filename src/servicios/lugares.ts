import type { Lugar } from "@/tipos/lugar";
import {
  consultarApi,
  ErrorHttp,
  type RespuestaLista,
  type RespuestaUno,
} from "./api";

import {
  guardarLugaresEnCache,
  leerLugaresDeCache,
} from "@/servicios/cache-catalogo";

export async function obtenerLugares(): Promise<
  RespuestaLista<Lugar> & { desdeCache: boolean }
> {
  try {
    const respuesta = await consultarApi<RespuestaLista<Lugar>>(
      "/lugares?pagina=1&porPagina=500",
    );

    if (!Array.isArray(respuesta.datos)) {
      throw new Error("La API devolvió lugares inesperados.");
    }

    try {
      await guardarLugaresEnCache(respuesta);
    } catch {
      console.warn("No se pudo guardar el catálogo offline.");
    }

    return { ...respuesta, desdeCache: false };
  } catch (error) {
    if (
      error instanceof ErrorHttp &&
      error.estado >= 400 &&
      error.estado < 500
    ) {
      throw error;
    }

    const cache = await leerLugaresDeCache();

    if (cache) {
      return { ...cache, desdeCache: true };
    }

    throw error;
  }
}

export async function obtenerLugarPorId(id: string): Promise<Lugar | null> {
  try {
    const respuesta = await consultarApi<RespuestaUno<Lugar>>(
      `/lugares/${encodeURIComponent(id)}`,
    );

    return respuesta.datos;
  } catch (error) {
    if (error instanceof ErrorHttp && error.estado === 404) {
      return null;
    }

    if (
      error instanceof ErrorHttp &&
      error.estado >= 400 &&
      error.estado < 500
    ) {
      throw error;
    }

    const cache = await leerLugaresDeCache();

    if (cache) {
      const lugar = cache.datos.find((item) => item.id === id);

      return lugar ?? null;
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

    return respuesta.datos;
  } catch (error) {
    if (error instanceof ErrorHttp && error.estado === 404) {
      return null;
    }

    if (
      error instanceof ErrorHttp &&
      error.estado >= 400 &&
      error.estado < 500
    ) {
      throw error;
    }

    const cache = await leerLugaresDeCache();

    if (cache) {
      return cache.datos.find((lugar) => lugar.codigoQr === codigo) ?? null;
    }

    throw error;
  }
}
