import Storage from "expo-sqlite/kv-store";

import type { RespuestaLista } from "@/servicios/api";
import type { Categoria } from "@/tipos/categoria";
import type { Lugar } from "@/tipos/lugar";

const CLAVE_LUGARES = "mi-ciudad-cache-lugares-v1";
const CLAVE_CATEGORIAS = "mi-ciudad-cache-categorias-v1";

type RegistroCache<T> = {
  guardadoEn: string;
  respuesta: RespuestaLista<T>;
};

async function guardar<T>(
  clave: string,
  respuesta: RespuestaLista<T>,
): Promise<void> {
  const registro: RegistroCache<T> = {
    guardadoEn: new Date().toISOString(),
    respuesta,
  };

  await Storage.setItem(clave, JSON.stringify(registro));
}

async function leer<T>(clave: string): Promise<RespuestaLista<T> | null> {
  const texto = await Storage.getItem(clave);

  if (!texto) {
    return null;
  }

  try {
    const registro = JSON.parse(texto) as RegistroCache<T>;
    const respuesta = registro?.respuesta;

    if (
      !respuesta ||
      !Array.isArray(respuesta.datos) ||
      !respuesta.meta ||
      typeof respuesta.meta.total !== "number"
    ) {
      return null;
    }

    return respuesta;
  } catch {
    return null;
  }
}

export async function guardarLugaresEnCache(
  respuesta: RespuestaLista<Lugar>,
): Promise<void> {
  await guardar(CLAVE_LUGARES, respuesta);
}

export async function leerLugaresDeCache(): Promise<RespuestaLista<Lugar> | null> {
  return await leer<Lugar>(CLAVE_LUGARES);
}

export async function guardarCategoriasEnCache(
  respuesta: RespuestaLista<Categoria>,
): Promise<void> {
  await guardar(CLAVE_CATEGORIAS, respuesta);
}

export async function leerCategoriasDeCache(): Promise<RespuestaLista<Categoria> | null> {
  return await leer<Categoria>(CLAVE_CATEGORIAS);
}
