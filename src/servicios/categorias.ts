import type { Categoria } from "../tipos/categoria";

import { consultarApi, type RespuestaLista } from "./clienteApi";

export async function obtenerCategorias(): Promise<RespuestaLista<Categoria>> {
  const respuesta = await consultarApi<RespuestaLista<Categoria>>(
    "/categorias?porPagina=100",
  );

  if (!Array.isArray(respuesta.datos)) {
    throw new Error("La API devolvió una lista de categorías inválida.");
  }

  return respuesta;
}
