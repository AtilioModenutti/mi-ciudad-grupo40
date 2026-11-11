import type { Categoria } from "@/tipos/categoria";
import { consultarApi, ErrorHttp, type RespuestaLista } from "./api";

import {
  guardarCategoriasEnCache,
  leerCategoriasDeCache,
} from "@/servicios/cache-catalogo";

export async function obtenerCategorias(): Promise<
  RespuestaLista<Categoria> & { desdeCache: boolean }
> {
  try {
    const respuesta = await consultarApi<RespuestaLista<Categoria>>(
      "/categorias?pagina=1&porPagina=100",
    );

    if (!Array.isArray(respuesta.datos)) {
      throw new Error("La API devolvió categorías inesperadas.");
    }

    try {
      await guardarCategoriasEnCache(respuesta);
    } catch {
      console.warn("No se pudieron guardar las categorías offline.");
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

    const cache = await leerCategoriasDeCache();

    if (cache) {
      return { ...cache, desdeCache: true };
    }

    throw error;
  }
}
