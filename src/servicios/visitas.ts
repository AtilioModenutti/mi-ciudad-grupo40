import { fetch as expoFetch } from "expo/fetch";
import { File } from "expo-file-system";
import * as Network from "expo-network";
import Storage from "expo-sqlite/kv-store";

import { solicitarApiConSesion, type RespuestaLista, type RespuestaUno } from "@/servicios/api";
import type { OrigenVisita, Visita } from "@/tipos/visita";

// Cada usuario guarda su propia cola de visitas, incluso sin internet.
const CLAVE_VISITAS = "mi-ciudad-visitas-v2:";
const PAGINA_TAMANIO = 100;

// Evita que la pantalla y el sincronizador global envíen la misma visita a la vez.
const sincronizaciones = new Map<string, Promise<ResultadoSincronizacion>>();

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
  return error instanceof Error ? error.message : "No se pudo completar la sincronización.";
}

function esFotoLocal(uri: string | null): boolean {
  return Boolean(uri && (uri.startsWith("file:") || uri.startsWith("content:")));
}

function ordenar(visitas: Visita[]): Visita[] {
  return [...visitas].sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
}

export async function obtenerVisitas(usuarioId: string): Promise<Visita[]> {
  const contenido = await Storage.getItem(clave(usuarioId));
  if (!contenido) return [];
  const datos: unknown = JSON.parse(contenido);
  if (!Array.isArray(datos)) throw new Error("Las visitas guardadas no son válidas.");
  return ordenar((datos as Visita[]).filter((visita) => visita.usuarioId === usuarioId));
}

async function guardarVisitas(usuarioId: string, visitas: Visita[]): Promise<void> {
  await Storage.setItem(clave(usuarioId), JSON.stringify(ordenar(visitas)));
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
  const anteriores = await obtenerVisitas(usuarioId);
  await guardarVisitas(usuarioId, [visita, ...anteriores]);
  return visita;
}

export async function agregarFotoLocal(
  usuarioId: string,
  visitaId: string,
  fotoUri: string,
): Promise<void> {
  const visitas = await obtenerVisitas(usuarioId);
  if (!visitas.some((visita) => visita.id === visitaId)) {
    throw new Error("La visita ya no está disponible en esta cuenta.");
  }
  await guardarVisitas(
    usuarioId,
    visitas.map((visita) =>
      visita.id === visitaId
        ? { ...visita, fotoUri, fotoLocalUri: fotoUri, sincronizada: false }
        : visita,
    ),
  );
}

async function subirFoto(fotoUri: string, token: string): Promise<string> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");

  // Expo SDK 57 requiere un File real, no un objeto { uri, name, type }.
  // El archivo ya está guardado en la carpeta privada al tomar la fotografía.
  const archivo = new File(fotoUri);
  if (!archivo.exists) throw new Error("La fotografía ya no existe en este dispositivo.");
  const formulario = new FormData();
  formulario.append("archivo", archivo);

  const respuesta = await expoFetch(`${base}/archivos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });
  if (!respuesta.ok) {
    throw new Error(`La API no pudo recibir la fotografía (${respuesta.status}).`);
  }
  const datos = (await respuesta.json()) as RespuestaArchivo;
  if (!datos.datos?.url) throw new Error("La API no devolvió la URL de la foto.");
  return datos.datos.url;
}

/** Enviar las visitas locales no sincronizadas; conservar las fallidas en la cola. */
async function enviarPendientes(usuarioId: string, token: string): Promise<string | null> {
  let primerError: string | null = null;
  const pendientes = (await obtenerVisitas(usuarioId)).filter((visita) => !visita.sincronizada);

  for (const visita of pendientes) {
    try {
      // La API admite reintentos con el mismo ID sin duplicar la visita.
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

      // Releer para no pisar una foto agregada mientras se enviaba la visita.
      const actuales = await obtenerVisitas(usuarioId);
      await guardarVisitas(
        usuarioId,
        actuales.map((actual) =>
          actual.id === visita.id && actual.fotoUri === visita.fotoUri
            ? { ...actual, fotoUri: fotoRemota, sincronizada: true }
            : actual,
        ),
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

/** Sincroniza en dos direcciones: sube pendientes y descarga las visitas de la cuenta. */
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
      const actuales = await obtenerVisitas(usuarioId);
      const combinado = new Map(actuales.map((visita) => [visita.id, visita]));

      for (const remota of remotas) {
        if (remota.usuarioId !== usuarioId) continue;
        const local = combinado.get(remota.id);
        if (local && !local.sincronizada) continue; // Nunca perder una edición offline.
        combinado.set(remota.id, {
          ...remota,
          sincronizada: true,
          fotoLocalUri: local?.fotoLocalUri ?? null,
        });
      }
      await guardarVisitas(usuarioId, [...combinado.values()]);
    } catch (fallo) {
      error ??= mensajeError(fallo);
    }
    return { visitas: await obtenerVisitas(usuarioId), error };
  })();

  sincronizaciones.set(usuarioId, tarea);
  const liberar = () => {
    if (sincronizaciones.get(usuarioId) === tarea) sincronizaciones.delete(usuarioId);
  };
  void tarea.then(liberar, liberar);
  return tarea;
}
