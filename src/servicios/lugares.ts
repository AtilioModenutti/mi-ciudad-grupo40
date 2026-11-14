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

const POR_PAGINA = 20;

async function descargarCatalogoCompleto(): Promise<RespuestaLista<Lugar>> {
  const lugares = new Map<string, Lugar>();
  let pagina = 1;
  let totalEsperado: number | null = null;

  while (true) {
    const respuesta = await consultarApi<RespuestaLista<Lugar>>(
      `/lugares?pagina=${pagina}&porPagina=${POR_PAGINA}`,
    );

    if (
      !Array.isArray(respuesta?.datos) ||
      !respuesta.datos.every(
        (lugar) => typeof lugar?.id === "string" && lugar.id.length > 0,
      ) ||
      !Number.isInteger(respuesta.meta?.total) ||
      respuesta.meta.total < 0 ||
      respuesta.meta.pagina !== pagina ||
      !Number.isInteger(respuesta.meta.porPagina) ||
      respuesta.meta.porPagina <= 0
    ) {
      throw new Error("La API devolvió una página de lugares no válida.");
    }

    if (totalEsperado === null) {
      totalEsperado = respuesta.meta.total;
    } else if (totalEsperado !== respuesta.meta.total) {
      throw new Error(
        "El catálogo cambió durante la descarga. Volvé a actualizarlo.",
      );
    }

    const cantidadAnterior = lugares.size;
    for (const lugar of respuesta.datos) {
      lugares.set(lugar.id, lugar);
    }

    if (lugares.size === totalEsperado) break;

    if (
      lugares.size > totalEsperado ||
      respuesta.datos.length === 0 ||
      lugares.size === cantidadAnterior
    ) {
      throw new Error(
        "No se pudieron descargar todas las páginas del catálogo.",
      );
    }

    pagina += 1;
  }

  const datos = [...lugares.values()];
  return {
    datos,
    meta: {
      total: datos.length,
      pagina: 1,
      porPagina: Math.max(datos.length, 1),
    },
  };
}

export async function obtenerLugares(): Promise<
  RespuestaLista<Lugar> & { desdeCache: boolean }
> {
  try {
    const respuesta = await descargarCatalogoCompleto();

    try {
      await guardarLugaresEnCache(respuesta);
    } catch (error) {
      console.warn("No se pudo guardar el catálogo offline:", error);
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
    if (cache) return { ...cache, desdeCache: true };

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
    if (error instanceof ErrorHttp && error.estado === 404) return null;

    if (
      error instanceof ErrorHttp &&
      error.estado >= 400 &&
      error.estado < 500
    ) {
      throw error;
    }

    const cache = await leerLugaresDeCache();
    if (cache) return cache.datos.find((lugar) => lugar.id === id) ?? null;

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
    if (error instanceof ErrorHttp && error.estado === 404) return null;

    if (
      error instanceof ErrorHttp &&
      error.estado >= 400 &&
      error.estado < 500
    ) {
      throw error;
    }

    const cache = await leerLugaresDeCache();
    if (cache)
      return cache.datos.find((lugar) => lugar.codigoQr === codigo) ?? null;

    throw error;
  }
}
