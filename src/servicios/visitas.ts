import { File } from "expo-file-system";
import * as Network from "expo-network";
import * as SQLite from "expo-sqlite";
import Storage from "expo-sqlite/kv-store";
import { fetch as expoFetch } from "expo/fetch";

import {
  solicitarApiConSesion,
  type RespuestaLista,
  type RespuestaUno,
} from "@/servicios/api";
import type { OrigenVisita, Visita } from "@/tipos/visita";

const CLAVE_VISITAS = "mi-ciudad-visitas-v2:";
const NOMBRE_BASE = "mi-colon-visitas.db";
const PAGINA_TAMANIO = 100;

const sincronizaciones = new Map<string, Promise<ResultadoSincronizacion>>();
const usuariosMigrados = new Set<string>();
let apertura: Promise<SQLite.SQLiteDatabase> | null = null;
let colaEscrituras: Promise<void> = Promise.resolve();

type FilaVisita = { contenido: string };
type FilaMigracion = { usuario_id: string };

type VisitaRemota = Omit<Visita, "fotoLocalUri">;

type RespuestaArchivo = { datos: { url: string }; meta: null };

export type ResultadoSincronizacion = {
  visitas: Visita[];
  error: string | null;
};

function clave(usuarioId: string): string {
  return `${CLAVE_VISITAS}${usuarioId}`;
}

function mensajeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la sincronización.";
}

function esFotoLocal(uri: string | null): boolean {
  return Boolean(
    uri && (uri.startsWith("file:") || uri.startsWith("content:")),
  );
}

function ordenar(visitas: Visita[]): Visita[] {
  return [...visitas].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime(),
  );
}

function abrirBase(): Promise<SQLite.SQLiteDatabase> {
  if (!apertura) {
    apertura = (async () => {
      const db = await SQLite.openDatabaseAsync(NOMBRE_BASE);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS visitas_locales (
          usuario_id TEXT NOT NULL,
          id TEXT NOT NULL,
          contenido TEXT NOT NULL,
          PRIMARY KEY (usuario_id, id)
        );
        CREATE TABLE IF NOT EXISTS migraciones_visitas (
          usuario_id TEXT PRIMARY KEY NOT NULL,
          migrado_en TEXT NOT NULL
        );
      `);
      return db;
    })().catch((error: unknown) => {
      apertura = null;
      throw error;
    });
  }
  return apertura;
}

function encolarEscritura<T>(trabajo: () => Promise<T>): Promise<T> {
  const siguiente = colaEscrituras.then(trabajo);
  colaEscrituras = siguiente.then(
    () => undefined,
    () => undefined,
  );
  return siguiente;
}

async function migrarSiHaceFalta(usuarioId: string): Promise<void> {
  if (usuariosMigrados.has(usuarioId)) return;

  await encolarEscritura(async () => {
    if (usuariosMigrados.has(usuarioId)) return;
    const db = await abrirBase();
    const migrada = await db.getFirstAsync<FilaMigracion>(
      "SELECT usuario_id FROM migraciones_visitas WHERE usuario_id = ?",
      usuarioId,
    );

    if (!migrada) {
      const texto = await Storage.getItem(clave(usuarioId));
      const datos: unknown = texto ? JSON.parse(texto) : [];
      if (!Array.isArray(datos)) {
        throw new Error(
          "El historial anterior de visitas no es válido. No se modificaron sus datos.",
        );
      }
      await db.withTransactionAsync(async () => {
        for (const dato of datos) {
          if (
            !dato ||
            typeof dato !== "object" ||
            typeof dato.id !== "string" ||
            typeof dato.usuarioId !== "string" ||
            typeof dato.fechaHora !== "string" ||
            typeof dato.lugarId !== "string"
          ) {
            throw new Error(
              "El historial anterior contiene una visita no válida.",
            );
          }
          if (dato.usuarioId !== usuarioId) continue;
          await db.runAsync(
            `INSERT OR IGNORE INTO visitas_locales (usuario_id, id, contenido)
             VALUES (?, ?, ?)`,
            usuarioId,
            dato.id,
            JSON.stringify(dato),
          );
        }
        await db.runAsync(
          "INSERT INTO migraciones_visitas (usuario_id, migrado_en) VALUES (?, ?)",
          usuarioId,
          new Date().toISOString(),
        );
      });
    }
    usuariosMigrados.add(usuarioId);
  });
}

async function guardarUnaVisita(
  db: SQLite.SQLiteDatabase,
  visita: Visita,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO visitas_locales (usuario_id, id, contenido) VALUES (?, ?, ?)
     ON CONFLICT(usuario_id, id) DO UPDATE SET contenido = excluded.contenido`,
    visita.usuarioId,
    visita.id,
    JSON.stringify(visita),
  );
}

export async function obtenerVisitas(usuarioId: string): Promise<Visita[]> {
  await migrarSiHaceFalta(usuarioId);
  await colaEscrituras;
  const db = await abrirBase();
  const filas = await db.getAllAsync<FilaVisita>(
    "SELECT contenido FROM visitas_locales WHERE usuario_id = ?",
    usuarioId,
  );
  return ordenar(
    filas
      .map((fila) => JSON.parse(fila.contenido) as Visita)
      .filter((visita) => visita.usuarioId === usuarioId),
  );
}

async function marcarComoSincronizada(
  usuarioId: string,
  visitaId: string,
  fotoOriginal: string | null,
  fotoRemota: string | null,
): Promise<void> {
  await encolarEscritura(async () => {
    const db = await abrirBase();
    const fila = await db.getFirstAsync<FilaVisita>(
      "SELECT contenido FROM visitas_locales WHERE usuario_id = ? AND id = ?",
      usuarioId,
      visitaId,
    );
    if (!fila) return;
    const actual = JSON.parse(fila.contenido) as Visita;
    if (actual.fotoUri !== fotoOriginal) return;
    await guardarUnaVisita(db, {
      ...actual,
      fotoUri: fotoRemota,
      sincronizada: true,
    });
  });
}

async function incorporarRemotas(
  usuarioId: string,
  remotas: VisitaRemota[],
): Promise<void> {
  await encolarEscritura(async () => {
    const db = await abrirBase();
    await db.withTransactionAsync(async () => {
      for (const remota of remotas) {
        if (remota.usuarioId !== usuarioId) continue;
        const fila = await db.getFirstAsync<FilaVisita>(
          "SELECT contenido FROM visitas_locales WHERE usuario_id = ? AND id = ?",
          usuarioId,
          remota.id,
        );
        const local = fila ? (JSON.parse(fila.contenido) as Visita) : null;
        if (local && !local.sincronizada) continue;
        await guardarUnaVisita(db, {
          ...remota,
          sincronizada: true,
          fotoLocalUri: local?.fotoLocalUri ?? null,
        });
      }
    });
  });
}

export async function registrarVisita(
  usuarioId: string,
  lugarId: string,
  origen: OrigenVisita,
  nota: string | null = null,
): Promise<Visita> {
  const visita: Visita = {
    id: `vis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    usuarioId,
    lugarId,
    fechaHora: new Date().toISOString(),
    origen,
    fotoUri: null,
    fotoLocalUri: null,
    nota,
    sincronizada: false,
  };
  await migrarSiHaceFalta(usuarioId);
  await encolarEscritura(async () => {
    const db = await abrirBase();
    await guardarUnaVisita(db, visita);
  });
  return visita;
}

export async function agregarFotoLocal(
  usuarioId: string,
  visitaId: string,
  fotoUri: string,
): Promise<void> {
  await migrarSiHaceFalta(usuarioId);
  await encolarEscritura(async () => {
    const db = await abrirBase();
    const fila = await db.getFirstAsync<FilaVisita>(
      "SELECT contenido FROM visitas_locales WHERE usuario_id = ? AND id = ?",
      usuarioId,
      visitaId,
    );
    if (!fila)
      throw new Error("La visita ya no está disponible en esta cuenta.");
    const visita = JSON.parse(fila.contenido) as Visita;
    await guardarUnaVisita(db, {
      ...visita,
      fotoUri,
      fotoLocalUri: fotoUri,
      sincronizada: false,
    });
  });
}

async function subirFoto(fotoUri: string, token: string): Promise<string> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");

  const archivo = new File(fotoUri);
  if (!archivo.exists)
    throw new Error("La fotografía ya no existe en este dispositivo.");
  const formulario = new FormData();
  formulario.append("archivo", archivo);

  const respuesta = await expoFetch(`${base}/archivos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });
  if (!respuesta.ok) {
    throw new Error(
      `La API no pudo recibir la fotografía (${respuesta.status}).`,
    );
  }
  const datos = (await respuesta.json()) as RespuestaArchivo;
  if (!datos.datos?.url)
    throw new Error("La API no devolvió la URL de la foto.");
  return datos.datos.url;
}

async function enviarPendientes(
  usuarioId: string,
  token: string,
): Promise<string | null> {
  let primerError: string | null = null;
  const pendientes = (await obtenerVisitas(usuarioId)).filter(
    (visita) => !visita.sincronizada,
  );

  for (const visita of pendientes) {
    try {
      await solicitarApiConSesion<RespuestaUno<VisitaRemota>>(
        "/yo/visitas",
        token,
        "POST",
        {
          id: visita.id,
          lugarId: visita.lugarId,
          fechaHora: visita.fechaHora,
          origen: visita.origen,
          fotoUri: null,
          nota: visita.nota,
          sincronizada: false,
        },
      );

      let fotoRemota = visita.fotoUri;
      if (esFotoLocal(fotoRemota)) {
        const url = await subirFoto(fotoRemota!, token);
        await solicitarApiConSesion<RespuestaUno<VisitaRemota>>(
          `/yo/visitas/${encodeURIComponent(visita.id)}`,
          token,
          "PATCH",
          { fotoUri: url },
        );
        fotoRemota = url;
      }

      await marcarComoSincronizada(
        usuarioId,
        visita.id,
        visita.fotoUri,
        fotoRemota,
      );
    } catch (error) {
      primerError ??= mensajeError(error);
    }
  }
  return primerError;
}

async function descargarVisitas(token: string): Promise<VisitaRemota[]> {
  const resultado: VisitaRemota[] = [];
  let pagina = 1;
  while (true) {
    const respuesta = await solicitarApiConSesion<RespuestaLista<VisitaRemota>>(
      `/yo/visitas?pagina=${pagina}&porPagina=${PAGINA_TAMANIO}`,
      token,
    );
    if (!respuesta || !Array.isArray(respuesta.datos)) {
      throw new Error("La API devolvió una lista de visitas no válida.");
    }
    resultado.push(...respuesta.datos);
    const total = respuesta.meta?.total;
    if (typeof total === "number") {
      if (resultado.length >= total || respuesta.datos.length === 0) break;
    } else if (respuesta.datos.length < PAGINA_TAMANIO) {
      break;
    }
    pagina++;
  }
  return resultado;
}

export function sincronizarVisitas(
  usuarioId: string,
  token: string,
): Promise<ResultadoSincronizacion> {
  const enCurso = sincronizaciones.get(usuarioId);
  if (enCurso) return enCurso;

  const tarea = (async (): Promise<ResultadoSincronizacion> => {
    const red = await Network.getNetworkStateAsync();
    if (red.isConnected !== true || red.isInternetReachable === false) {
      return { visitas: await obtenerVisitas(usuarioId), error: null };
    }

    let error = await enviarPendientes(usuarioId, token);
    try {
      const remotas = await descargarVisitas(token);
      await incorporarRemotas(usuarioId, remotas);
    } catch (fallo) {
      error ??= mensajeError(fallo);
    }
    return { visitas: await obtenerVisitas(usuarioId), error };
  })();

  sincronizaciones.set(usuarioId, tarea);
  const liberar = () => {
    if (sincronizaciones.get(usuarioId) === tarea)
      sincronizaciones.delete(usuarioId);
  };
  void tarea.then(liberar, liberar);
  return tarea;
}
