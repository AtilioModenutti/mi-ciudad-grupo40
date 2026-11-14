import * as SQLite from "expo-sqlite";
import Storage from "expo-sqlite/kv-store";

import type { RespuestaLista } from "@/servicios/api";
import type { Categoria } from "@/tipos/categoria";
import type { Lugar } from "@/tipos/lugar";

const NOMBRE_BASE = "mi-colon-catalogo.db";
const CLAVE_LUGARES_ANTERIOR = "mi-ciudad-cache-lugares-v1";
const CLAVE_CATEGORIAS_ANTERIOR = "mi-ciudad-cache-categorias-v1";

type TipoCatalogo = "lugares" | "categorias";
type ElementoCatalogo = { id: string };
type FilaDato = { contenido: string };
type FilaMeta = { meta_json: string };

type RegistroCacheAnterior<T> = {
  guardadoEn: string;
  respuesta: RespuestaLista<T>;
};

let apertura: Promise<SQLite.SQLiteDatabase> | null = null;
let colaEscrituras: Promise<void> = Promise.resolve();

function tablaDe(tipo: TipoCatalogo): string {
  return tipo === "lugares" ? "cache_lugares" : "cache_categorias";
}

function esRespuestaValida<T extends ElementoCatalogo>(
  valor: unknown,
): valor is RespuestaLista<T> {
  if (typeof valor !== "object" || valor === null) return false;

  const respuesta = valor as Partial<RespuestaLista<T>>;
  return (
    Array.isArray(respuesta.datos) &&
    respuesta.datos.every(
      (dato) => typeof dato?.id === "string" && dato.id.length > 0,
    ) &&
    typeof respuesta.meta?.total === "number" &&
    typeof respuesta.meta?.pagina === "number" &&
    typeof respuesta.meta?.porPagina === "number"
  );
}

function abrirBase(): Promise<SQLite.SQLiteDatabase> {
  if (!apertura) {
    apertura = (async () => {
      const db = await SQLite.openDatabaseAsync(NOMBRE_BASE);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS cache_lugares (
          id TEXT PRIMARY KEY NOT NULL,
          posicion INTEGER NOT NULL,
          contenido TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cache_categorias (
          id TEXT PRIMARY KEY NOT NULL,
          posicion INTEGER NOT NULL,
          contenido TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cache_catalogo_meta (
          tipo TEXT PRIMARY KEY NOT NULL,
          meta_json TEXT NOT NULL,
          guardado_en TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return apertura;
}

function encolarEscritura(trabajo: () => Promise<void>): Promise<void> {
  const siguiente = colaEscrituras.then(trabajo);
  colaEscrituras = siguiente.catch((error: unknown) => {
    console.warn("Falló una escritura del catálogo SQLite:", error);
  });
  return siguiente;
}

async function guardar<T extends ElementoCatalogo>(
  tipo: TipoCatalogo,
  respuesta: RespuestaLista<T>,
): Promise<void> {
  if (!esRespuestaValida<T>(respuesta)) {
    throw new Error("No se puede guardar un catálogo con datos inválidos.");
  }

  await encolarEscritura(async () => {
    const db = await abrirBase();
    const tabla = tablaDe(tipo);

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM ${tabla}`);

      for (const [posicion, dato] of respuesta.datos.entries()) {
        await db.runAsync(
          `INSERT INTO ${tabla} (id, posicion, contenido) VALUES (?, ?, ?)`,
          dato.id,
          posicion,
          JSON.stringify(dato),
        );
      }

      await db.runAsync(
        `INSERT INTO cache_catalogo_meta (tipo, meta_json, guardado_en)
         VALUES (?, ?, ?)
         ON CONFLICT(tipo) DO UPDATE SET
           meta_json = excluded.meta_json,
           guardado_en = excluded.guardado_en`,
        tipo,
        JSON.stringify(respuesta.meta),
        new Date().toISOString(),
      );
    });
  });
}

async function leerSqlite<T extends ElementoCatalogo>(
  tipo: TipoCatalogo,
): Promise<RespuestaLista<T> | null> {
  await colaEscrituras;
  const db = await abrirBase();
  const meta = await db.getFirstAsync<FilaMeta>(
    "SELECT meta_json FROM cache_catalogo_meta WHERE tipo = ?",
    tipo,
  );
  if (!meta) return null;

  const filas = await db.getAllAsync<FilaDato>(
    `SELECT contenido FROM ${tablaDe(tipo)} ORDER BY posicion ASC`,
  );
  const respuesta: unknown = {
    datos: filas.map((fila) => JSON.parse(fila.contenido) as T),
    meta: JSON.parse(meta.meta_json) as RespuestaLista<T>["meta"],
  };

  if (!esRespuestaValida<T>(respuesta)) {
    throw new Error("El catálogo almacenado en SQLite no es válido.");
  }
  return respuesta;
}

async function leerCacheAnterior<T extends ElementoCatalogo>(
  tipo: TipoCatalogo,
): Promise<RespuestaLista<T> | null> {
  const clave =
    tipo === "lugares" ? CLAVE_LUGARES_ANTERIOR : CLAVE_CATEGORIAS_ANTERIOR;
  const texto = await Storage.getItem(clave);
  if (!texto) return null;

  try {
    const registro = JSON.parse(texto) as RegistroCacheAnterior<T>;
    return esRespuestaValida<T>(registro?.respuesta)
      ? registro.respuesta
      : null;
  } catch (error) {
    console.warn(`No se pudo leer el caché anterior de ${tipo}:`, error);
    return null;
  }
}

async function leer<T extends ElementoCatalogo>(
  tipo: TipoCatalogo,
): Promise<RespuestaLista<T> | null> {
  try {
    const cacheSqlite = await leerSqlite<T>(tipo);
    if (cacheSqlite) return cacheSqlite;
  } catch (error) {
    console.warn(`No se pudo leer el catálogo SQLite de ${tipo}:`, error);
  }

  const anterior = await leerCacheAnterior<T>(tipo);
  if (anterior) {
    try {
      await guardar(tipo, anterior);
    } catch (error) {
      console.warn(`No se pudo migrar el caché de ${tipo} a SQLite:`, error);
    }
  }
  return anterior;
}

export async function guardarLugaresEnCache(
  respuesta: RespuestaLista<Lugar>,
): Promise<void> {
  await guardar("lugares", respuesta);
}

export async function leerLugaresDeCache(): Promise<RespuestaLista<Lugar> | null> {
  return leer<Lugar>("lugares");
}

export async function guardarCategoriasEnCache(
  respuesta: RespuestaLista<Categoria>,
): Promise<void> {
  await guardar("categorias", respuesta);
}

export async function leerCategoriasDeCache(): Promise<RespuestaLista<Categoria> | null> {
  return leer<Categoria>("categorias");
}
