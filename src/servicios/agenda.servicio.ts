import Storage from "expo-sqlite/kv-store";
import {
  consultarApi,
  ErrorHttp,
  solicitarApiConSesion,
  type RespuestaLista,
  type RespuestaUno,
} from "@/servicios/api";
import type { Evento } from "@/tipos/agenda";

const CLAVE_EVENTOS = "mi-ciudad-agenda-eventos-v2";
const PREFIJO_GUARDADOS = "mi-ciudad-agenda-guardados-v2:";

function ordenar(eventos: Evento[]): Evento[] {
  return [...eventos].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  );
}

async function leerEventosCache(): Promise<Evento[] | null> {
  try {
    const texto = await Storage.getItem(CLAVE_EVENTOS);
    if (!texto) return null;
    const datos: unknown = JSON.parse(texto);
    return Array.isArray(datos) ? (datos as Evento[]) : null;
  } catch {
    return null;
  }
}

function claveUsuario(usuarioId: string): string {
  return `${PREFIJO_GUARDADOS}${usuarioId}`;
}

type CacheGuardados = { ids: string[]; eventos: Evento[] };

async function leerGuardados(usuarioId: string): Promise<CacheGuardados | null> {
  try {
    const texto = await Storage.getItem(claveUsuario(usuarioId));
    if (!texto) return null;
    const datos: unknown = JSON.parse(texto);
    if (!datos || typeof datos !== "object") return null;
    const cache = datos as CacheGuardados;
    if (!Array.isArray(cache.ids) || !Array.isArray(cache.eventos)) return null;
    return cache;
  } catch {
    return null;
  }
}

async function guardarGuardados(usuarioId: string, cache: CacheGuardados): Promise<void> {
  try {
    await Storage.setItem(claveUsuario(usuarioId), JSON.stringify(cache));
  } catch {
    console.warn("No se pudo guardar la copia local de eventos guardados.");
  }
}

export const AgendaServicio = {
  async obtenerEventos(): Promise<{ eventos: Evento[]; desdeCache: boolean }> {
    try {
      let pagina = 1;
      const porPagina = 100;
      const todos: Evento[] = [];
      let total = 0;

      do {
        const respuesta = await consultarApi<RespuestaLista<Evento>>(
          `/eventos?pagina=${pagina}&porPagina=${porPagina}`,
        );
        if (!Array.isArray(respuesta.datos) || typeof respuesta.meta?.total !== "number") {
          throw new Error("La API devolvió una agenda no válida.");
        }
        todos.push(...respuesta.datos);
        total = respuesta.meta.total;
        if (respuesta.datos.length === 0) break;
        pagina += 1;
      } while (todos.length < total);

      const unicos = new Map<string, Evento>();
      for (const evento of todos) unicos.set(evento.id, evento);
      const eventos = ordenar([...unicos.values()]);
      try {
        await Storage.setItem(CLAVE_EVENTOS, JSON.stringify(eventos));
      } catch {
        console.warn("No se pudo almacenar la agenda offline.");
      }
      return { eventos, desdeCache: false };
    } catch (error) {
      if (error instanceof ErrorHttp && error.estado >= 400 && error.estado < 500) {
        throw error;
      }
      const guardados = await leerEventosCache();
      if (guardados !== null) return { eventos: ordenar(guardados), desdeCache: true };
      throw error;
    }
  },

  async obtenerEventoPorId(id: string): Promise<Evento | null> {
    try {
      const respuesta = await consultarApi<RespuestaUno<Evento>>(
        `/eventos/${encodeURIComponent(id)}`,
      );
      return respuesta.datos;
    } catch (error) {
      if (error instanceof ErrorHttp && error.estado === 404) return null;
      if (error instanceof ErrorHttp && error.estado >= 400 && error.estado < 500) {
        throw error;
      }
      const cache = await leerEventosCache();
      if (cache) return cache.find((evento) => evento.id === id) ?? null;
      throw error;
    }
  },

  async obtenerEventosGuardados(
    token: string,
    usuarioId: string,
  ): Promise<{ ids: string[]; eventos: Evento[]; soloLectura: boolean }> {
    try {
      let pagina = 1;
      const porPagina = 100;
      let total = 0;
      const todos: Evento[] = [];

      do {
        const respuesta = await solicitarApiConSesion<RespuestaLista<Evento>>(
          `/yo/eventos-guardados?pagina=${pagina}&porPagina=${porPagina}`,
          token,
        );
        if (!respuesta || !Array.isArray(respuesta.datos) || typeof respuesta.meta?.total !== "number") {
          throw new Error("La API devolvió eventos guardados no válidos.");
        }
        todos.push(...respuesta.datos);
        total = respuesta.meta.total;
        if (respuesta.datos.length === 0) break;
        pagina += 1;
      } while (todos.length < total);

      const ids = [...new Set(todos.map((evento) => evento.id))];
      await guardarGuardados(usuarioId, { ids, eventos: todos });
      return { ids, eventos: todos, soloLectura: false };
    } catch (error) {
      if (error instanceof ErrorHttp && error.estado >= 400 && error.estado < 500) {
        throw error;
      }
      const cache = await leerGuardados(usuarioId);
      if (cache !== null) return { ...cache, soloLectura: true };
      throw error;
    }
  },

  async guardarEvento(eventoId: string, token: string, usuarioId: string): Promise<void> {
    const respuesta = await solicitarApiConSesion<RespuestaUno<Evento>>(
      `/yo/eventos-guardados/${encodeURIComponent(eventoId)}`,
      token,
      "PUT",
    );
    const anterior = (await leerGuardados(usuarioId)) ?? { ids: [], eventos: [] };
    await guardarGuardados(usuarioId, {
      ids: [...new Set([...anterior.ids, eventoId])],
      eventos: respuesta?.datos
        ? [...anterior.eventos.filter((evento) => evento.id !== eventoId), respuesta.datos]
        : anterior.eventos,
    });
  },

  async quitarEventoGuardado(eventoId: string, token: string, usuarioId: string): Promise<void> {
    await solicitarApiConSesion<never>(
      `/yo/eventos-guardados/${encodeURIComponent(eventoId)}`,
      token,
      "DELETE",
    );
    const anterior = (await leerGuardados(usuarioId)) ?? { ids: [], eventos: [] };
    await guardarGuardados(usuarioId, {
      ids: anterior.ids.filter((id) => id !== eventoId),
      eventos: anterior.eventos.filter((evento) => evento.id !== eventoId),
    });
  },
};
